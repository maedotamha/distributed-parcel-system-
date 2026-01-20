
import { Request, Response } from 'express';
import prisma from '../config/database';
import { paymentProducer } from '../events/producers/payment.producer';
import { PricingService } from '../services/pricing.service';

/**
 * Estimate delivery pricing
 */
export const estimatePricing = async (req: Request, res: Response): Promise<void> => {
    try {
        const { priority, weightKg, pickupSubcity, deliverySubcity } = req.body;

        if (!priority || weightKg === undefined || !pickupSubcity || !deliverySubcity) {
            res.status(400).json({ message: 'Missing required fields for pricing estimation' });
            return;
        }

        const estimate = PricingService.calculateFees({
            priority,
            weightKg: parseFloat(weightKg),
            pickupSubcity,
            deliverySubcity
        });

        res.json(estimate);
    } catch (error) {
        console.error('Pricing estimation error:', error);
        res.status(500).json({ message: 'Server error during pricing estimation' });
    }
};

export const processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, amount } = req.body;
        // In a real app, we would verify the user from the token matches the payment logic

        const payment = await prisma.payment.findFirst({ where: { order_id: orderId } });

        if (!payment) {
            res.status(404).json({ message: 'Payment record not found' });
            return;
        }

        if (payment.status === 'CAPTURED' || payment.status === 'SETTLED') {
            res.status(400).json({ message: 'Payment already completed' });
            return;
        }

        // Mock successful transaction
        const transactionId = `TXN-${Date.now()}`;

        const updatedPayment = await prisma.payment.update({
            where: { payment_id: payment.payment_id },
            data: {
                status: 'CAPTURED',
                gateway_transaction_id: transactionId,
                captured_amount: payment.amount,
                captured_at: new Date()
            }
        });

        // Publish Payment Completed Event using the producer
        await paymentProducer.publishPaymentCompleted(updatedPayment);

        res.json(updatedPayment);

    } catch (error) {
        console.error('Process payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.params;
        const payment = await prisma.payment.findFirst({ where: { order_id: orderId } });

        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }

        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get payment by order ID - used by frontend to check payment status
 * If payment doesn't exist, attempt to create it (handles race conditions with RabbitMQ)
 */
export const getPaymentByOrderId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.params;
        console.log(`📋 Looking up payment for order: ${orderId}`);

        // First, try to find existing payment
        let payment = await prisma.payment.findFirst({
            where: { order_id: orderId }
        });

        if (payment) {
            console.log(`✅ Found existing payment: ${payment.payment_id}`);
            res.json(payment);
            return;
        }

        // Payment not found - try to get customer ID from request headers or create with placeholder
        console.log(`⚠️ No payment found for order ${orderId}, attempting to create...`);

        // Get user data from the request (passed by API Gateway)
        const userData = req.headers['x-user-data'];
        let customerId: string | null = null;

        if (userData) {
            try {
                const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
                customerId = user.userId;
                console.log(`👤 Got customer ID from request headers: ${customerId}`);
            } catch (e) {
                console.error('Failed to parse user data from headers:', e);
            }
        }

        // If we still don't have customer ID, try getting it from Authorization header
        if (!customerId) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const jwt = require('jsonwebtoken');
                    const token = authHeader.split(' ')[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123') as any;
                    customerId = decoded.userId;
                    console.log(`👤 Got customer ID from JWT: ${customerId}`);
                } catch (e) {
                    console.error('Failed to decode JWT:', e);
                }
            }
        }

        if (!customerId) {
            console.error(`❌ Cannot create payment: no customer ID available`);
            res.status(404).json({
                message: 'Payment not found for this order and unable to create one. Please try again shortly.',
                hint: 'The payment may still be processing. Wait a moment and refresh.'
            });
            return;
        }

        // Create the payment record
        try {
            payment = await prisma.payment.create({
                data: {
                    order_id: orderId,
                    customer_id: customerId,
                    amount: 0, // will be set during payment initiation
                    payment_method: 'MOBILE_MONEY',
                    status: 'PENDING',
                    currency_code: 'ETB'
                }
            });

            console.log(`💳 Created fallback payment record ${payment.payment_id} for order ${orderId}`);
            res.json(payment);
        } catch (createError: any) {
            // Handle race condition where payment was created between our check and create
            if (createError.code === 'P2002') {
                payment = await prisma.payment.findFirst({
                    where: { order_id: orderId }
                });
                if (payment) {
                    console.log(`✅ Payment was created concurrently: ${payment.payment_id}`);
                    res.json(payment);
                    return;
                }
            }
            throw createError;
        }
    } catch (error) {
        console.error('Get payment by order ID error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

//C:\Users\HP\Documents\5(1ST SEMESTER)\ds\u\distributed-parcel-delivery-system\distributed-parcel-delivery-system\order-service\src\events\consumers\payment.consumer.ts
import { rabbitMQ } from '../../config/rabbitmq';
import prisma from '../../config/database';
import { orderProducer } from '../producers/order.producer';
import { DispatchService } from '../../services/dispatch.service';

export const startPaymentConsumer = async (): Promise<void> => {
    try {
        // Subscribe to payment.completed events
        await rabbitMQ.subscribe(
            'payment.completed',           // routingKey
            'order_service_payment_queue', // queueName
            async (data: any) => {
                console.log('📥 Received payment.completed event:', data);

                try {
                    const { orderId, paymentId, transactionId } = data;

                    if (!orderId) {
                        console.error('Missing orderId in payment.completed event');
                        return;
                    }

                    // Find the order
                    const order = await (prisma as any).order.findUnique({
                        where: { orderId }
                    });

                    if (!order) {
                        console.error(`Order ${orderId} not found`);
                        return;
                    }

                    // Update order status to CONFIRMED if payment is completed
                    const oldStatus = order.status;
                    const updatedOrder = await (prisma as any).order.update({
                        where: { orderId },
                        data: {
                            status: 'CONFIRMED' as any,
                            updatedAt: new Date()
                        }
                    });

                    // Create tracking event
                    await (prisma as any).trackingEvent.create({
                        data: {
                            orderId,
                            eventType: 'ORDER_CONFIRMED' as any,
                            eventTimestamp: new Date(),
                            notes: `Payment confirmed. Transaction ID: ${transactionId}`
                        }
                    });

                    // Publish order status changed event
                    await orderProducer.publishOrderStatusChanged({
                        orderId: updatedOrder.orderId,
                        orderNumber: updatedOrder.orderNumber,
                        customerId: updatedOrder.customerId,
                        oldStatus,
                        newStatus: updatedOrder.status,
                        courierId: undefined
                    });

                    console.log(`✅ Order ${updatedOrder.orderNumber} confirmed after payment`);

                    // New: Trigger auto-assignment
                    setTimeout(async () => {
                        try {
                            await DispatchService.autoAssignOrder(orderId);
                        } catch (err) {
                            console.error('Failed to trigger auto-assignment:', err);
                        }
                    }, 2000); // Small delay to ensure DB consistency
                } catch (error) {
                    console.error('Error processing payment.completed event:', error);
                }
            }
        );

        // Subscribe to payment.failed events
        await rabbitMQ.subscribe(
            'payment.failed',                     // routingKey
            'order_service_payment_failed_queue', // queueName
            async (data: any) => {
                console.log('📥 Received payment.failed event:', data);

                try {
                    const { orderId, reason } = data;

                    if (!orderId) {
                        console.error('Missing orderId in payment.failed event');
                        return;
                    }

                    // Find the order
                    const order = await (prisma as any).order.findUnique({
                        where: { orderId }
                    });

                    if (!order) {
                        console.error(`Order ${orderId} not found`);
                        return;
                    }

                    // Update order status to FAILED
                    const oldStatus = order.status;
                    const updatedOrder = await (prisma as any).order.update({
                        where: { orderId },
                        data: {
                            status: 'FAILED' as any,
                            updatedAt: new Date()
                        }
                    });

                    // Create tracking event
                    await (prisma as any).trackingEvent.create({
                        data: {
                            orderId,
                            eventType: 'FAILED' as any,
                            eventTimestamp: new Date(),
                            notes: `Payment failed: ${reason || 'Unknown reason'}`
                        }
                    });

                    // Publish order status changed event
                    await orderProducer.publishOrderStatusChanged({
                        orderId: updatedOrder.orderId,
                        orderNumber: updatedOrder.orderNumber,
                        customerId: updatedOrder.customerId,
                        oldStatus,
                        newStatus: updatedOrder.status,
                        courierId: undefined
                    });

                    console.log(`❌ Order ${updatedOrder.orderNumber} marked as failed due to payment failure`);
                } catch (error) {
                    console.error('Error processing payment.failed event:', error);
                }
            }
        );

        console.log('✅ Payment consumers initialized');
    } catch (error) {
        console.error('Failed to start payment consumer:', error);
    }
};

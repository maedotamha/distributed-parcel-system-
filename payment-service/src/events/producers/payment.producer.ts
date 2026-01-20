import { rabbitMQ } from '../../config/rabbitmq';

export class PaymentProducer {
    /**
     * Publish payment.completed event when payment is successfully processed
     */
    async publishPaymentCompleted(paymentData: any): Promise<void> {
        try {
            await rabbitMQ.publish('payment.completed', {
                paymentId: paymentData.payment_id,
                orderId: paymentData.order_id,
                customerId: paymentData.customer_id,
                amount: paymentData.amount,
                transactionId: paymentData.gateway_transaction_id,
                status: paymentData.status,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ Published payment.completed event for order ${paymentData.order_id}`);
        } catch (error) {
            console.error('Error publishing payment.completed event:', error);
        }
    }

    /**
     * Publish payment.failed event when payment fails
     */
    async publishPaymentFailed(paymentData: any, reason?: string): Promise<void> {
        try {
            await rabbitMQ.publish('payment.failed', {
                paymentId: paymentData.payment_id,
                orderId: paymentData.order_id,
                customerId: paymentData.customer_id,
                amount: paymentData.amount,
                reason: reason || 'Payment processing failed',
                status: paymentData.status,
                timestamp: new Date().toISOString()
            });
            console.log(`❌ Published payment.failed event for order ${paymentData.order_id}`);
        } catch (error) {
            console.error('Error publishing payment.failed event:', error);
        }
    }

    /**
     * Publish payment.authorized event when payment is authorized but not yet captured
     */
    async publishPaymentAuthorized(paymentData: any): Promise<void> {
        try {
            await rabbitMQ.publish('payment.authorized', {
                paymentId: paymentData.payment_id,
                orderId: paymentData.order_id,
                customerId: paymentData.customer_id,
                amount: paymentData.amount,
                transactionId: paymentData.gateway_transaction_id,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ Published payment.authorized event for order ${paymentData.order_id}`);
        } catch (error) {
            console.error('Error publishing payment.authorized event:', error);
        }
    }
}

export const paymentProducer = new PaymentProducer();

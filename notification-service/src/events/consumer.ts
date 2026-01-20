
import { rabbitMQ } from '../config/rabbitmq';
import { sendEmail, sendSMS } from '../services/email.service';

export const startNotificationConsumer = async () => {
    
    // 1. Listen for Order Created (Order Service)
    await rabbitMQ.subscribe('order.created', 'notification_service_order_created', async (data: any) => {
        console.log(`\n🔔 Received Event: order.created`);
        // Mock sending confirmation email
        sendEmail(
            `customer_${data.customerId}@test.com`,
            'Order Confirmation',
            `Your order ${data.orderNumber} has been created successfully! Order ID: ${data.orderId}`
        );
    });

    // 2. Listen for Order Status Changed (Order Service)
    await rabbitMQ.subscribe('order.status.changed', 'notification_service_order_status_changed', async (data: any) => {
        console.log(`\n🔔 Received Event: order.status.changed`);
        sendEmail(
            `customer_${data.customerId}@test.com`,
            'Order Status Update',
            `Your order ${data.orderNumber} status changed from ${data.oldStatus} to ${data.newStatus}`
        );
    });

    // 3. Listen for Order Completed (Order Service)
    await rabbitMQ.subscribe('order.completed', 'notification_service_order_completed', async (data: any) => {
        console.log(`\n🔔 Received Event: order.completed`);
        sendEmail(
            `customer_${data.customerId}@test.com`,
            'Order Delivered',
            `Your order ${data.orderNumber} has been delivered successfully!`
        );
        sendSMS(
            '+251911...',
            `Your order ${data.orderNumber} has been delivered!`
        );
    });

    // 4. Listen for Payment Completed (Payment Service)
    await rabbitMQ.subscribe('payment.completed', 'notification_service_payment_completed', async (data: any) => {
        console.log(`\n🔔 Received Event: payment.completed`);
        sendEmail(
            `customer_${data.customerId}@test.com`,
            'Payment Receipt',
            `Payment of ${data.amount} ETB received! Transaction ID: ${data.transactionId}`
        );
        sendSMS(
            '+251911...',
            `Payment received for Order ${data.orderId}. Your order is being processed!`
        );
    });

    // 5. Listen for Payment Failed (Payment Service)
    await rabbitMQ.subscribe('payment.failed', 'notification_service_payment_failed', async (data: any) => {
        console.log(`\n🔔 Received Event: payment.failed`);
        sendEmail(
            `customer_${data.customerId}@test.com`,
            'Payment Failed',
            `Payment for order ${data.orderId} failed. Reason: ${data.reason || 'Unknown'}`
        );
    });

    console.log('👂 Notification Service listening for events...');
};

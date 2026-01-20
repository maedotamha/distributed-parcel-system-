//order-service\src\events\producers\order.producer.ts
import { rabbitMQ } from '../../config/rabbitmq';

export class OrderProducer {
    async publishOrderCreated(orderData: any): Promise<void> {
        try {
            await rabbitMQ.publish('order.created', {
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber,
                customerId: orderData.customerId,
                status: orderData.status,
                priority: orderData.priority,
                estimatedDeliveryTime: orderData.estimatedDeliveryTime,
                createdAt: orderData.createdAt,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ Published order.created event for order ${orderData.orderNumber}`);
        } catch (error) {
            console.error('Error publishing order.created event:', error);
        }
    }

    async publishOrderUpdated(orderData: any): Promise<void> {
        try {
            await rabbitMQ.publish('order.updated', {
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber,
                customerId: orderData.customerId,
                status: orderData.status,
                updatedAt: orderData.updatedAt,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ Published order.updated event for order ${orderData.orderNumber}`);
        } catch (error) {
            console.error('Error publishing order.updated event:', error);
        }
    }

    async publishOrderStatusChanged(orderData: any): Promise<void> {
        try {
            await rabbitMQ.publish('order.status.changed', {
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber,
                customerId: orderData.customerId,
                oldStatus: orderData.oldStatus,
                newStatus: orderData.newStatus,
                courierId: orderData.courierId,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ Published order.status.changed event for order ${orderData.orderNumber}`);
        } catch (error) {
            console.error('Error publishing order.status.changed event:', error);
        }
    }

    async publishOrderAssigned(orderData: any): Promise<void> {
        try {
            await rabbitMQ.publish('order.assigned', {
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber,
                customerId: orderData.customerId,
                courierId: orderData.courierId,
                vehicleId: orderData.vehicleId,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ Published order.assigned event for order ${orderData.orderNumber}`);
        } catch (error) {
            console.error('Error publishing order.assigned event:', error);
        }
    }

    async publishOrderCompleted(orderData: any): Promise<void> {
        try {
            await rabbitMQ.publish('order.completed', {
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber,
                customerId: orderData.customerId,
                courierId: orderData.courierId,
                actualDeliveryTime: orderData.actualDeliveryTime,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ Published order.completed event for order ${orderData.orderNumber}`);
        } catch (error) {
            console.error('Error publishing order.completed event:', error);
        }
    }
}

export const orderProducer = new OrderProducer();

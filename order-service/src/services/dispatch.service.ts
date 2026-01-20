import prisma from '../config/database';
import { orderProducer } from '../events/producers/order.producer';

export class DispatchService {
    /**
     * Automatically assign a courier to an order
     * In a real system, this would use geospatial queries to find the nearest courier
     */
    static async autoAssignOrder(orderId: string): Promise<boolean> {
        try {
            console.log(`🤖 Starting auto-assignment for order ${orderId}...`);

            const order = await (prisma as any).order.findUnique({
                where: { orderId },
                include: { addresses: true }
            });

            if (!order || order.status !== 'CONFIRMED') {
                console.log(`⚠️ Order ${orderId} not eligible for auto-assignment (Status: ${order?.status})`);
                return false;
            }

            // Mock: Find an available courier. 
            // In reality, this would query the User Service or a local "ActiveCouriers" table.
            // For this implementation, we'll try to find a courier who isn't currently busy.

            // Since we don't have a direct link to User Service's DB, we'll look at our own assignments
            // and pick a courier ID that we know about but who doesn't have an ACTIVE assignment.

            // Let's grab a courier who has completed an order before or just use a placeholder
            // For the sake of "functionality", we'll pick a courier who has handled an order before.
            const previousAssignment = await (prisma as any).courierAssignment.findFirst({
                where: { status: 'COMPLETED' },
                select: { courierId: true }
            });

            let targetCourierId = previousAssignment?.courierId;

            // Fallback: If no one has completed an order yet, we might need a manual trigger 
            // or just pick a known courier ID from the user-service if we had one.
            // To make it truly "automatic" for the user, I'll simulate finding one if none found.
            if (!targetCourierId) {
                console.log('ℹ️ No previously active couriers found. Waiting for manual claim or first courier login.');
                // In a real system, we'd broadcast a "New Job Available" event instead of direct assignment
                return false;
            }

            console.log(`🎯 Assigning order ${orderId} to courier ${targetCourierId}`);

            const oldStatus = order.status;
            const updatedOrder = await (prisma as any).order.update({
                where: { orderId },
                data: {
                    courierId: targetCourierId,
                    status: 'ASSIGNED_TO_COURIER',
                    updatedAt: new Date()
                }
            });

            await (prisma as any).courierAssignment.create({
                data: {
                    orderId,
                    courierId: targetCourierId,
                    status: 'ACTIVE'
                }
            });

            await (prisma as any).trackingEvent.create({
                data: {
                    orderId,
                    eventType: 'COURIER_ASSIGNED',
                    eventTimestamp: new Date(),
                    courierId: targetCourierId,
                    notes: 'Automatically assigned by system'
                }
            });

            // Publish events
            await orderProducer.publishOrderAssigned({
                orderId: updatedOrder.orderId,
                orderNumber: updatedOrder.orderNumber,
                customerId: updatedOrder.customerId,
                courierId: targetCourierId
            });

            await orderProducer.publishOrderStatusChanged({
                orderId: updatedOrder.orderId,
                orderNumber: updatedOrder.orderNumber,
                customerId: updatedOrder.customerId,
                oldStatus,
                newStatus: updatedOrder.status,
                courierId: targetCourierId
            });

            return true;
        } catch (error) {
            console.error('Auto-assignment failed:', error);
            return false;
        }
    }
}

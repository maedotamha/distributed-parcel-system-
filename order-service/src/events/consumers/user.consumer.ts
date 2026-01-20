//C:\Users\HP\Documents\5(1ST SEMESTER)\ds\u\distributed-parcel-delivery-system\distributed-parcel-delivery-system\order-service\src\events\consumers\user.consumer.ts
import { rabbitMQ } from '../../config/rabbitmq';

export const startUserConsumer = async (): Promise<void> => {
    try {
        // Subscribe to user.updated events
        await rabbitMQ.subscribe(
            'user.updated',
            'order_service_user_queue',
            async (data: any) => {
                console.log('📥 Received user.updated event:', data);

                try {
                    const { userId, email, phone_number, first_name, last_name } = data;

                    // Here you could cache user information or update any denormalized data
                    // For now, we'll just log it
                    console.log(`User ${userId} updated: ${first_name} ${last_name}`);

                    // If you need to update any order-related user information, do it here
                } catch (error) {
                    console.error('Error processing user.updated event:', error);
                }
            }
        );

        // Subscribe to courier.availability.changed events
        await rabbitMQ.subscribe(
            'courier.availability.changed',
            'order_service_courier_availability_queue',
            async (data: any) => {
                console.log('📥 Received courier.availability.changed event:', data);

                try {
                    const { courierId, isAvailable, status } = data;

                    // Handle courier availability changes
                    // This could trigger reassignment logic if a courier becomes unavailable
                    console.log(`Courier ${courierId} availability changed: ${isAvailable ? 'Available' : 'Unavailable'}`);

                    // Implement reassignment logic here if needed
                } catch (error) {
                    console.error('Error processing courier.availability.changed event:', error);
                }
            }
        );

        console.log('✅ User consumers initialized');
    } catch (error) {
        console.error('Failed to start user consumer:', error);
    }
};

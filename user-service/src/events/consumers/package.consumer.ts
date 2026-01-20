//user-service\src\events\consumers\package.consumer.ts
import { rabbitMQ } from '../../config/rabbitmq';
import prisma from '../../config/database';

export const startPackageConsumer = async () => {
  // Subscribe to package.created events
  await rabbitMQ.subscribe('package.created', 'user_service_package_created', async (data) => {
    console.log('📦 Received package.created event:', data);
    
    // Example logic: Verify sender/receiver exists (if needed asynchronously)
    const { sender_id } = data;
    
    if (sender_id) {
       const sender = await prisma.users.findUnique({ where: { user_id: sender_id } });
       if (!sender) console.warn(`⚠️ Warning: Sender ${sender_id} not found for package ${data.package_id}`);
    }
  });
};

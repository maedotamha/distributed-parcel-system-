
import dotenv from 'dotenv';
import { rabbitMQ } from './config/rabbitmq';
import { startNotificationConsumer } from './events/consumer';

dotenv.config();

const startService = async () => {
    console.log('🚀 Starting Notification Service...');

    // 1. Connect to RabbitMQ
    await rabbitMQ.connect();

    // 2. Start Consumers
    await startNotificationConsumer();

    // Keep process alive
    console.log('✅ Notification Service is running properly.');
};

startService().catch(err => {
    console.error('Failed to start service:', err);
});

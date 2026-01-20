
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rabbitMQ } from './config/rabbitmq';
import orderRoutes from './routes/order.routes';
import { startPaymentConsumer } from './events/consumers/payment.consumer';
import { startUserConsumer } from './events/consumers/user.consumer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/orders', orderRoutes);

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    service: 'order-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Root Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to the Order Management Service API 📦',
    version: '2.0.0'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`\n🚀 Order Service running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);

  // Initialize RabbitMQ
  try {
    await rabbitMQ.connect();

    // Start event consumers
    await startPaymentConsumer();
    await startUserConsumer();

    console.log('✅ All event consumers initialized');
  } catch (error) {
    console.error('❌ Failed to initialize RabbitMQ consumers:', error);
  }
});

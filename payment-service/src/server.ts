import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rabbitMQ } from './config/rabbitmq';
import { startOrderConsumer } from './events/consumers/order.consumer';
import paymentRoutes from './routes/payment.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    service: 'payment-service',
    uptime: process.uptime(),
  });
});

// 🔴 BOOTSTRAP FUNCTION WITH RETRY LOGIC
const start = async () => {
  try {
    console.log('🔌 Connecting to RabbitMQ...');
    await rabbitMQ.connect();

    console.log('📡 Starting payment consumers...');
    await startOrderConsumer();

    app.listen(PORT, () => {
      console.log(`\n🚀 Payment Service running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start payment service:', error);
    console.log('⏳ Retrying in 5 seconds...');
    setTimeout(start, 5000); // Retry after 5 seconds if RabbitMQ not ready
  }
};

start();

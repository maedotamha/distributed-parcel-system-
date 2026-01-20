//C:\Users\HP\Documents\5(1ST SEMESTER)\ds\u\distributed-parcel-delivery-system\distributed-parcel-delivery-system\user-service\src\server.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import customerRoutes from './routes/customer.routes';
import courierRoutes from './routes/courier.routes';
import { rabbitMQ } from './config/rabbitmq'; 
import { startPackageConsumer } from './events/consumers/package.consumer';





// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors());   // Cross-origin resource sharing
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/couriers', courierRoutes);



// Health Check Endpoint

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to the User Management Service API 📦'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`\n🚀 User Service running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);

  // Initialize RabbitMQ
  await rabbitMQ.connect();
  await startPackageConsumer();
});


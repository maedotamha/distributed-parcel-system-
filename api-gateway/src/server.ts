//api-gateway\src\server.ts
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = 8000;

app.use(cors());



// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API Gateway is running' });
});

// Proxy options
const proxyOptions = {
  changeOrigin: true,
  onProxyReq: (proxyReq: any, req: express.Request) => {
    if ((req as any).user) {
      proxyReq.setHeader('x-user-data', JSON.stringify((req as any).user));
    }
  }
};

// Apply auth middleware to all routes EXCEPT the public ones
app.use('/api', (req, res, next) => {
  // Routes that DON'T require authentication (relative to /api)
  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/users/auth/login',
    '/users/auth/register',
    '/payments/initiate',
    '/payments/verify',
    '/payments/estimate-price',
    '/health'
  ];

  const isPublic = publicPaths.some(path =>
    req.path === path || req.path.startsWith(path + '/')
  );

  if (isPublic) {
    return next();
  }

  return authMiddleware(req, res, next);
});



// User Service Proxy
app.use('/api/users', createProxyMiddleware({
  ...proxyOptions,
  target: process.env.USER_SERVICE_URL || 'http://user-app:3001',
  pathRewrite: (path) => {
    if (path.includes('/auth')) {
      return path.replace('/api/users/auth', '/api/auth');
    }
    return path;
  },
  onProxyReq: (proxyReq, req) => {
    console.log(`[Proxy] Forwarding ${req.method} to user-app:3001${proxyReq.path}`);
  },
  onProxyRes: (proxyRes) => {
    console.log(`[Proxy] Received response from user-app: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[Proxy Error] ${err.message}`, err);
    res.status(502).json({ error: 'Bad Gateway', message: err.message });
  }
}));

// Order Service Proxy
app.use('/api/orders', createProxyMiddleware({
  ...proxyOptions,
  target: process.env.ORDER_SERVICE_URL || 'http://order-app:3002',
  pathRewrite: (path: string) => path
}));

// Payment Service Proxy
app.use('/api/payments', createProxyMiddleware({
  ...proxyOptions,
  target: process.env.PAYMENT_SERVICE_URL || 'http://payment-app:3003',
  changeOrigin: true,
  pathRewrite: (path: string) => path,
  onProxyReq: (proxyReq, req) => {
    console.log(`[Proxy] Forwarding ${req.method} to payment-app:3003${proxyReq.path}`);
  },
  onProxyRes: (proxyRes) => {
    console.log(`[Proxy] Response from payment-app: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`[Proxy Error] ${err.message}`, err);
    res.status(502).json({ error: 'Bad Gateway', message: err.message });
  }
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway running on http://0.0.0.0:${PORT}`);
});


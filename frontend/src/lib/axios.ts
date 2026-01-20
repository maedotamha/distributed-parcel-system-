//C:\Users\HP\Documents\5(1ST SEMESTER)\ds\u\distributed-parcel-delivery-system\distributed-parcel-delivery-system\frontend\src\lib\axios.ts
import axios from 'axios';

// Base URLs for Microservices (via NGINX Load Balancer)
export const USERS_API = 'http://localhost:80/api/users';
export const ORDERS_API = 'http://localhost:80/api/orders';
export const PAYMENTS_API = 'http://localhost:80/api/payments';


const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

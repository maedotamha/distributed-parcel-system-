
import { Router } from 'express';
import * as OrderController from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create a new order (CUSTOMER only)
router.post('/', authorize(['CUSTOMER']), OrderController.createOrder);

// Get all orders (admin/system view - for now, allow all authenticated users)
router.get('/', OrderController.getAllOrders);

// Get customer's own orders (CUSTOMER only)
router.get('/my-orders', authorize(['CUSTOMER']), OrderController.getMyOrders);

// Get courier's assigned orders (COURIER only)
router.get('/courier-orders', authorize(['COURIER']), OrderController.getCourierOrders);

// Get order by ID (accessible by customer who owns it or assigned courier)
router.get('/:id', OrderController.getOrderById);

// Update order status (COURIER only)
router.patch('/:id/status', authorize(['COURIER']), OrderController.updateOrderStatus);

// Update courier location (COURIER only)
router.patch('/:id/location', authorize(['COURIER']), OrderController.updateOrderLocation);

// Submit delivery proof (COURIER only)
router.post('/:id/proof', authorize(['COURIER']), OrderController.submitDeliveryProof);

export default router;

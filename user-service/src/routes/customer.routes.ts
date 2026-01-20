
import { Router } from 'express';
import * as CustomerController from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['CUSTOMER'])); // Only customers can access these

router.get('/me/profile', CustomerController.getCustomerProfile);
router.get('/me/addresses', CustomerController.getAddresses);
router.post('/me/addresses', CustomerController.addAddress);

export default router;

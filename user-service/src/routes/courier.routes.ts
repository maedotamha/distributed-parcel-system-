
import { Router } from 'express';
import * as CourierController from '../controllers/courier.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['COURIER'])); // Only couriers

router.get('/me/profile', CourierController.getCourierProfile);
router.put('/me/status', CourierController.updateStatus);
router.put('/me/location', CourierController.updateLocation);

// Vehicle routes
router.post('/me/vehicles', CourierController.addVehicle);

// Availability routes
router.post('/me/availability', CourierController.addAvailability);

export default router;

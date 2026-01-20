
import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(authenticate);

router.get('/me', UserController.getProfile);
router.get('/profile', UserController.getProfile);
router.put('/me', UserController.updateProfile);
router.delete('/me', UserController.deleteAccount);

export default router;

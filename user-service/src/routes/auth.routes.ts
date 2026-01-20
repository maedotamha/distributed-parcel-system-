
import { Router } from 'express';
import { body } from 'express-validator';
import * as AuthController from '../controllers/auth.controller';

const router = Router();

// Validation Rules

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),

  body('first_name')
    .notEmpty()
    .withMessage('First name is required'),

  body('last_name')
    .notEmpty()
    .withMessage('Last name is required'),

  body('phone_number')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+251\d{9}$/)
    .withMessage('Phone number must be in the format +251XXXXXXXXX'),

  body('user_role')
    .optional()
    .isIn(['CUSTOMER', 'COURIER'])
    .withMessage('Invalid role')
];

// Routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', AuthController.login);

export default router;

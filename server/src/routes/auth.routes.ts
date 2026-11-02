import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', validateBody(registerSchema), authController.register);

// POST /api/auth/login
authRouter.post('/login', validateBody(loginSchema), authController.login);

// POST /api/auth/refresh
authRouter.post('/refresh', authController.refreshToken);

// POST /api/auth/logout
authRouter.post('/logout', authenticate, authController.logout);

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);

// POST /api/auth/reset-password
authRouter.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// GET /api/auth/me
authRouter.get('/me', authenticate, authController.getMe);

// PUT /api/auth/profile
authRouter.put('/profile', authenticate, authController.updateProfile);

// PUT /api/auth/change-password
authRouter.put('/change-password', authenticate, authController.changePassword);

export default authRouter;

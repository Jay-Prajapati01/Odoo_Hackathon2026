import { Router } from 'express';
import {
  signup,
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  promote,
} from '../controllers/auth.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { validate } from '../../../middleware/error-handler';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  refreshSchema,
  promoteSchema,
} from '../validators/auth.validator';

export const authRoutes = Router();

authRoutes.post('/signup', validate(signupSchema), signup);
authRoutes.post('/login', validate(loginSchema), login);
authRoutes.post('/refresh', validate(refreshSchema), refreshSession);
authRoutes.post('/logout', authenticate, logout);
authRoutes.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
authRoutes.post('/reset-password', validate(resetPasswordSchema), resetPassword);
authRoutes.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
authRoutes.get('/me', authenticate, getMe);
authRoutes.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);
authRoutes.patch('/users/:id/role', authenticate, authorize('user.promote'), validate(promoteSchema), promote);

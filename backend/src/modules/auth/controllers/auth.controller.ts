import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/async-handler';
import { sendResponse } from '../../../common/api-response';
import { httpStatus } from '../../../common/http-status';
import { BadRequestError } from '../../../common/errors';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { EmployeeRepository } from '../../organization/repositories/employee.repository';
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

const service = new AuthService(
  new UserRepository(),
  new RefreshTokenRepository(),
  new RoleRepository(),
  new EmployeeRepository()
);

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new user (always as Employee)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201: { description: User registered }
 *       409: { description: Email already exists }
 */
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.register(req.body, req);
  sendResponse(res, httpStatus.CREATED, 'User registered successfully', result);
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate and receive tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await service.login(email, password, req);
  service.setAuthCookies(res, result.tokens);
  sendResponse(res, httpStatus.OK, 'Login successful', {
    user: result.user,
    permissions: result.permissions,
    role: result.roleName,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
  });
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Rotate and refresh access token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Session refreshed }
 *       401: { description: Invalid refresh token }
 */
export const refreshSession = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) throw new BadRequestError('Refresh token missing');
  const { tokens } = await service.refresh(token);
  service.setAuthCookies(res, tokens);
  sendResponse(res, httpStatus.OK, 'Session refreshed', {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  await service.logout(refreshToken);
  service.clearAuthCookies(res);
  sendResponse(res, httpStatus.OK, 'Logged out successfully');
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await service.logoutAll(req.user!.userId);
  service.clearAuthCookies(res);
  sendResponse(res, httpStatus.OK, 'Logged out of all sessions');
});

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request a password reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties: { email: { type: string } }
 *     responses:
 *       200: { description: Reset requested }
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken } = await service.forgotPassword(req.body.email);
  sendResponse(res, httpStatus.OK, 'If the account exists, a reset link has been sent', resetToken ? { resetToken } : undefined);
});

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Password reset }
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.resetPassword(req.body.token, req.body.password);
  sendResponse(res, httpStatus.OK, 'Password has been reset. Please log in.');
});

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password (requires current password)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Password changed }
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await service.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword, req);
  service.clearAuthCookies(res);
  sendResponse(res, httpStatus.OK, 'Password changed successfully. Please log in again.');
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.me(req.user!.userId);
  sendResponse(res, httpStatus.OK, 'Current user', { ...result, role: result.roleName });
});

/**
 * @swagger
 * /api/v1/auth/profile:
 *   patch:
 *     summary: Update own profile (name, phone, avatar)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile updated }
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const updated = await service.updateProfile(req.user!.userId, req.body, req.user!.userId, req);
  sendResponse(res, httpStatus.OK, 'Profile updated', updated);
});

/**
 * @swagger
 * /api/v1/auth/users/{id}/role:
 *   patch:
 *     summary: Promote a user to another role (Admin only)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId]
 *             properties: { roleId: { type: string } }
 *     responses:
 *       200: { description: Role updated }
 */
export const promote = asyncHandler(async (req: Request, res: Response) => {
  const updated = await service.promote(req.user!.userId, req.params.id, req.body.roleId, req);
  sendResponse(res, httpStatus.OK, 'User role updated', updated);
});

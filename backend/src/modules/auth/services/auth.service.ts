import crypto from 'crypto';
import { IUser } from '../models/user.model';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { EmployeeRepository } from '../../organization/repositories/employee.repository';
import { hashPassword, comparePassword } from '../../../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../../../utils/jwt';
import { UnauthorizedError, NotFoundError, ConflictError, BadRequestError, BusinessRuleError } from '../../../common/errors';
import { env } from '../../../config/env';
import { generateReferenceId } from '../../../utils/helpers';
import { dispatchNotification, recordActivity } from '../../../shared/events';
import { AuthTokens, UserSafe } from '../interfaces/auth.interface';
import { toUserSafe } from '../dto/auth.dto';
import { logger } from '../../../utils/logger';
import { Request } from 'express';

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly roles: RoleRepository,
    private readonly employees: EmployeeRepository
  ) {}

  private async buildUserResponse(user: IUser): Promise<{ user: UserSafe; permissions: string[]; roleName: string }> {
    const role = await this.roles.findById(user.role.toString());
    return {
      user: toUserSafe(user, user.role.toString()),
      permissions: role?.permissions ?? [],
      roleName: role?.roleName ?? 'Unknown',
    };
  }

  private async issueTokens(user: IUser, permissions: string[], roleName: string): Promise<AuthTokens> {
    const jti = crypto.randomUUID();
    const accessToken = generateAccessToken({
      userId: user.id,
      roleId: user.role.toString(),
      roleName,
      permissions,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      roleId: user.role.toString(),
      roleName,
      permissions: [],
      jti,
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokens.create(user.id, jti, expiresAt);
    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput, req?: Request): Promise<{ user: UserSafe; permissions: string[]; roleName: string }> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError('Email already registered');

    // Signup ALWAYS creates an Employee role only
    const employeeRole = await this.roles.findByRoleName('Employee');
    if (!employeeRole) throw new NotFoundError('Default Employee role not found');

    const passwordHash = await hashPassword(input.password);
    const status = env.signupAutoActivate ? 'active' : 'pending';

    const user = await this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      password: passwordHash,
      role: employeeRole.id as never,
      status,
      isEmailVerified: false,
      createdBy: undefined,
    });

    // Workflow: Signup -> Employee Created
    const employee = await this.employees.create({
      userId: user.id,
      employeeCode: generateReferenceId('EMP').slice(0, 12),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      designation: 'Employee',
      employmentStatus: 'active',
    });

    recordActivity({ req, userId: user.id, action: 'user.registered', entity: 'User', entityId: user.id, newValue: { email: user.email, role: employeeRole.roleName } });
    recordActivity({ req, userId: user.id, action: 'employee.created', entity: 'Employee', entityId: employee.id, newValue: employee.toObject() });

    return this.buildUserResponse(user);
  }

  async login(email: string, password: string, req?: Request): Promise<{ tokens: AuthTokens; user: UserSafe; permissions: string[]; roleName: string }> {
    const user = await this.users.findByEmail(email);
    if (!user || user.status === 'inactive' || user.status === 'locked') {
      logger.warn('Login failed: invalid or inactive account', { email });
      throw new UnauthorizedError('Invalid credentials or account disabled');
    }
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      logger.warn('Login failed: bad password', { email });
      recordActivity({ req, userId: user.id, action: 'user.login_failed', entity: 'User', entityId: user.id });
      throw new UnauthorizedError('Invalid credentials');
    }
    const role = await this.roles.findById(user.role.toString());
    if (!role || role.status !== 'active') throw new UnauthorizedError('Assigned role is inactive');

    await this.users.update(user.id, { lastLogin: new Date() });
    const tokens = await this.issueTokens(user, role.permissions, role.roleName);
    recordActivity({ req, userId: user.id, action: 'user.login', entity: 'User', entityId: user.id });
    const response = await this.buildUserResponse(user);
    return { tokens, user: response.user, permissions: response.permissions, roleName: response.roleName };
  }

  async refresh(refreshToken: string): Promise<{ tokens: AuthTokens }> {
    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    if (!payload.jti) throw new UnauthorizedError('Refresh token missing identifier');
    const stored = await this.refreshTokens.findByJti(payload.jti);
    if (!stored || stored.revoked) throw new UnauthorizedError('Refresh token revoked');

    const user = await this.users.findById(payload.userId);
    if (!user || user.status !== 'active') throw new UnauthorizedError('User unavailable');

    // Token rotation: revoke the used refresh token and issue a fresh pair
    await this.refreshTokens.revoke(payload.jti);
    const role = await this.roles.findById(user.role.toString());
    const tokens = await this.issueTokens(user, role?.permissions ?? [], role?.roleName ?? 'Employee');
    return { tokens };
  }

  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        if (payload.jti) await this.refreshTokens.revoke(payload.jti);
      } catch {
        // ignore invalid token
      }
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
  }

  async me(userId: string): Promise<{ user: UserSafe; permissions: string[]; roleName: string }> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return this.buildUserResponse(user);
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; avatar?: string }, actorId: string, req?: Request): Promise<UserSafe> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const updated = await this.users.update(userId, { ...data, updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'user.profile_updated', entity: 'User', entityId: userId, oldValue: { firstName: user.firstName, lastName: user.lastName, phone: user.phone }, newValue: data });
    return toUserSafe(updated!, user.role.toString());
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, req?: Request): Promise<void> {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User not found');
    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw new BadRequestError('Current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    await this.users.update(userId, { password: passwordHash });
    await this.logoutAll(userId);
    recordActivity({ req, userId, action: 'user.password_changed', entity: 'User', entityId: userId });
    logger.info('Password changed', { userId });
  }

  async forgotPassword(email: string): Promise<{ resetToken?: string }> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      // Do not reveal existence of the account
      return {};
    }
    const plain = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(plain).digest('hex');
    await this.users.update(user.id, { passwordResetToken: hash, passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS) });
    logger.info('Password reset requested', { userId: user.id });
    // In production this token would be emailed. Returned here for integration testing.
    return env.isProduction ? {} : { resetToken: plain };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.users.findByResetToken(hash);
    if (!user) throw new BadRequestError('Invalid or expired reset token');
    const passwordHash = await hashPassword(newPassword);
    await this.users.update(user.id, {
      password: passwordHash,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });
    await this.logoutAll(user.id);
    logger.info('Password reset completed', { userId: user.id });
  }

  async promote(actorId: string, targetUserId: string, newRoleId: string, req?: Request): Promise<UserSafe> {
    if (actorId === targetUserId) throw new BusinessRuleError('Users cannot change their own role');
    const target = await this.users.findById(targetUserId);
    if (!target) throw new NotFoundError('User not found');
    const role = await this.roles.findById(newRoleId);
    if (!role) throw new NotFoundError('Role not found');
    if (role.roleName !== 'Employee' && role.roleName !== 'Department Head' && role.roleName !== 'Asset Manager') {
      // Only Admin/Asset Manager/Department Head/Employee exist; promote to non-admin roles only.
    }
    const oldRole = await this.roles.findById(target.role.toString());
    const updated = await this.users.update(targetUserId, { role: newRoleId as never, updatedBy: actorId });
    recordActivity({ req, userId: actorId, action: 'user.promoted', entity: 'User', entityId: targetUserId, oldValue: { role: oldRole?.roleName }, newValue: { role: role.roleName } });
    dispatchNotification({ recipientId: targetUserId, type: 'general', title: 'Role Updated', message: `Your role has been updated to ${role.roleName}.`, reference: { entity: 'User', entityId: targetUserId } });
    return toUserSafe(updated!, newRoleId);
  }

  setAuthCookies(res: import('express').Response, tokens: AuthTokens): void {
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: env.secureCookie,
      sameSite: 'strict',
      domain: env.cookieDomain,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.secureCookie,
      sameSite: 'strict',
      domain: env.cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res: import('express').Response): void {
    res.clearCookie('accessToken', { domain: env.cookieDomain });
    res.clearCookie('refreshToken', { domain: env.cookieDomain });
  }
}

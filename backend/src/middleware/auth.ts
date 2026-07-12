import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../common/errors';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  const cookieToken = req.cookies?.accessToken;
  return cookieToken || null;
};

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('Access token missing');
    }
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      roleId: payload.roleId,
      roleName: payload.roleName ?? '',
      permissions: payload.permissions,
      email: '',
      firstName: '',
      lastName: '',
    };
    next();
  } catch (error) {
    logger.warn('Authentication failed', { error });
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import { authenticate } from './auth';

const ensureAuthorized = (req: Request, next: NextFunction, requiredPermissions: string[]): void => {
  const user = req.user;
  if (!user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  const hasAll = requiredPermissions.every((perm) => user.permissions.includes(perm));
  if (!hasAll) {
    next(new ForbiddenError(`Missing required permission(s): ${requiredPermissions.join(', ')}`));
    return;
  }
  next();
};

export const authorize =
  (...requiredPermissions: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (req.user) {
      ensureAuthorized(req, next, requiredPermissions);
      return;
    }
    // Authenticate first if no user context is present
    authenticate(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      ensureAuthorized(req, next, requiredPermissions);
    });
  };

export const authorizeAny =
  (...requiredPermissions: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const proceed = (): void => {
      const user = req.user;
      if (!user) {
        next(new UnauthorizedError('Authentication required'));
        return;
      }
      const hasAny = requiredPermissions.some((perm) => user.permissions.includes(perm));
      if (!hasAny) {
        next(new ForbiddenError(`Requires at least one of: ${requiredPermissions.join(', ')}`));
        return;
      }
      next();
    };
    if (req.user) {
      proceed();
      return;
    }
    authenticate(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      proceed();
    });
  };

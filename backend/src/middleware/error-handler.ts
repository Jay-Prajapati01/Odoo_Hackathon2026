import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../common/errors';
import { logger } from '../utils/logger';

type Target = 'body' | 'params' | 'query';

export const validate =
  (schema: ZodSchema, target: Target = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req[target]);
      if (!result.success) {
        const details = (result.error as ZodError).format();
        throw new ValidationError('Validation failed', details);
      }
      req[target] = result.data as never;
      next();
    } catch (error) {
      next(error);
    }
  };

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({ success: false, message: err.message, code: err.code, errors: err.details, timestamp: new Date().toISOString() });
    return;
  }

  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid or expired token', code: 'INVALID_TOKEN', timestamp: new Date().toISOString() });
    return;
  }

  if (err && typeof err === 'object' && 'statusCode' in err) {
    const apiErr = err as { statusCode: number; message: string; code?: string };
    res.status(apiErr.statusCode).json({ success: false, message: apiErr.message, code: apiErr.code, timestamp: new Date().toISOString() });
    return;
  }

  logger.error('Unhandled error', { error: err, path: req.path, method: req.method });
  res.status(500).json({ success: false, message: 'Internal Server Error', code: 'INTERNAL_ERROR', timestamp: new Date().toISOString() });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND', timestamp: new Date().toISOString() });
};

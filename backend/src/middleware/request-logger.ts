import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { env, isProduction } from '../config/env';
import { logger } from '../utils/logger';

export const requestLogger = morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: () => !isProduction,
});

export const attachTraceId = (req: Request, _res: Response, next: NextFunction): void => {
  req.traceId = crypto.randomUUID();
  next();
};

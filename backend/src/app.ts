import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { apiRouter } from './routes';
import { globalErrorHandler, notFoundHandler } from './middleware/error-handler';
import { globalRateLimiter, authRateLimiter } from './middleware/rate-limiter';
import { requestLogger, attachTraceId } from './middleware/request-logger';
import { sanitize } from './middleware/sanitize';
import { swaggerSpec } from './swagger';
import swaggerUi from 'swagger-ui-express';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(attachTraceId);
  app.use(sanitize);
  app.use(requestLogger);
  app.use(globalRateLimiter);
  app.use('/api/v1/auth', authRateLimiter);
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  const basePath = `${env.apiPrefix}/${env.apiVersion}`;
  app.use(basePath, apiRouter);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

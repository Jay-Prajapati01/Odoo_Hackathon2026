import { env } from './env';
import { logger } from '../utils/logger';

const PLACEHOLDER_SECRETS = ['change_me_access_secret', 'change_me_refresh_secret', ''];

/**
 * Validates critical runtime configuration. In production it fails fast when
 * insecure or missing values are detected. In development it only warns.
 */
export function validateEnv(): void {
  const issues: string[] = [];

  if (!env.mongodbUri) {
    issues.push('MONGODB_URI is not set');
  }

  if (env.isProduction) {
    if (PLACEHOLDER_SECRETS.includes(env.jwtAccessSecret)) {
      issues.push('JWT_ACCESS_SECRET must be set to a strong value in production');
    }
    if (PLACEHOLDER_SECRETS.includes(env.jwtRefreshSecret)) {
      issues.push('JWT_REFRESH_SECRET must be set to a strong value in production');
    }
    if (env.secureCookie === false) {
      issues.push('SECURE_COOKIE should be "true" in production');
    }
  } else {
    if (PLACEHOLDER_SECRETS.includes(env.jwtAccessSecret)) {
      logger.warn('JWT_ACCESS_SECRET is using an insecure default value; set it via environment in production');
    }
    if (PLACEHOLDER_SECRETS.includes(env.jwtRefreshSecret)) {
      logger.warn('JWT_REFRESH_SECRET is using an insecure default value; set it via environment in production');
    }
  }

  if (typeof env.port !== 'number' || env.port < 1 || env.port > 65535) {
    issues.push(`PORT must be a valid port number (got ${String(env.port)})`);
  }

  if (!['fatal', 'error', 'warn', 'info', 'debug'].includes(env.logLevel)) {
    issues.push(`LOG_LEVEL must be one of fatal|error|warn|info|debug (got ${env.logLevel})`);
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      if (env.isProduction) {
        logger.error(`Env validation: ${issue}`);
      } else {
        logger.warn(`Env validation: ${issue}`);
      }
    }
    if (env.isProduction) {
      throw new Error(
        'Invalid environment configuration. Refusing to start in production. ' +
          'See logs above for details.'
      );
    }
  } else {
    logger.info('Environment configuration validated');
  }
}

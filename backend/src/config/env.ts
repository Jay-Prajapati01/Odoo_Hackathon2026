import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api',
  apiVersion: process.env.API_VERSION || 'v1',

  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/assetflow',

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change_me_access_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me_refresh_secret',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
  secureCookie: process.env.SECURE_COOKIE === 'true',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 1000,

  logLevel: process.env.LOG_LEVEL || 'info',
  signupAutoActivate: process.env.SIGNUP_AUTO_ACTIVATE !== 'false',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL,
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD,
};

export const isProduction = env.nodeEnv === 'production';
export const isDevelopment = env.nodeEnv === 'development';

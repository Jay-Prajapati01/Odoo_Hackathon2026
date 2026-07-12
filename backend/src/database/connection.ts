import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    let uri = env.mongodbUri;

    if (env.useMemoryDb) {
      logger.info('USE_MEMORY_DB is enabled. Initializing MongoMemoryServer...');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      logger.info(`MongoMemoryServer initialized: ${uri}`);
    }

    try {
      await mongoose.connect(uri);
      logger.info(`MongoDB connected: ${uri}`);
    } catch (connectError) {
      if (!env.useMemoryDb) {
        logger.warn('Failed to connect to configured MongoDB URI. Falling back to MongoMemoryServer...', { error: connectError });
        mongoMemoryServer = await MongoMemoryServer.create();
        uri = mongoMemoryServer.getUri();
        logger.info(`MongoMemoryServer fallback initialized: ${uri}`);
        await mongoose.connect(uri);
        logger.info(`MongoDB connected (Fallback): ${uri}`);
      } else {
        throw connectError;
      }
    }
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

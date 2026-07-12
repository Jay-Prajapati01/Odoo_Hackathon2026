import mongoose from 'mongoose';
import { connectDatabase } from '../database/connection';
import { runSeed } from './index';
import { logger } from '../utils/logger';

const run = async (): Promise<void> => {
  await connectDatabase();
  await runSeed();
  await mongoose.disconnect();
  logger.info('Seed CLI finished');
  process.exit(0);
};

run().catch((error) => {
  logger.error('Seed CLI failed', { error });
  process.exit(1);
});

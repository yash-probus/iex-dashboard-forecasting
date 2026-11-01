import app from './app';
import config from './config';
import { logger } from './logger';

import prisma from './config/prisma';
import { disconnectRedis } from './config/redis';

process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

const server = app.listen(config.port, async () => {
  logger.success(`Server running in ${config.env} mode on port ${config.port}`);
  
  try {
    await prisma.$connect();
    logger.success('Prisma connected successfully');
    
    // Only CronService (which scrapes the official iexindia.com snapshot) is initialized in app.ts
    logger.info('Server initializations complete.');
  } catch (error) {
    logger.error('Prisma connection failed', error);
  }
});

process.on('unhandledRejection', (err: any) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`👋 ${signal} RECEIVED. Shutting down gracefully...`);
  server.close(async () => {
    logger.success('💥 HTTP server closed.');
    try {
      await disconnectRedis();
    } catch (err) {
      logger.error('Error during Redis disconnection', err);
    }
    try {
      await prisma.$disconnect();
      logger.success('Prisma disconnected successfully.');
    } catch (err) {
      logger.error('Error during Prisma disconnection', err);
    }
    process.exit(0);
  });
  
  // Force shutdown after 10s
  setTimeout(() => {
    logger.error('Forcing shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
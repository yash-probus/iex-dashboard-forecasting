import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  corsOrigin: string | string[];
  runScraper: boolean;
  webhookReceivers: string[];
  webhookSecret: string;
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is missing from environment variables. Application startup failed.');
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.includes(',')
      ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
      : process.env.CORS_ORIGIN
    : '*',
  runScraper: process.env.RUN_SCRAPER === 'true',
  webhookReceivers: process.env.WEBHOOK_RECEIVERS
    ? process.env.WEBHOOK_RECEIVERS.split(',').map(s => s.trim()).filter(Boolean)
    : [],
  webhookSecret: process.env.WEBHOOK_SECRET || 'super_secret_webhook_token_123',
};

export default config;

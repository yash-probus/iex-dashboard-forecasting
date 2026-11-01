import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { globalErrorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';
import { asyncHandler } from './middleware/asyncHandler';
import prisma from './config/prisma';
import { CronService } from './services/cron.service';

const app: Application = express();

// 1. GLOBAL MIDDLEWARES
// Trust proxy for rate limiter behind Nginx
app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "validator.swagger.io", "https:"],
      upgradeInsecureRequests: null,
    },
  },
}));

// Compress JSON payloads
app.use(compression());

import config from './config';

// Cross-Origin Resource Sharing
app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin || true);
  },
  credentials: true,
}));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

import authRoutes from './modules/auth/auth.routes';
import uploadRoutes from './modules/upload/upload.routes';
import { datasetRouter, uploadHistoryRouter } from './modules/dataset/dataset.routes';
import { dashboardRouter } from './modules/dataset/dashboard.routes';
import { resourceCenterRouter } from './modules/resource-center';
import scraperRoutes from './modules/scraper/scraper.routes';
import databaseRoutes from './modules/database/database.routes';
import apiLogRoutes from './modules/api-log/api-log.routes';
import marketOperationsRoutes from './modules/market-operations/market-operations.routes';
import forecastRoutes from './modules/forecast/forecast.routes';
import usersRoutes from './modules/users/users.routes';
import traderPerformanceRoutes from './modules/trader-performance/trader-performance.routes';
import traderPerformanceDailyRoutes from './modules/trader-performance-daily/trader-performance-daily.routes';
import upMarketRoutes from './modules/up-market/up-market.routes';

// Initialize scheduled background jobs
CronService.init();

import { setupSwagger } from './swagger';
// Initialize Swagger Docs
setupSwagger(app);

// 2. ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/datasets', datasetRouter);
app.use('/api/upload-history', uploadHistoryRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/resource-center', resourceCenterRouter);
app.use('/api/scraper', scraperRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/logs', apiLogRoutes);
app.use('/api/market-operations', marketOperationsRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/forecast', forecastRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/trader-performance', traderPerformanceRoutes);
app.use('/api/trader-performance-daily', traderPerformanceDailyRoutes);
app.use('/api/up-market', upMarketRoutes);


app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
  });
});

app.get(
  '/health/database',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      database: 'connected',
    });
  })
);

// Handle undefined Routes
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 3. GLOBAL ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

export default app;

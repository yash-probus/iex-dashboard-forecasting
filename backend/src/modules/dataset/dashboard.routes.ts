import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { 
  getDamData, 
  getGdamData, 
  getRtmData, 
  getRecData, 
  getDamAnalytics, 
  getGdamAnalytics, 
  getRtmAnalytics,
  getRecAnalytics,
  getOverviewData
} from './dashboard.controller';

export const dashboardRouter = Router();

// Notice: No authMiddleware here. Dashboard APIs are PUBLIC. (Deliverable 11)

/**
 * @swagger
 * tags:
 *   name: Dataset Dashboard
 *   description: Dashboard dataset endpoints (Public)
 */

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview data
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: Overview data
 */
dashboardRouter.get('/overview', asyncHandler(getOverviewData));

/**
 * @swagger
 * /api/dashboard/dam:
 *   get:
 *     summary: Get DAM data
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: DAM data
 */
dashboardRouter.get('/dam', asyncHandler(getDamData));

/**
 * @swagger
 * /api/dashboard/gdam:
 *   get:
 *     summary: Get GDAM data
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: GDAM data
 */
dashboardRouter.get('/gdam', asyncHandler(getGdamData));

/**
 * @swagger
 * /api/dashboard/rtm:
 *   get:
 *     summary: Get RTM data
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: RTM data
 */
dashboardRouter.get('/rtm', asyncHandler(getRtmData));

/**
 * @swagger
 * /api/dashboard/rec:
 *   get:
 *     summary: Get REC data
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: REC data
 */
dashboardRouter.get('/rec', asyncHandler(getRecData));

/**
 * @swagger
 * /api/dashboard/dam/analytics:
 *   get:
 *     summary: Get DAM analytics
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: DAM analytics
 */
dashboardRouter.get('/dam/analytics', asyncHandler(getDamAnalytics));

/**
 * @swagger
 * /api/dashboard/gdam/analytics:
 *   get:
 *     summary: Get GDAM analytics
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: GDAM analytics
 */
dashboardRouter.get('/gdam/analytics', asyncHandler(getGdamAnalytics));

/**
 * @swagger
 * /api/dashboard/rtm/analytics:
 *   get:
 *     summary: Get RTM analytics
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: RTM analytics
 */
dashboardRouter.get('/rtm/analytics', asyncHandler(getRtmAnalytics));

/**
 * @swagger
 * /api/dashboard/rec/analytics:
 *   get:
 *     summary: Get REC analytics
 *     tags: [Dataset Dashboard]
 *     responses:
 *       200:
 *         description: REC analytics
 */
dashboardRouter.get('/rec/analytics', asyncHandler(getRecAnalytics));

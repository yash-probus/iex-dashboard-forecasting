import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { ForecastController } from './forecast.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Forecast
 *   description: Price and Demand Forecast endpoints
 */

/**
 * @swagger
 * /api/forecast/price:
 *   get:
 *     summary: Get price forecast
 *     tags: [Forecast]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Price forecast data
 */
router.get('/price', asyncHandler(ForecastController.getPriceForecast));

/**
 * @swagger
 * /api/forecast/demand:
 *   get:
 *     summary: Get demand forecast
 *     tags: [Forecast]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Demand forecast data
 */
router.get('/demand', asyncHandler(ForecastController.getDemandForecast));

/**
 * @swagger
 * /api/forecast/generation:
 *   get:
 *     summary: Get generation forecast
 *     tags: [Forecast]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Generation forecast data
 */
router.get('/generation', asyncHandler(ForecastController.getGenerationForecast));

/**
 * @swagger
 * /api/forecast/dates:
 *   get:
 *     summary: Get available forecast dates
 *     tags: [Forecast]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of dates
 */
router.get('/dates', asyncHandler(ForecastController.getForecastDates));

/**
 * @swagger
 * /api/forecast/meters:
 *   get:
 *     summary: Get available meters
 *     tags: [Forecast]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available meter numbers
 */
router.get('/meters', asyncHandler(ForecastController.getMeters));

/**
 * @swagger
 * /api/forecast/market-selection:
 *   get:
 *     summary: Get market selection forecast
 *     tags: [Forecast]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Market selection forecast
 */
router.get('/market-selection', asyncHandler(ForecastController.getMarketSelectionForecast));

export default router;

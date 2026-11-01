import { Router } from 'express';
import { UpMarketController } from './up-market.controller';

const router = Router();
const upMarketController = new UpMarketController();

/**
 * @swagger
 * /api/up-market/{market}:
 *   get:
 *     summary: Retrieve Uttar Pradesh (UP) specific market data
 *     description: Fetches interval market data for a given market type (DAM, RTM, GDAM) based on the specified date range.
 *     tags:
 *       - UP Market
 *     parameters:
 *       - in: path
 *         name: market
 *         required: true
 *         schema:
 *           type: string
 *           enum: [DAM, RTM, GDAM]
 *         description: The market type to fetch data for.
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-09-22"
 *         description: Start date for the data fetch (YYYY-MM-DD). If no `endDate` is provided, fetches only for this day.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-09-23"
 *         description: End date for the data fetch (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Successfully retrieved market data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "12345"
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-09-22T00:00:00.000Z"
 *                       timeblock:
 *                         type: string
 *                         example: "00:00-00:15"
 *                       mcp:
 *                         type: number
 *                         example: 3.45
 *                       mcv:
 *                         type: number
 *                         example: 100.50
 *                       purchaseBid:
 *                         type: number
 *                         example: 150.25
 *                       sellBid:
 *                         type: number
 *                         example: 120.00
 *       400:
 *         description: Bad request (Invalid parameters or date range).
 *       500:
 *         description: Internal server error.
 */
router.get('/:market', upMarketController.getMarketData);

export default router;

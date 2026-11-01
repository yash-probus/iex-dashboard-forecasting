import { Router } from 'express';
import { TraderPerformanceController, uploadTradeReports } from './trader-performance.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadDir = path.join(__dirname, '../../../uploads/trader-performance');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * @swagger
 * tags:
 *   name: Trader Performance
 *   description: Trader Performance endpoints
 */

/**
 * @swagger
 * /api/trader-performance/upload:
 *   post:
 *     summary: Upload trade reports
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               clientId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Files uploaded and processed
 */
router.post('/upload', upload.array('files', 200), uploadTradeReports);

/**
 * @swagger
 * /api/trader-performance:
 *   get:
 *     summary: Get all trader performances
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trader performances
 */
router.get('/', TraderPerformanceController.getAll);

/**
 * @swagger
 * /api/trader-performance:
 *   post:
 *     summary: Create trader performance
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId: { type: string }
 *     responses:
 *       200:
 *         description: Created trader performance
 */
router.post('/', TraderPerformanceController.create);

/**
 * @swagger
 * /api/trader-performance/resource-defaults:
 *   get:
 *     summary: Get resource defaults
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resource defaults details
 */
router.get('/resource-defaults', TraderPerformanceController.getResourceDefaults);

/**
 * @swagger
 * /api/trader-performance/{id}:
 *   get:
 *     summary: Get trader performance by ID
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trader performance details
 */
router.get('/:id', TraderPerformanceController.getById);

/**
 * @swagger
 * /api/trader-performance/{id}:
 *   put:
 *     summary: Update trader performance
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated trader performance
 */
router.put('/:id', TraderPerformanceController.update);

/**
 * @swagger
 * /api/trader-performance/{id}:
 *   delete:
 *     summary: Delete trader performance
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', TraderPerformanceController.delete);

/**
 * @swagger
 * /api/trader-performance/{id}/client-overview:
 *   get:
 *     summary: Get client overview
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Overview details
 */
router.get('/:id/client-overview', TraderPerformanceController.getClientOverview);

/**
 * @swagger
 * /api/trader-performance/{id}/history:
 *   get:
 *     summary: Get calculation history
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: History details
 */
router.get('/:id/history', TraderPerformanceController.getHistory);

/**
 * @swagger
 * /api/trader-performance/{id}/calculate:
 *   get:
 *     summary: Calculate savings
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Savings calculation result
 */
router.get('/:id/calculate', TraderPerformanceController.calculateSavings);

/**
 * @swagger
 * /api/trader-performance/{id}/market-decision:
 *   get:
 *     summary: Calculate market decision
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Market decision result
 */
router.get('/:id/market-decision', TraderPerformanceController.calculateMarketDecision);

/**
 * @swagger
 * /api/trader-performance/{id}/demand-shift-insights:
 *   get:
 *     summary: Get demand shift insights
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Insights result
 */
router.get('/:id/demand-shift-insights', TraderPerformanceController.getDemandShiftInsights);

/**
 * @swagger
 * /api/trader-performance/{id}/export-excel:
 *   get:
 *     summary: Export full calculation to Excel
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file buffer
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/export-excel', TraderPerformanceController.exportExcel);

/**
 * @swagger
 * /api/trader-performance/{id}/actual-trader/export-excel:
 *   get:
 *     summary: Export actual trader performance to Excel
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file buffer
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/actual-trader/export-excel', TraderPerformanceController.exportActualTraderExcel);

/**
 * @swagger
 * /api/trader-performance/{id}/demand-shift-insights/export-excel:
 *   get:
 *     summary: Export demand shift to Excel
 *     tags: [Trader Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file buffer
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/demand-shift-insights/export-excel', TraderPerformanceController.exportDemandShiftExcel);

export default router;

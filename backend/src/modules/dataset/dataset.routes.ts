import { Router } from 'express';
import { 
  deleteDataset, 
  getDatasets, 
  getDatasetSummary, 
  getDatasetById, 
  getUploadHistory, 
  getDatasetHistory 
} from './dataset.controller';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';

export const datasetRouter = Router();
export const uploadHistoryRouter = Router();

// --- DATASET ROUTES (/api/datasets) ---
datasetRouter.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Dataset
 *   description: Dataset endpoints
 */

/**
 * @swagger
 * /api/datasets/summary:
 *   get:
 *     summary: Get dataset summary
 *     tags: [Dataset]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dataset summary data
 */
datasetRouter.get('/summary', asyncHandler(getDatasetSummary));

/**
 * @swagger
 * /api/datasets:
 *   get:
 *     summary: Get all datasets
 *     tags: [Dataset]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of datasets
 */
datasetRouter.get('/', asyncHandler(getDatasets));

/**
 * @swagger
 * /api/datasets/{datasetId}:
 *   get:
 *     summary: Get dataset by ID
 *     tags: [Dataset]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dataset details
 */
datasetRouter.get('/:datasetId', asyncHandler(getDatasetById));

/**
 * @swagger
 * /api/datasets/{datasetId}/history:
 *   get:
 *     summary: Get dataset history
 *     tags: [Dataset]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dataset history details
 */
datasetRouter.get('/:datasetId/history', asyncHandler(getDatasetHistory));

/**
 * @swagger
 * /api/datasets/{datasetId}:
 *   delete:
 *     summary: Delete dataset
 *     tags: [Dataset]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: datasetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
datasetRouter.delete('/:datasetId', asyncHandler(deleteDataset));

// --- UPLOAD HISTORY ROUTES (/api/upload-history) ---
uploadHistoryRouter.use(authMiddleware);

/**
 * @swagger
 * /api/upload-history:
 *   get:
 *     summary: Get upload history
 *     tags: [Upload History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of upload histories
 */
uploadHistoryRouter.get('/', asyncHandler(getUploadHistory));

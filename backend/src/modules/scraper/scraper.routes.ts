import { Router } from 'express';
import { triggerScraper, importScrapedData } from './scraper.controller';
import { asyncHandler } from '../../middleware/asyncHandler';
// Using existing requireAuth middleware to protect the endpoint
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// POST /api/scraper/sync
router.post('/sync', authMiddleware, asyncHandler(triggerScraper));

// POST /api/scraper/import (unprotected by JWT, secured with Webhook Token)
router.post('/import', asyncHandler(importScrapedData));

export default router;

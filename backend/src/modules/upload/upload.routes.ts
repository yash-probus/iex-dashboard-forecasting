import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { handleFileUpload, getUploadHealth } from './upload.controller';
import { validateUploadRequest } from './upload.validation';
import { authMiddleware } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/asyncHandler';
import { handleUpload, uploadCleanupOnError } from '../../middleware/upload.middleware';
import { logger } from '../../logger';

const router = Router();

// Protect all upload routes with JWT
router.use(authMiddleware);

// Moderate rate limiter for uploads to prevent disk exhaustion DDOS
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 upload requests per window
  message: { success: false, message: 'Upload limit exceeded. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Endpoint 1: POST /api/uploads
router.post(
  '/',
  uploadLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    logger.info('Upload started');
    next();
  },
  handleUpload,
  validateUploadRequest,
  asyncHandler(handleFileUpload),
  uploadCleanupOnError
);

// Endpoint 2: GET /api/uploads/health
router.get('/health', asyncHandler(getUploadHealth));

export default router;

import { Request, Response } from 'express';
import { logger } from '../../logger';
import { MarketType, UploadResponse } from './upload.types';
import { AppError } from '../../utils/AppError';
import { UploadProcessingService } from '../upload-processing/upload-processing.service';

export const handleFileUpload = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    
    if (!file) {
      throw new AppError('File upload failed', 400);
    }

    const { market, deliveryDate } = req.body;
    const action = req.query.action as string;
    
    // Hand off to processing service
    const result = await UploadProcessingService.processUpload({
      market: market.toUpperCase() as MarketType,
      deliveryDate: new Date(deliveryDate),
      filePath: file.path,
      fileName: file.filename,
      action
    });

    logger.success(`Upload processed: ${file.filename} for ${market}`);

    res.status(200).json({
      success: true,
      datasetId: result.datasetId,
      market,
      deliveryDate: req.body.date,
      fileName: file.filename,
      rowCount: result.rowCount,
      parsed: result.parsed
    });
  } catch (error) {
    logger.error('Upload failed unexpectedly in controller');
    throw error; // Will be caught by asyncHandler and then cleaned up by uploadCleanupOnError
  }
};

export const getUploadHealth = async (req: Request, res: Response) => {
  // Basic health check to ensure the endpoint is alive
  res.status(200).json({
    success: true,
    storage: 'healthy',
  });
};

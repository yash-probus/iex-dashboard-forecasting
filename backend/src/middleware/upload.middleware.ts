import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { upload } from '../config/multer';
import { logger } from '../logger';
import { AppError } from '../utils/AppError';

// Wrapper around multer to handle errors and cleanup
export const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err: any) => {
    // 1. If multer throws an error (e.g. file size limit, wrong extension)
    if (err) {
      // Cleanup partially uploaded file if it exists
      if ((req as any).file && (req as any).file.path) {
        fs.unlink((req as any).file.path, (unlinkErr) => {
          if (unlinkErr) logger.warn(`Failed to remove partial file: ${(req as any).file?.path}`);
          else logger.warn(`Upload failed. Removing partial file: ${(req as any).file?.path}`);
        });
      }
      
      // Pass the error down to the global error handler
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size exceeds the 50MB limit.', 400));
      }
      return next(new AppError(err.message || 'File upload failed.', 400));
    }

    // 2. If no file was provided
    if (!(req as any).file) {
      return next(new AppError('No file provided for upload.', 400));
    }

    next();
  });
};

export const uploadCleanupOnError = (err: any, req: Request, res: Response, next: NextFunction) => {
  // If an error happens *after* multer successfully processed the file (e.g., in the controller or subsequent middleware)
  if ((req as any).file && (req as any).file.path) {
    fs.unlink((req as any).file.path, (unlinkErr) => {
      if (unlinkErr) logger.warn(`Failed to remove file during cleanup: ${(req as any).file?.path}`);
      else logger.warn(`Upload failed later in pipeline. Removing file: ${(req as any).file?.path}`);
    });
  }
  next(err);
};

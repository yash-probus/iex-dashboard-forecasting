import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/AppError';
import { MarketType } from './upload.types';

export const validateUploadRequest = (req: Request, res: Response, next: NextFunction) => {
  let { market } = req.body;

  // 1. Validate Market
  if (!market) {
    return next(new AppError('Market type is required.', 400));
  }

  market = market.trim();

  const validMarkets: MarketType[] = ['DAM', 'GDAM', 'RTM', 'REC'];
  if (!validMarkets.includes(market.toUpperCase() as MarketType)) {
    return next(new AppError(`Invalid market type. Allowed: ${validMarkets.join(', ')}`, 400));
  }

  // Normalize market string for downstream usage (like multer)
  req.body.market = market.toUpperCase();
  
  if (req.body.date) {
    req.body.date = req.body.date.trim();
  }

  next();
};

import { Request, Response, NextFunction } from 'express';

export const superAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Super Admin access required',
    });
  }
  next();
};

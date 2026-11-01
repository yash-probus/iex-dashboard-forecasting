import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/AppError';

export const validateCreateUser = (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password, role } = req.body;

  if (!username || typeof username !== 'string' || username.trim() === '') {
    return next(new AppError('Username is required', 400));
  }
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return next(new AppError('Email is required', 400));
  }
  if (!role || (role !== 'ADMIN' && role !== 'CLIENT')) {
    return next(new AppError('Valid role is required (ADMIN or CLIENT)', 400));
  }

  req.body.username = username.trim();
  req.body.email = email.trim();
  next();
};

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction) => {
  const { username, email, role } = req.body;

  if (username !== undefined && (typeof username !== 'string' || username.trim() === '')) {
    return next(new AppError('Username must be a valid string', 400));
  }
  if (email !== undefined && (typeof email !== 'string' || email.trim() === '')) {
    return next(new AppError('Email must be a valid string', 400));
  }
  if (role !== undefined && (role !== 'ADMIN' && role !== 'CLIENT')) {
    return next(new AppError('Valid role is required (ADMIN or CLIENT)', 400));
  }

  if (username) req.body.username = username.trim();
  if (email) req.body.email = email.trim();
  next();
};

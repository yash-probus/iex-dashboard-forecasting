import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/AppError';
import { LoginDTO } from './auth.types';

export const validateLoginDTO = (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body as LoginDTO;

  if (!username || typeof username !== 'string' || username.trim() === '') {
    return next(new AppError('Username is required', 400));
  }

  if (!password || typeof password !== 'string' || password.trim() === '') {
    return next(new AppError('Password is required', 400));
  }

  // Trim username and attach sanitized body
  req.body.username = username.trim();
  req.body.password = password.trim();

  next();
};

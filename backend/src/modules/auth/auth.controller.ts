import { Request, Response } from 'express';
import { loginUser, sendOtpForUser, loginWithOtp } from './auth.service';
import { logger } from '../../logger';

export const login = async (req: Request, res: Response) => {
  try {
    const response = await loginUser(req.body);
    logger.info('User login successful', { username: req.body.username });
    res.status(200).json(response);
  } catch (error) {
    logger.error('User login failed', { username: req.body.username });
    throw error; // Let global error handler catch it
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    await sendOtpForUser(email);
    logger.info('OTP sent successfully', { email });
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    logger.error('Sending OTP failed', { email: req.body.email });
    throw error;
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    const response = await loginWithOtp(email, otp);
    logger.info('User OTP login successful', { email });
    res.status(200).json(response);
  } catch (error) {
    logger.error('User OTP login failed', { email: req.body.email });
    throw error;
  }
};

export const getMe = async (req: Request, res: Response) => {
  // @ts-ignore - user injected by auth.middleware
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
};

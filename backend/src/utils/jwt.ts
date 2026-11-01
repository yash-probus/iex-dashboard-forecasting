import jwt from 'jsonwebtoken';
import config from '../config';
import { AppError } from './AppError';

export interface JwtPayload {
  id: string;
  username: string;
  role: string;
  hiddenModules?: string[];
  readOnlyModules?: string[];
}

/**
 * Generates a JWT token for an authenticated admin.
 * @param payload Object containing id and username
 * @returns Signed JWT string
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
};

/**
 * Verifies and decodes a JWT token.
 * @param token The JWT string to verify
 * @returns Decoded payload
 * @throws AppError if token is invalid or expired
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new AppError('Invalid or expired token. Please log in again.', 401);
  }
};

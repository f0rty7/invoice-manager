import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

export interface JwtPayload {
  userId: string;
  username: string;
  role: 'user' | 'admin';
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, CONFIG.jwt.secret, {
    expiresIn: CONFIG.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, CONFIG.jwt.secret) as JwtPayload;
}


import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_replace_me_in_production';

export function generateToken(payload: object, expiresIn: string | number = '1h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

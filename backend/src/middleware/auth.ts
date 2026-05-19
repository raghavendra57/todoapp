import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    mfaVerified?: boolean;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  req.user = decoded as any;
  next();
};

export const requireMFA = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.mfaVerified) {
    return res.status(403).json({ error: 'Forbidden: MFA verification required' });
  }
  next();
};

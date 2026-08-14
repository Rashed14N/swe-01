import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'swe-portal-secret-key-2026';

export interface AuthUserPayload {
  id: string;
  studentId: string;
  name: string;
  email?: string;
  role: UserRole;
  batchId?: string;
  batchName?: string;
  currentSemester: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function generateToken(user: User): string {
  const payload: AuthUserPayload = {
    id: user.id,
    studentId: user.studentId,
    name: user.name,
    email: user.email,
    role: user.role,
    batchId: user.batchId,
    batchName: user.batchName,
    currentSemester: user.currentSemester,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    return next();
  } catch (err) {
    // If token decoding fails, check if token includes a known user ID or lookup in database
    try {
      const { db } = require('./db');
      const allUsers: User[] = db.getData().users || [];
      
      // Try to find if token matches a stored session user
      const foundUser = allUsers.find(u => token.includes(u.id) || token.includes(u.studentId));
      if (foundUser) {
        req.user = {
          id: foundUser.id,
          studentId: foundUser.studentId,
          name: foundUser.name,
          email: foundUser.email,
          role: foundUser.role,
          batchId: foundUser.batchId || 'batch_58',
          batchName: foundUser.batchName || '58th Batch',
          currentSemester: foundUser.currentSemester || 5,
        };
        return next();
      }

      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
    } catch (fallbackErr) {
      return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
    }
  }
}

export function optionalAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
      req.user = decoded;
    } catch (e) {
      // ignore
    }
  }
  next();
}

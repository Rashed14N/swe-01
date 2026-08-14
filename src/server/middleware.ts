import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../types';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `403 Forbidden: Action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

export function enforceBatchIsolation(
  getBatchIdFromReq: (req: AuthenticatedRequest) => string | undefined
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    // Admins can access any batch
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const requestedBatchId = getBatchIdFromReq(req);
    if (!requestedBatchId) {
      return next();
    }

    if (req.user.batchId !== requestedBatchId) {
      return res.status(403).json({
        error: '403 Forbidden: You do not have permission to access another batch\'s private information.',
      });
    }

    next();
  };
}

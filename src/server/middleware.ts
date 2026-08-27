import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../types';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const roleHeader = (req.headers['x-user-role'] as string) || '';

    // If client provides an admin role header or user has allowed role
    if (roleHeader && allowedRoles.includes(roleHeader as UserRole)) {
      if (!req.user) {
        req.user = {
          id: (req.headers['x-user-id'] as string) || 'admin',
          studentId: 'ADMIN',
          name: req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name'] as string) : 'Admin',
          email: (req.headers['x-user-email'] as string) || 'admin@swe.edu.bd',
          role: roleHeader as UserRole,
          batchId: 'batch-all',
          batchName: 'All Batches',
          currentSemester: 0,
        };
      } else {
        req.user.role = roleHeader as UserRole;
      }
      return next();
    }

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

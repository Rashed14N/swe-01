import { Router, Response } from 'express';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import {
  getAllFeatureFlags,
  isValidFeatureKey,
  updateFeatureFlag,
  bulkUpdateFeatureFlags,
  resetFeatureFlags,
} from '../featureFlags';
import { db } from '../db';

const router = Router();

function recordFeatureAudit(
  actor: AuthenticatedRequest['user'],
  action: string,
  targetName: string,
  details: string
) {
  try {
    const data = db.getData();
    if (!Array.isArray(data.auditLogs)) data.auditLogs = [];
    data.auditLogs.unshift({
      id: `audit_feat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actorId: actor?.id || 'admin',
      actorName: actor?.name || 'Department Admin',
      action,
      target: targetName,
      details,
      timestamp: new Date().toISOString(),
    });
    if (data.auditLogs.length > 300) {
      data.auditLogs = data.auditLogs.slice(0, 300);
    }
    db.save();
  } catch (err) {
    console.warn('Could not write feature flag audit log:', err);
  }
}

// ==============================================================================
// 1. GET /api/features - Fetch all feature flags (Public / Authenticated Read)
// ==============================================================================
router.get('/', optionalAuthToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const flags = getAllFeatureFlags();
    const enabledCount = flags.filter((f) => f.enabled).length;
    const disabledCount = flags.length - enabledCount;

    return res.json({
      success: true,
      data: flags,
      stats: {
        total: flags.length,
        enabled: enabledCount,
        disabled: disabledCount,
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch feature flags:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: err?.message || 'Failed to load feature flags' },
    });
  }
});

// ==============================================================================
// 2. PUT /api/features/:key - Toggle or update a single feature (Admin Only)
// ==============================================================================
router.put('/:key', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.params;
    if (!key || !isValidFeatureKey(key)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FEATURE_KEY', message: 'Unknown or unsupported feature key' },
      });
    }

    const { enabled, disabledMessage } = req.body as {
      enabled?: unknown;
      disabledMessage?: unknown;
    };

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Field "enabled" must be a boolean' },
      });
    }

    if (disabledMessage !== undefined && typeof disabledMessage !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Field "disabledMessage" must be a string' },
      });
    }

    const actorName = req.user?.name || 'Department Admin';
    const updated = updateFeatureFlag(
      key,
      {
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
        disabledMessage: typeof disabledMessage === 'string' ? disabledMessage : undefined,
      },
      actorName
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Feature flag not found' },
      });
    }

    recordFeatureAudit(
      req.user,
      updated.enabled ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED',
      updated.key,
      `${updated.name} was turned ${updated.enabled ? 'ON' : 'OFF'} by ${actorName}`
    );

    const allFlags = getAllFeatureFlags();
    return res.json({
      success: true,
      message: `${updated.name} is now ${updated.enabled ? 'enabled' : 'disabled'}`,
      data: updated,
      allFeatures: allFlags,
    });
  } catch (err: any) {
    console.error('Failed to update feature flag:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: err?.message || 'Failed to update feature flag' },
    });
  }
});

// ==============================================================================
// 3. PUT /api/features - Bulk update multiple feature flags (Admin Only)
// ==============================================================================
router.put('/', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { features } = req.body as {
      features?: Array<{ key: string; enabled: boolean; disabledMessage?: string }>;
    };

    if (!Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Expected a non-empty "features" array' },
      });
    }

    const invalidKeys = features
      .filter((item) => !item || typeof item.key !== 'string' || !isValidFeatureKey(item.key))
      .map((item) => item?.key);

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FEATURE_KEY', message: 'One or more invalid feature keys provided' },
      });
    }

    const actorName = req.user?.name || 'Department Admin';
    const updatedAll = bulkUpdateFeatureFlags(features, actorName);

    recordFeatureAudit(
      req.user,
      'FEATURES_BULK_UPDATED',
      'feature_flags',
      `Updated ${features.length} portal feature toggle(s)`
    );

    return res.json({
      success: true,
      message: `Updated ${features.length} feature(s) successfully`,
      data: updatedAll,
    });
  } catch (err: any) {
    console.error('Failed to bulk update feature flags:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'BULK_UPDATE_ERROR', message: err?.message || 'Failed to update features' },
    });
  }
});

// ==============================================================================
// 4. POST /api/features/reset - Enable all features back to default (Admin Only)
// ==============================================================================
router.post('/reset', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actorName = req.user?.name || 'Department Admin';
    const flags = resetFeatureFlags(actorName);

    recordFeatureAudit(
      req.user,
      'FEATURES_RESET',
      'feature_flags',
      `All ${flags.length} portal features were re-enabled to default state`
    );

    return res.json({
      success: true,
      message: 'All portal features have been enabled',
      data: flags,
    });
  } catch (err: any) {
    console.error('Failed to reset feature flags:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'RESET_ERROR', message: err?.message || 'Failed to reset feature flags' },
    });
  }
});

export default router;

import { Router, Response } from 'express';
import { optionalAuthToken, AuthenticatedRequest } from '../auth';

const router = Router();

/**
 * WhatsApp integration status & config - Disabled by Administrator
 */
router.get('/openwa-config', optionalAuthToken, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    disabled: true,
    gatewayUrl: '',
    apiKey: '',
    pendingQueue: [],
  });
});

router.post('/queue-ack', optionalAuthToken, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, disabled: true });
});

router.get('/status', optionalAuthToken, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    status: 'disabled',
    connected: false,
    disabled: true,
    openWaConfigured: false,
    hasApiKey: false,
    totalLogs: 0,
    message: 'WhatsApp messaging is disabled by administrator.',
  });
});

router.get('/logs', optionalAuthToken, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    count: 0,
    logs: [],
  });
});

router.post('/test', optionalAuthToken, async (_req: AuthenticatedRequest, res: Response) => {
  res.status(403).json({
    success: false,
    disabled: true,
    error: 'WhatsApp messages have been turned off by administrator.',
  });
});

router.post('/preview', optionalAuthToken, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    formattedText: '',
    groupShareUrl: '',
    disabled: true,
  });
});

export default router;

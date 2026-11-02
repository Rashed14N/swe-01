import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import {
  formatExamWhatsAppMessage,
  sendExamAnnouncementWhatsApp,
  normalizeWhatsAppPhone,
  generateWhatsAppGroupShareLink,
} from '../whatsappService';
import { whatsappBot } from '../whatsappBot';

const router = Router();

/**
 * GET /api/whatsapp/openwa-config
 * Provides the configured OpenWA local gateway URL, API key, and pending queue
 * so the user's browser (which runs on the same machine as localhost:2785) can directly
 * relay queued messages to http://localhost:2785/api/sessions/{sessionId}/messages/send-text
 */
router.get('/openwa-config', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const gatewayUrl = (process.env.WHATSAPP_GATEWAY_URL || process.env.WHATSAPP_API_URL || 'http://localhost:2785').trim();
  const apiKey = (process.env.WHATSAPP_API_KEY || '').trim();
  const botState = whatsappBot.getStatus();

  res.json({
    gatewayUrl,
    apiKey,
    pendingQueue: botState.pendingQueue || [],
  });
});

/**
 * POST /api/whatsapp/queue-ack
 * Marks queued messages as delivered by the browser's local OpenWA bridge
 */
router.post('/queue-ack', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const { deliveredIds, phone, courseCode, examType, messagePreview } = req.body;
  if (phone) {
    db.addWhatsAppLog({
      id: `owa-browser-${Date.now()}`,
      recipientPhone: String(phone),
      studentName: 'Delivered via Local OpenWA (localhost:2785)',
      courseCode: courseCode || 'SWE-211',
      examType: examType || 'Exam Notice',
      messagePreview: messagePreview || 'Dispatched via OpenWA localhost:2785',
      status: 'DELIVERED',
      gateway: 'OpenWA Local Gateway (http://localhost:2785)',
      timestamp: new Date().toISOString(),
    });
  }
  res.json({ success: true, deliveredIds });
});

/**
 * GET /api/whatsapp/status
 * Check OpenWA gateway configuration and status
 */
router.get('/status', verifyAuthToken, requireRole('CR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const gatewayUrl = (process.env.WHATSAPP_GATEWAY_URL || process.env.WHATSAPP_API_URL || 'http://localhost:2785').trim();
  const apiKey = (process.env.WHATSAPP_API_KEY || '').trim();
  const botState = whatsappBot.getStatus();

  res.json({
    ...botState,
    openWaConfigured: Boolean(gatewayUrl && apiKey),
    gatewayUrl,
    hasApiKey: Boolean(apiKey),
    totalLogs: db.getWhatsAppLogs().length,
  });
});

/**
 * GET /api/whatsapp/logs
 * Retrieve all automated delivery logs
 */
router.get('/logs', verifyAuthToken, requireRole('CR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = db.getWhatsAppLogs();
    res.json({
      success: true,
      count: logs.length,
      logs: [...logs].reverse(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve WhatsApp logs' });
  }
});

/**
 * POST /api/whatsapp/test
 * Sends a single test message via OpenWA / Bot and returns payload for browser-to-localhost relay
 */
router.post('/test', verifyAuthToken, requireRole('CR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { phone, courseCode, courseTitle, examType, date, title, description } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required for testing WhatsApp delivery.' });
  }

  const cleanPhone = normalizeWhatsAppPhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid phone number (e.g. 01765481645).' });
  }

  const result = await sendExamAnnouncementWhatsApp({
    to: cleanPhone,
    studentName: req.user?.name || 'Rashedul Hasan',
    courseCode: courseCode || 'SWE-211',
    courseTitle: courseTitle || 'Computer Architecture (CA)',
    examType: examType || 'Class Test / Midterm',
    examDate: date || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    examTime: '10:30 AM - 12:00 PM',
    room: 'Room 502, Academic Building',
    title: title || 'Cache Memory & Pipeline Architecture',
    description: description || 'Chapter 4 & 5: Pipelining Hazards and 4-Way Set Associative Cache Memory Problems.',
    batchName: req.user?.batchName || 'SWE 9th Batch',
    publisherName: `${req.user?.name || 'Admin'} (SWE Portal)`,
  });

  const gatewayUrl = (process.env.WHATSAPP_GATEWAY_URL || 'http://localhost:2785').trim();
  const apiKey = (process.env.WHATSAPP_API_KEY || '').trim();

  res.json({
    success: result.success,
    phone: cleanPhone,
    chatId: `${cleanPhone}@c.us`,
    messageText: result.messageText,
    gatewayUrl,
    apiKey,
    sentLive: result.sentLive,
    queued: result.queued,
    shareUrl: result.shareUrl,
    message: `WhatsApp message dispatched to ${cleanPhone} via OpenWA (${gatewayUrl})!`,
  });
});

/**
 * POST /api/whatsapp/preview
 */
router.post('/preview', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const {
    courseCode = 'SWE-211',
    courseTitle = 'Computer Architecture',
    examType = 'Midterm',
    examDate,
    examTime,
    room,
    title,
    description,
    batchName,
  } = req.body;

  const formattedText = formatExamWhatsAppMessage({
    to: '',
    courseCode,
    courseTitle,
    examType,
    examDate: examDate || new Date().toISOString().split('T')[0],
    examTime,
    room,
    title,
    description,
    batchName: batchName || 'SWE Department',
    publisherName: req.user?.name || 'Class Representative',
  });

  const groupShareUrl = generateWhatsAppGroupShareLink(formattedText);

  res.json({
    formattedText,
    groupShareUrl,
  });
});

export default router;

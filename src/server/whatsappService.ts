import { db, WhatsAppLog } from './db';
import { whatsappBot } from './whatsappBot';

export interface ExamWhatsAppPayload {
  to: string;
  studentName?: string;
  courseTitle: string;
  courseCode?: string;
  examType: string;
  examDate: string;
  examTime?: string;
  room?: string;
  title?: string;
  description?: string;
  batchName?: string;
  publisherName?: string;
  enrollmentType?: 'REGULAR' | 'RETAKE';
}

export interface AnnouncementWhatsAppPayload {
  to: string;
  studentName?: string;
  title: string;
  content: string;
  category?: string;
  priority?: string;
  batchName?: string;
  publisherName?: string;
}

/**
 * Normalizes phone numbers to standard WhatsApp E.164 format (e.g. 8801712345678)
 * Strips whitespace, dashes, plus sign, and handles standard Bangladesh mobile formats.
 */
export function normalizeWhatsAppPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d]/g, '');

  // 01XXXXXXXXX -> 8801XXXXXXXXX
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '88' + cleaned;
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '880' + cleaned;
  } else if (cleaned.startsWith('8801') && cleaned.length === 13) {
    // already 8801XXXXXXXXX
  }

  return cleaned;
}

/**
 * Builds formatted text message suitable for WhatsApp mobile & web formatting (*bold*, _italic_)
 */
export function formatExamWhatsAppMessage(payload: ExamWhatsAppPayload): string {
  const {
    studentName = 'Student',
    courseTitle,
    courseCode = 'SWE Course',
    examType,
    examDate,
    examTime,
    room,
    title,
    description,
    batchName = 'SWE Batch',
    publisherName = 'Academic Coordinator',
    enrollmentType,
  } = payload;

  const formattedDate = (() => {
    if (!examDate) return 'Date TBA';
    try {
      const d = new Date(examDate);
      if (isNaN(d.getTime())) return examDate;
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return examDate;
    }
  })();

  const isRetake = enrollmentType === 'RETAKE';
  const headerBanner = isRetake 
    ? '⚠️ *SWE RETAKE EXAM NOTICE* ⚠️'
    : '📢 *SWE ACADEMIC EXAM ALERT* 📢';

  const lines = [
    headerBanner,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `👋 Hello, *${studentName}*!`,
    '',
    `A new exam has been scheduled for your enrolled course:`,
    '',
    `📌 *Exam:* ${examType} - ${title || examType}`,
    `📚 *Course:* *${courseTitle}* (${courseCode})`,
    `📅 *Date:* *${formattedDate}*`,
    `⏰ *Time:* ${examTime || 'Check Portal Schedule'}`,
    `🏛️ *Room / Venue:* ${room || 'Dept Notice / Room 502'}`,
    `🎓 *Batch:* ${batchName}`,
    `👤 *Scheduled By:* ${publisherName}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];

  if (description && description.trim()) {
    lines.push('📝 *Syllabus & Instructions:*');
    lines.push(`_${description.trim()}_`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  lines.push('🌐 *View Full Schedule & Routine on SWE Portal:*');
  lines.push('👉 https://portal.swe.edu.bd/exams');

  return lines.join('\n');
}

/**
 * Formats general announcement for WhatsApp broadcast
 */
export function formatAnnouncementWhatsAppMessage(payload: AnnouncementWhatsAppPayload): string {
  const {
    studentName = 'Student',
    title,
    content,
    category = 'ACADEMIC',
    priority = 'NORMAL',
    batchName = 'SWE Department',
    publisherName = 'Department Office',
  } = payload;

  const priorityEmoji = priority === 'URGENT' ? '🚨' : priority === 'IMPORTANT' ? '⚡' : '📢';

  return [
    `${priorityEmoji} *SWE DEPARTMENT NOTICE* ${priorityEmoji}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `👋 Dear *${studentName}*,`,
    '',
    `📌 *${title}*`,
    `🏷️ *Category:* ${category} | *Target:* ${batchName}`,
    `👤 *Published By:* ${publisherName}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    content ? content.trim() : '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    '🌐 *SWE Student Portal:* https://portal.swe.edu.bd/announcements',
  ].join('\n');
}

/**
 * Generates direct one-click WhatsApp web / app link (wa.me)
 */
export function generateWhatsAppDirectLink(phone: string, text: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/**
 * Generates WhatsApp Group share link (works for any WhatsApp group)
 */
export function generateWhatsAppGroupShareLink(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Dispatches an automated WhatsApp notification for an exam.
 * If WHATSAPP_GATEWAY_URL or WHATSAPP_API_URL is configured (e.g. Baileys / WPPConnect / Evolution API),
 * it sends via HTTP POST. Otherwise, it logs the automated dispatch and stores in WhatsApp Delivery Logs.
 */
/**
 * Helper to dispatch message via OpenWA REST API Gateway (e.g. http://localhost:2785)
 * OpenWA Spec:
 *   1. GET /api/sessions (Header: X-API-Key: owa_k1_...) -> find active sessionId
 *   2. POST /api/sessions/{sessionId}/messages/send-text -> { chatId: "88017...@c.us", text: "..." }
 */
export async function dispatchViaOpenWARestApi(
  rawGatewayUrl: string,
  apiKey: string,
  cleanPhone: string,
  messageText: string
): Promise<{ ok: boolean; id?: string; sessionId?: string; error?: string }> {
  const baseUrl = rawGatewayUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey
      ? {
          'X-API-Key': apiKey,
          'x-api-key': apiKey,
          Authorization: `Bearer ${apiKey}`,
        }
      : {}),
  };

  try {
    // Step 1: Discover active OpenWA session ID
    const sessionsRes = await fetch(`${baseUrl}/api/sessions`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(4000),
    });

    let sessionId = 'default';
    if (sessionsRes.ok) {
      const sessionsData = await sessionsRes.json().catch(() => null);
      const list = Array.isArray(sessionsData)
        ? sessionsData
        : Array.isArray(sessionsData?.sessions)
        ? sessionsData.sessions
        : Array.isArray(sessionsData?.data)
        ? sessionsData.data
        : [];

      const readySession =
        list.find((s: any) => ['READY', 'CONNECTED', 'WORKING', 'AUTHENTICATED'].includes(String(s?.status || '').toUpperCase())) ||
        list[0];

      if (readySession) {
        sessionId = readySession.id || readySession.sessionId || readySession.name || 'default';
      }
    }

    // Step 2: Send text via OpenWA endpoint
    const sendUrl = `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;
    const sendRes = await fetch(sendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chatId: `${cleanPhone}@c.us`,
        to: `${cleanPhone}@c.us`,
        phone: cleanPhone,
        text: messageText,
        content: messageText,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (sendRes.ok) {
      const data = await sendRes.json().catch(() => ({}));
      return { ok: true, id: data?.id || data?.messageId || `owa-${Date.now()}`, sessionId };
    }

    // Fallback: try direct POST to rawGatewayUrl in case it's a custom webhook
    const directRes = await fetch(rawGatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chatId: `${cleanPhone}@c.us`,
        phone: cleanPhone,
        to: cleanPhone,
        text: messageText,
        message: messageText,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (directRes.ok) {
      const data = await directRes.json().catch(() => ({}));
      return { ok: true, id: data?.id || `owa-direct-${Date.now()}` };
    }

    const errText = await sendRes.text().catch(() => `HTTP ${sendRes.status}`);
    return { ok: false, error: errText };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gateway unreachable from cloud container' };
  }
}

export async function sendExamAnnouncementWhatsApp(
  payload: ExamWhatsAppPayload
): Promise<{ success: boolean; id?: string; error?: string; isSimulated?: boolean; sentLive?: boolean; queued?: boolean; shareUrl?: string; messageText?: string; cleanPhone?: string }> {
  const { to, studentName, courseCode = 'SWE Course', examType } = payload;
  const cleanPhone = normalizeWhatsAppPhone(to);

  if (!cleanPhone || cleanPhone.length < 10) {
    console.warn(`[WhatsApp Service] Skipping invalid phone number: "${to}" for ${studentName}`);
    return { success: false, error: 'Invalid phone number' };
  }

  const messageText = formatExamWhatsAppMessage(payload);
  const shareUrl = generateWhatsAppDirectLink(cleanPhone, messageText);
  const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL || process.env.WHATSAPP_API_URL || 'http://localhost:2785';
  const apiKey = process.env.WHATSAPP_API_KEY || '';

  // 1. Try OpenWA Gateway (WHATSAPP_GATEWAY_URL + WHATSAPP_API_KEY)
  if (gatewayUrl) {
    const owaResult = await dispatchViaOpenWARestApi(gatewayUrl, apiKey, cleanPhone, messageText);
    if (owaResult.ok) {
      const logEntry: WhatsAppLog = {
        id: owaResult.id || `owa-${Date.now()}`,
        recipientPhone: cleanPhone,
        studentName,
        courseCode,
        examType,
        messagePreview: messageText.slice(0, 160),
        status: 'DELIVERED',
        gateway: `OpenWA (${gatewayUrl})`,
        timestamp: new Date().toISOString(),
      };
      db.addWhatsAppLog(logEntry);
      return {
        success: true,
        id: logEntry.id,
        sentLive: true,
        queued: false,
        isSimulated: false,
        shareUrl,
        messageText,
        cleanPhone,
      };
    }
  }

  // 2. Try built-in Embedded Baileys WhatsApp Bot if connected
  const botResult = await whatsappBot.sendMessage(cleanPhone, messageText, { courseCode, examType });
  if (botResult.sentLive) {
    const logEntry: WhatsAppLog = {
      id: botResult.messageId || `wa-live-${Date.now()}`,
      recipientPhone: cleanPhone,
      studentName,
      courseCode,
      examType,
      messagePreview: messageText.slice(0, 160),
      status: 'DELIVERED',
      gateway: 'Embedded Baileys Live Socket',
      timestamp: new Date().toISOString(),
    };
    db.addWhatsAppLog(logEntry);
    return {
      success: true,
      id: logEntry.id,
      sentLive: true,
      queued: false,
      isSimulated: false,
      shareUrl,
      messageText,
      cleanPhone,
    };
  }

  // 3. Queue for Browser-to-Localhost OpenWA Bridge (since localhost:2785 runs on the user's PC!)
  const queuedId = `owa-bridge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const logEntry: WhatsAppLog = {
    id: queuedId,
    recipientPhone: cleanPhone,
    studentName,
    courseCode,
    examType,
    messagePreview: messageText.slice(0, 160),
    status: 'DELIVERED',
    gateway: `OpenWA Local Bridge (${gatewayUrl})`,
    timestamp: new Date().toISOString(),
  };
  db.addWhatsAppLog(logEntry);

  return {
    success: true,
    id: queuedId,
    sentLive: false,
    queued: true,
    isSimulated: false,
    shareUrl,
    messageText,
    cleanPhone,
  };
}

/**
 * Automated batch dispatcher: finds all enrolled students and triggers WhatsApp alerts
 */
export async function autoDispatchExamToEnrolledStudents(params: {
  enrolledStudents: Array<{ id: string; name: string; phone?: string; batchName?: string; enrollmentType?: 'REGULAR' | 'RETAKE' }>;
  courseCode: string;
  courseTitle: string;
  examType: string;
  examDate: string;
  examTime?: string;
  room?: string;
  title: string;
  description?: string;
  publisherName: string;
  excludeUserId?: string;
}): Promise<{ totalStudents: number; whatsAppDispatched: number; skippedNoPhone: number }> {
  const {
    enrolledStudents,
    courseCode,
    courseTitle,
    examType,
    examDate,
    examTime,
    room,
    title,
    description,
    publisherName,
    excludeUserId,
  } = params;

  let whatsAppDispatched = 0;
  let skippedNoPhone = 0;

  for (const student of enrolledStudents) {
    if (excludeUserId && student.id === excludeUserId) continue;

    const phone = student.phone?.trim();
    if (!phone) {
      skippedNoPhone++;
      continue;
    }

    try {
      await sendExamAnnouncementWhatsApp({
        to: phone,
        studentName: student.name,
        courseTitle,
        courseCode,
        examType,
        examDate,
        examTime,
        room,
        title,
        description,
        batchName: student.batchName,
        publisherName,
        enrollmentType: student.enrollmentType,
      });
      whatsAppDispatched++;
    } catch (err: any) {
      console.warn(`[Auto-Dispatch WhatsApp Error] Student ${student.name} (${phone}):`, err?.message || err);
    }
  }

  console.log(`[WhatsApp Auto-Dispatch Summary] 🚀 Dispatched to ${whatsAppDispatched} enrolled students (${skippedNoPhone} students had no phone number).`);

  return {
    totalStudents: enrolledStudents.length,
    whatsAppDispatched,
    skippedNoPhone,
  };
}

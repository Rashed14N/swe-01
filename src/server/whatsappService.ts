import { db, WhatsAppLog } from './db';

export const WHATSAPP_ENABLED = false;

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

export function normalizeWhatsAppPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '88' + cleaned;
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '880' + cleaned;
  }
  return cleaned;
}

export function formatExamWhatsAppMessage(payload: ExamWhatsAppPayload): string {
  const {
    studentName = 'Student',
    courseTitle,
    courseCode = 'SWE Course',
    examType,
    examDate,
    title,
  } = payload;
  return `📢 SWE Alert: ${examType} - ${title} for ${courseTitle} (${courseCode}) on ${examDate}. (WhatsApp notifications disabled)`;
}

export function formatAnnouncementWhatsAppMessage(payload: AnnouncementWhatsAppPayload): string {
  return `📢 SWE Department Notice: ${payload.title}`;
}

export function generateWhatsAppDirectLink(phone: string, text: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function generateWhatsAppGroupShareLink(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export async function sendExamAnnouncementWhatsApp(
  _payload: ExamWhatsAppPayload
): Promise<{ success: boolean; id?: string; error?: string; isSimulated?: boolean; sentLive?: boolean; queued?: boolean; shareUrl?: string; messageText?: string; cleanPhone?: string }> {
  return {
    success: false,
    error: 'WhatsApp messages have been turned off by administrator',
  };
}

export async function sendAnnouncementWhatsApp(
  _payload: AnnouncementWhatsAppPayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  return {
    success: false,
    error: 'WhatsApp messages have been turned off by administrator',
  };
}

export async function autoDispatchExamToEnrolledStudents(params: {
  enrolledStudents: Array<{ id: string; name: string; phone?: string; batchName?: string; enrollmentType?: 'REGULAR' | 'RETAKE' }>;
  [key: string]: any;
}): Promise<{ totalStudents: number; whatsAppDispatched: number; skippedNoPhone: number }> {
  // Turned off - no WhatsApp messages sent
  return {
    totalStudents: params.enrolledStudents.length,
    whatsAppDispatched: 0,
    skippedNoPhone: 0,
  };
}

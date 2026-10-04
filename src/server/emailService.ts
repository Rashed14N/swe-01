import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface CourseUpdateEmailPayload {
  to: string;
  studentName?: string;
  courseCode: string;
  courseTitle: string;
  updateType: 'EXAM' | 'EXAM_UPDATED' | 'ANNOUNCEMENT' | 'ROUTINE';
  title: string;
  description?: string;
  date?: string;
  time?: string;
  room?: string;
  batchName?: string;
  actorName?: string;
}

function buildHtmlTemplate(payload: CourseUpdateEmailPayload, sandboxNote?: string): string {
  const {
    studentName = 'Student',
    courseCode,
    courseTitle,
    updateType,
    title,
    description,
    date,
    time,
    room,
    batchName,
    actorName = 'Course Representative (CR)',
  } = payload;

  const typeBadgeLabel =
    updateType === 'EXAM'
      ? '📅 New Exam / Quiz Scheduled'
      : updateType === 'EXAM_UPDATED'
      ? '🔄 Exam Schedule Updated'
      : updateType === 'ROUTINE'
      ? '⏰ Class Routine Updated'
      : '📢 New Course Announcement';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>[SWE Retake Alert] ${courseCode}: ${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background: linear-gradient(135deg, #0B2348 0%, #1e3a8a 100%); padding: 28px 24px; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); border-radius: 9999px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #ffffff; }
    .header p { margin: 0; font-size: 13px; color: #93c5fd; }
    .content { padding: 24px; }
    .greeting { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 16px; }
    .alert-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .alert-box.exam { background: #fffbeb; border-color: #fde68a; }
    .alert-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
    .detail-row { display: flex; font-size: 13px; margin-bottom: 6px; }
    .detail-label { font-weight: 600; color: #64748b; width: 110px; }
    .detail-value { font-weight: 700; color: #1e293b; flex: 1; }
    .desc { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; font-size: 13px; color: #475569; line-height: 1.5; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">${typeBadgeLabel}</div>
      <h1>${courseCode}: ${courseTitle}</h1>
      <p>Academic Retake & Improvement Real-time Portal Sync</p>
    </div>

    <div class="content">
      ${
        sandboxNote
          ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #1e40af; line-height: 1.5;">
              <strong>ℹ️ Resend Sandbox Notice:</strong> ${sandboxNote}
            </div>`
          : ''
      }
      <div class="greeting">Hello ${studentName},</div>
      <p style="font-size: 13px; color: #475569; margin: 0 0 16px 0;">
        An update was just published by <strong>${actorName}</strong> ${batchName ? `for <strong>${batchName}</strong>` : ''} regarding your retake course:
      </p>

      <div class="alert-box ${updateType.includes('EXAM') ? 'exam' : ''}">
        <div class="alert-title">${title}</div>
        ${date ? `<div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${date}</span></div>` : ''}
        ${time ? `<div class="detail-row"><span class="detail-label">Time:</span><span class="detail-value">${time}</span></div>` : ''}
        ${room ? `<div class="detail-row"><span class="detail-label">Room:</span><span class="detail-value">${room}</span></div>` : ''}
        ${batchName ? `<div class="detail-row"><span class="detail-label">Batch:</span><span class="detail-value">${batchName}</span></div>` : ''}
        ${description ? `<div class="desc">${description}</div>` : ''}
      </div>

      <p style="font-size: 12px; color: #64748b;">
        You received this notification because you are enrolled in <strong>${courseCode}</strong> in your SWE Academic Retake Desk. Your portal schedule and upcoming exams list have been automatically synchronized.
      </p>
    </div>

    <div class="footer">
      Department of Software Engineering • Academic Retake & Improvement Portal<br>
      Automated email notification powered by Resend
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends an email via Resend to a student registered for a retake/improvement course
 * whenever an update (such as an exam added by a CR or announcement) is published.
 */
export async function sendRetakeCourseUpdateEmail(payload: CourseUpdateEmailPayload): Promise<{ success: boolean; id?: string; error?: string; note?: string }> {
  const { to, courseCode, title } = payload;
  const resend = getResendClient();

  const subject = `[SWE Retake Alert] ${courseCode}: ${title}`;
  const htmlContent = buildHtmlTemplate(payload);

  if (!resend) {
    console.log(`[Resend Email Simulated] (RESEND_API_KEY not configured). Would send to: ${to}, Subject: "${subject}", Update: "${title}"`);
    return { success: true, id: 'simulated-resend-id' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SWE Retake Desk <onboarding@resend.dev>';

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html: htmlContent,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Resend error');
    }

    console.log(`[Resend Email Sent] Successfully sent update to ${to} (ID: ${result.data?.id})`);
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    const errorMessage = String(err?.message || err);
    console.warn(`[Resend Email Attempt Failed] for ${to}:`, errorMessage);

    // If Resend sandbox domain restricts recipients to account owner (e.g. rashedulhasanrashed0@gmail.com):
    const ownerEmail = 'rashedulhasanrashed0@gmail.com';
    const isSandboxRestriction =
      errorMessage.includes('only send testing emails to your own email address') ||
      errorMessage.includes('validation_error') ||
      errorMessage.includes('verify a domain');

    if (isSandboxRestriction && to.toLowerCase() !== ownerEmail.toLowerCase()) {
      try {
        console.log(`[Resend Fallback] Delivering notification to verified account owner (${ownerEmail}) with intended recipient: ${to}`);
        const fallbackNote = `Intended recipient was <strong>${to}</strong>. Delivered to registered Resend account (<code>${ownerEmail}</code>) because the default Resend sandbox domain (<code>onboarding@resend.dev</code>) restricts delivery to the verified account owner. To deliver directly to external inboxes like <code>${to}</code>, verify a custom domain at resend.com/domains.`;
        
        const fallbackHtml = buildHtmlTemplate(payload, fallbackNote);
        const fallbackSubject = `[SWE Retake Alert] (For ${to}) ${courseCode}: ${title}`;

        const fallbackResult = await resend.emails.send({
          from: fromEmail,
          to: [ownerEmail],
          subject: fallbackSubject,
          html: fallbackHtml,
        });

        if (fallbackResult.data?.id) {
          console.log(`[Resend Fallback Success] ID: ${fallbackResult.data.id}`);
          return {
            success: true,
            id: fallbackResult.data.id,
            note: `Delivered to verified Resend account (${ownerEmail}) for intended recipient (${to})`,
          };
        }
      } catch (fallbackErr: any) {
        console.error('[Resend Fallback Error]:', fallbackErr?.message || fallbackErr);
      }
    }

    return { success: false, error: errorMessage };
  }
}

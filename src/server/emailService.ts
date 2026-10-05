import { Resend } from 'resend';
import { db } from './db';
import { fetchAllUsers, fetchAllBatches, fetchAllCourses } from './supabaseData';

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

export interface ExamAnnouncementEmailPayload {
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
  <title>[SWE Alert] ${courseCode}: ${title}</title>
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
      <p>Academic Portal Real-time Course Sync</p>
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
        An update was published by <strong>${actorName}</strong> ${batchName ? `for <strong>${batchName}</strong>` : ''} regarding your course:
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
        You received this notification because you are enrolled in <strong>${courseCode}</strong> in the SWE Academic Portal.
      </p>
    </div>

    <div class="footer">
      Department of Software Engineering • Metropolitan University<br>
      Automated email notification powered by Resend
    </div>
  </div>
</body>
</html>
  `;
}

function buildExamAnnouncementHtml(payload: ExamAnnouncementEmailPayload, sandboxNote?: string): string {
  const {
    studentName = 'Student',
    courseTitle,
    courseCode,
    examType,
    examDate,
    examTime,
    room,
    title,
    description,
    batchName,
    publisherName = 'Course Representative / Academic Desk',
    enrollmentType = 'REGULAR',
  } = payload;

  const displayCode = courseCode ? `(${courseCode})` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>[SWE Exam Announcement] ${courseTitle}: ${examType} on ${examDate}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0A2147 0%, #1e3a8a 100%); padding: 32px 28px; color: #ffffff; text-align: left; }
    .badge { display: inline-block; background: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.4); color: #fecaca; border-radius: 9999px; padding: 4px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; color: #93c5fd; }
    .content { padding: 28px; }
    .greeting { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 14px; }
    .intro-text { font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
    
    .exam-card { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 22px; }
    .exam-card.highlight { border-color: #2563eb; background: #f0f7ff; }
    .exam-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .exam-table tr td { padding: 8px 6px; font-size: 13px; vertical-align: top; }
    .label-col { width: 125px; font-weight: 700; color: #475569; }
    .value-col { font-weight: 700; color: #0f172a; }
    .type-pill { display: inline-block; background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; font-weight: 800; font-size: 11px; padding: 2px 10px; border-radius: 6px; text-transform: uppercase; }
    .date-highlight { color: #dc2626; font-size: 14px; font-weight: 800; }
    
    .desc-box { margin-top: 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #334155; line-height: 1.6; }
    .enrollment-notice { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #475569; line-height: 1.5; margin-bottom: 20px; }
    
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">🚨 OFFICIAL EXAM ANNOUNCEMENT</div>
      <h1>${courseTitle} ${displayCode}</h1>
      <p>Metropolitan University • Department of Software Engineering</p>
    </div>

    <div class="content">
      ${
        sandboxNote
          ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 14px; margin-bottom: 18px; font-size: 12px; color: #1e40af; line-height: 1.5;">
              <strong>ℹ️ Resend Sandbox Notice:</strong> ${sandboxNote}
            </div>`
          : ''
      }
      <div class="greeting">Hello ${studentName},</div>
      <p class="intro-text">
        An official <strong>${examType}</strong> announcement has been published by <strong>${publisherName}</strong> for your enrolled course:
      </p>

      <div class="exam-card highlight">
        <table class="exam-table">
          <tr>
            <td class="label-col">Course Title:</td>
            <td class="value-col"><strong>${courseTitle} ${displayCode}</strong></td>
          </tr>
          <tr>
            <td class="label-col">Exam Type:</td>
            <td class="value-col"><span class="type-pill">${examType}</span></td>
          </tr>
          <tr>
            <td class="label-col">Exam Date:</td>
            <td class="value-col"><span class="date-highlight">📅 ${examDate}</span></td>
          </tr>
          ${examTime ? `
          <tr>
            <td class="label-col">Exam Time:</td>
            <td class="value-col">⏰ ${examTime}</td>
          </tr>` : ''}
          ${room ? `
          <tr>
            <td class="label-col">Room / Venue:</td>
            <td class="value-col">🏛️ ${room}</td>
          </tr>` : ''}
          ${batchName ? `
          <tr>
            <td class="label-col">Batch:</td>
            <td class="value-col">${batchName}</td>
          </tr>` : ''}
          ${title && title !== examType ? `
          <tr>
            <td class="label-col">Announcement:</td>
            <td class="value-col">${title}</td>
          </tr>` : ''}
        </table>

        ${description ? `
        <div class="desc-box">
          <strong style="display:block; margin-bottom: 4px; color: #1e293b;">📋 Instructions & Notes:</strong>
          <div>${description}</div>
        </div>` : ''}
      </div>

      <div class="enrollment-notice">
        📌 <strong>Enrolled Course Notice:</strong> You received this email notification via <strong>Resend</strong> because you are currently enrolled in <strong>${courseTitle} ${displayCode}</strong> (${enrollmentType === 'RETAKE' ? 'Retake / Improvement Registration' : 'Active Batch Enrollment'}).
      </div>
    </div>

    <div class="footer">
      Department of Software Engineering • Metropolitan University<br>
      Automated Exam Alert Notification Service • Powered by Resend
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends an email via Resend to a student registered for a retake/improvement course
 */
export async function sendRetakeCourseUpdateEmail(payload: CourseUpdateEmailPayload): Promise<{ success: boolean; id?: string; error?: string; note?: string }> {
  const { to, courseCode, title } = payload;
  const resend = getResendClient();

  const subject = `[SWE Alert] ${courseCode}: ${title}`;
  const htmlContent = buildHtmlTemplate(payload);

  if (!resend) {
    console.log(`[Resend Email Simulated] (RESEND_API_KEY not configured). Would send to: ${to}, Subject: "${subject}", Update: "${title}"`);
    return { success: true, id: 'simulated-resend-id' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SWE Academic Desk <onboarding@resend.dev>';

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
        const fallbackSubject = `[SWE Alert] (For ${to}) ${courseCode}: ${title}`;

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

/**
 * Sends an official Exam Announcement email via Resend to ANY student enrolled in the course.
 * Contains:
 * - Course Title
 * - Exam Type
 * - Exam Date
 * - Exam Time / Room / Description
 */
export async function sendExamAnnouncementEmail(payload: ExamAnnouncementEmailPayload): Promise<{ success: boolean; id?: string; error?: string; note?: string }> {
  const { to, courseTitle, courseCode, examType, examDate } = payload;
  const resend = getResendClient();

  const displayCourse = courseCode ? `${courseTitle} (${courseCode})` : courseTitle;
  const subject = `[SWE Exam Announcement] ${displayCourse}: ${examType} on ${examDate}`;
  const htmlContent = buildExamAnnouncementHtml(payload);

  if (!resend) {
    console.log(`[Resend Exam Email Simulated] (RESEND_API_KEY not configured). Would send to: ${to}, Subject: "${subject}"`);
    return { success: true, id: 'simulated-resend-id' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SWE Academic Desk <onboarding@resend.dev>';

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

    console.log(`[Resend Exam Email Sent] Successfully sent exam alert to ${to} (ID: ${result.data?.id})`);
    return { success: true, id: result.data?.id };
  } catch (err: any) {
    const errorMessage = String(err?.message || err);
    console.warn(`[Resend Exam Email Attempt Failed] for ${to}:`, errorMessage);

    const ownerEmail = 'rashedulhasanrashed0@gmail.com';
    const isSandboxRestriction =
      errorMessage.includes('only send testing emails to your own email address') ||
      errorMessage.includes('validation_error') ||
      errorMessage.includes('verify a domain');

    if (isSandboxRestriction && to.toLowerCase() !== ownerEmail.toLowerCase()) {
      try {
        console.log(`[Resend Fallback] Delivering exam alert to verified account owner (${ownerEmail}) with intended recipient: ${to}`);
        const fallbackNote = `Intended recipient was <strong>${to}</strong>. Delivered to registered Resend account (<code>${ownerEmail}</code>) because the default Resend sandbox domain (<code>onboarding@resend.dev</code>) restricts delivery to the verified account owner. To deliver directly to external inboxes like <code>${to}</code>, verify a custom domain at resend.com/domains.`;
        
        const fallbackHtml = buildExamAnnouncementHtml(payload, fallbackNote);
        const fallbackSubject = `[SWE Exam Alert] (For ${to}) ${displayCourse}: ${examType} on ${examDate}`;

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

/**
 * Resolves all students enrolled in a course:
 * 1. Primary batch students taking the semester course
 * 2. Retake / Improvement students registered for this course
 */
export async function getEnrolledStudentsForCourse(params: {
  courseCode?: string;
  courseTitle?: string;
  courseId?: string;
  batchId?: string;
}): Promise<Array<{ id: string; name: string; email: string; enrollmentType: 'REGULAR' | 'RETAKE'; batchName?: string }>> {
  const { courseCode, courseTitle, courseId, batchId } = params;
  const normalize = (v?: string) => (v || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const codeNorm = normalize(courseCode);
  const titleNorm = normalize(courseTitle);

  const [allUsers, allBatches, allCourses] = await Promise.all([
    fetchAllUsers().catch(() => []),
    fetchAllBatches().catch(() => db.getBatches()),
    fetchAllCourses().catch(() => db.getCourses()),
  ]);

  // Find target course from catalog if possible
  const matchedCourse = allCourses.find(c =>
    (courseId && c.id === courseId) ||
    (codeNorm && (normalize(c.code) === codeNorm || normalize(c.shortName) === codeNorm)) ||
    (titleNorm && normalize(c.title).includes(titleNorm))
  );

  const targetCourseSemester = matchedCourse?.semester;
  const enrolledStudentsMap = new Map<string, { id: string; name: string; email: string; enrollmentType: 'REGULAR' | 'RETAKE'; batchName?: string }>();

  // 1. Regular Batch Enrollment
  // Match active students in the target batch or batches in this semester
  for (const user of allUsers) {
    if (user.role !== 'STUDENT' || user.status === 'DISABLED' || !user.email) continue;

    let isEnrolledInBatch = false;
    const userBatch = allBatches.find(b => b.id === user.batchId);

    if (batchId && batchId !== 'ALL') {
      if (user.batchId === batchId) {
        isEnrolledInBatch = true;
      }
    } else if (targetCourseSemester !== undefined) {
      const activeSem = userBatch?.currentSemester ?? user.currentSemester;
      if (activeSem === targetCourseSemester) {
        isEnrolledInBatch = true;
      }
    } else if (matchedCourse?.batchIds && user.batchId) {
      if (matchedCourse.batchIds.includes(user.batchId)) {
        isEnrolledInBatch = true;
      }
    }

    if (isEnrolledInBatch) {
      enrolledStudentsMap.set(user.email.toLowerCase(), {
        id: user.id,
        name: user.name,
        email: user.email.trim(),
        enrollmentType: 'REGULAR',
        batchName: userBatch?.name || user.batchName,
      });
    }
  }

  // 2. Retake / Improvement Students enrolled in this course
  try {
    const allRetakes = db.getRetakes?.() || [];
    for (const retake of allRetakes) {
      if (retake.status === 'DROPPED') continue;

      const rCode = normalize(retake.courseCode);
      const rTitle = normalize(retake.courseTitle);

      const matches =
        (courseId && retake.courseId && retake.courseId === courseId) ||
        (codeNorm && rCode && (codeNorm === rCode || codeNorm.includes(rCode) || rCode.includes(codeNorm))) ||
        (titleNorm && rTitle && (titleNorm.includes(rTitle) || rTitle.includes(titleNorm)));

      if (matches) {
        const studentUser = allUsers.find(u => u.id === retake.studentId);
        const email = (retake.studentEmail || studentUser?.email || '').trim();
        if (email) {
          enrolledStudentsMap.set(email.toLowerCase(), {
            id: retake.studentId,
            name: retake.studentName || studentUser?.name || 'Student',
            email,
            enrollmentType: 'RETAKE',
            batchName: retake.retakeBatchName || 'Retake Desk',
          });
        }
      }
    }
  } catch (e) {
    console.warn('[getEnrolledStudentsForCourse] Retake check error:', e);
  }

  return Array.from(enrolledStudentsMap.values());
}

import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Batch, BatchProgressionItem, SemesterProgressionPreview } from '../../types';
import { syncToSupabase } from '../supabaseSync';

const router = Router();

// GET /api/batches/progression-preview (Admin preview before advancing sequence batches)
router.get('/progression-preview', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const allBatches = data.batches || [];
  const allUsers = data.users || [];

  const sequenceBatches: BatchProgressionItem[] = [];
  const manualBatches: BatchProgressionItem[] = [];

  let mostRecentProgression: string | null = null;

  allBatches.forEach(b => {
    const isSequence = (b.semesterMode || 'SEQUENCE') === 'SEQUENCE';
    const status = b.status || (b.currentSemester > 8 ? 'GRADUATED' : 'ACTIVE');
    const studentsCount = allUsers.filter(u => u.batchId === b.id).length;
    
    if (b.lastProgressedAt) {
      if (!mostRecentProgression || new Date(b.lastProgressedAt) > new Date(mostRecentProgression)) {
        mostRecentProgression = b.lastProgressedAt;
      }
    }

    if (isSequence) {
      const isEligible = status === 'ACTIVE';
      const nextSem = b.currentSemester + 1;
      const willGraduate = nextSem > 8;

      sequenceBatches.push({
        id: b.id,
        name: b.name,
        admissionYear: b.admissionYear,
        academicSession: b.academicSession,
        semesterMode: 'SEQUENCE',
        status,
        currentSemester: b.currentSemester,
        nextSemester: isEligible ? nextSem : b.currentSemester,
        willGraduate,
        affected: isEligible,
        reason: isEligible ? undefined : `Batch status is ${status}`,
        studentsCount,
        lastProgressedAt: b.lastProgressedAt,
      });
    } else {
      manualBatches.push({
        id: b.id,
        name: b.name,
        admissionYear: b.admissionYear,
        academicSession: b.academicSession,
        semesterMode: 'MANUAL',
        status,
        currentSemester: b.currentSemester,
        nextSemester: b.currentSemester,
        willGraduate: false,
        affected: false,
        reason: 'Manual Batch Mode (Excluded from sequence progression)',
        studentsCount,
        lastProgressedAt: b.lastProgressedAt,
      });
    }
  });

  // Sort sequence batches (e.g. 8th, 9th, 10th, 11th, 12th)
  sequenceBatches.sort((a, b) => a.admissionYear - b.admissionYear || a.name.localeCompare(b.name));
  manualBatches.sort((a, b) => a.admissionYear - b.admissionYear || a.name.localeCompare(b.name));

  // Determine if recent progression occurred (within last 24 hours)
  const isRecent = mostRecentProgression
    ? (Date.now() - new Date(mostRecentProgression).getTime()) < 24 * 60 * 60 * 1000
    : false;

  const preview: SemesterProgressionPreview = {
    sequenceBatches,
    manualBatches,
    totalAffected: sequenceBatches.filter(s => s.affected).length,
    lastProgressedAt: mostRecentProgression,
    isRecent,
    lastProgressedDetails: mostRecentProgression
      ? `Last cycle progression was executed on ${new Date(mostRecentProgression).toLocaleString()}`
      : undefined,
  };

  res.json(preview);
});

// POST /api/batches/advance-sequence (Admin manual trigger to advance all SEQUENCE batches)
router.post('/advance-sequence', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { forceConfirm, notes } = req.body || {};
  const data = db.getData();
  const allBatches = data.batches || [];
  const allUsers = data.users || [];

  // 1. Check for recent progression warning
  let mostRecentProgression: string | null = null;
  allBatches.forEach(b => {
    if (b.lastProgressedAt) {
      if (!mostRecentProgression || new Date(b.lastProgressedAt) > new Date(mostRecentProgression)) {
        mostRecentProgression = b.lastProgressedAt;
      }
    }
  });

  const isRecent = mostRecentProgression
    ? (Date.now() - new Date(mostRecentProgression).getTime()) < 24 * 60 * 60 * 1000
    : false;

  if (isRecent && !forceConfirm) {
    return res.status(400).json({
      error: 'RECENT_PROGRESSION_WARNING',
      message: `Warning: The semester was already advanced recently on ${new Date(mostRecentProgression!).toLocaleString()}. Advancing again will increment all sequence batches by another semester. Please check "Confirm double progression" to proceed.`,
      lastProgressedAt: mostRecentProgression,
    });
  }

  // 2. Identify active sequence batches
  const affectedList: Array<{
    batchId: string;
    batchName: string;
    previousSemester: number;
    newSemester: number;
    studentsUpdated: number;
  }> = [];

  const nowIso = new Date().toISOString();
  let totalUsersUpdated = 0;

  for (const batch of allBatches) {
    const isSequence = (batch.semesterMode || 'SEQUENCE') === 'SEQUENCE';
    const isActive = (batch.status || 'ACTIVE') === 'ACTIVE';

    if (isSequence && isActive) {
      const prevSemester = batch.currentSemester;
      const nextSemester = prevSemester + 1;

      batch.currentSemester = nextSemester;
      batch.lastProgressedAt = nowIso;

      if (nextSemester > 8) {
        batch.status = 'GRADUATED';
      }

      // Update all students in this batch
      const studentsInBatch = allUsers.filter(u => u.batchId === batch.id);
      studentsInBatch.forEach(student => {
        student.currentSemester = nextSemester;
        student.updatedAt = nowIso;
        totalUsersUpdated++;
      });

      affectedList.push({
        batchId: batch.id,
        batchName: batch.name,
        previousSemester: prevSemester,
        newSemester: nextSemester,
        studentsUpdated: studentsInBatch.length,
      });
    }
  }

  if (affectedList.length === 0) {
    return res.status(400).json({
      error: 'NO_ACTIVE_SEQUENCE_BATCHES',
      message: 'No active SEQUENCE batches found to advance.',
    });
  }

  // 3. Save database state
  db.save();

  // 4. Record detailed audit log
  const auditDetails = `Advanced ${affectedList.length} sequence batches: ${affectedList.map(a => `${a.batchName} (Sem ${a.previousSemester}→${a.newSemester})`).join(', ')}. Manual batches (5th, 6th, 7th) skipped.${notes ? ` Note: ${notes}` : ''}`;

  db.addAuditLog(
    req.user!.id,
    req.user!.name,
    'SEMESTER_PROGRESSION_ADVANCED',
    'Academic Sequence Batches',
    auditDetails
  );

  // 5. Trigger Supabase sync in background
  try {
    const batchRows = data.batches.map(b => ({
      id: b.id,
      name: b.name,
      admission_year: b.admissionYear,
      current_semester: b.currentSemester,
      academic_session: b.academicSession,
      semester_mode: b.semesterMode || 'SEQUENCE',
      status: b.status || 'ACTIVE',
      last_progressed_at: b.lastProgressedAt,
      cr_ids: b.crIds || [],
      created_at: b.createdAt,
    }));
    await syncToSupabase('batches', batchRows);

    const userRows = data.users.map(u => ({
      id: u.id,
      student_id: u.studentId,
      name: u.name,
      email: u.email,
      role: u.role,
      batch_id: u.batchId,
      batch_name: u.batchName,
      current_semester: u.currentSemester,
      status: u.status,
      updated_at: u.updatedAt,
    }));
    await syncToSupabase('users', userRows);
  } catch (syncErr) {
    console.warn('[Progression Supabase Sync Warning]:', syncErr);
  }

  res.json({
    success: true,
    message: `🎉 Successfully advanced ${affectedList.length} sequence batches to their next academic semester!`,
    affectedBatches: affectedList,
    totalUsersUpdated,
    timestamp: nowIso,
  });
});

// GET /api/batches (Admin gets all, Student/CR gets list or own batch)
router.get('/', optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json({ batches: data.batches || [] });
});

// GET /api/batches/:id (Enforce Batch Isolation for student/CR!)
router.get('/:id', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.id;
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  // Batch isolation check
  if (req.user.role !== 'ADMIN' && req.user.batchId !== batchId) {
    return res.status(403).json({
      error: '403 Forbidden: You do not have permission to access another batch\'s private information.',
    });
  }

  const batch = db.getData().batches.find(b => b.id === batchId);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const data = db.getData();
  const students = data.users.filter(u => u.batchId === batchId);
  const crs = students.filter(u => u.role === 'CR' || (batch.crIds && batch.crIds.includes(u.id)));
  const courses = data.courses.filter(c => c.batchIds?.includes(batchId) || c.semester === batch.currentSemester);
  const routines = data.routines.filter(r => r.batchId === batchId);
  const exams = data.exams.filter(e => e.batchId === batchId);
  const announcements = data.announcements.filter(a => a.batchId === batchId);

  res.json({ batch, students, crs, courses, routines, exams, announcements });
});

// POST /api/batches (Admin only)
router.post('/', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { name, admissionYear, currentSemester, academicSession, semesterMode, status } = req.body;

  if (!name || !admissionYear || !currentSemester) {
    return res.status(400).json({ error: 'Name, admission year, and current semester are required' });
  }

  const newBatch: Batch = {
    id: `batch-${Date.now()}`,
    name,
    admissionYear: Number(admissionYear),
    currentSemester: Number(currentSemester),
    academicSession: academicSession || `${admissionYear}-${Number(admissionYear) + 1}`,
    semesterMode: (semesterMode === 'MANUAL' ? 'MANUAL' : 'SEQUENCE'),
    status: (status || 'ACTIVE'),
    crIds: [],
    createdAt: new Date().toISOString(),
  };

  db.getData().batches.push(newBatch);
  db.save();

  syncToSupabase('batches', {
    id: newBatch.id,
    name: newBatch.name,
    admission_year: newBatch.admissionYear,
    current_semester: newBatch.currentSemester,
    academic_session: newBatch.academicSession,
    semester_mode: newBatch.semesterMode,
    status: newBatch.status,
    cr_ids: newBatch.crIds || [],
    created_at: newBatch.createdAt,
  }).catch(err => console.error('[Supabase Batch Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_CREATED', `${newBatch.name} (${newBatch.semesterMode})`);

  res.status(201).json({ batch: newBatch });
});

// PUT /api/batches/:id (Admin only)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.id;
  const { name, admissionYear, currentSemester, academicSession, semesterMode, status, crIds, syncStudentsSemester } = req.body;

  const data = db.getData();
  const batchIndex = data.batches.findIndex(b => b.id === batchId);
  if (batchIndex === -1) return res.status(404).json({ error: 'Batch not found' });

  const oldBatch = data.batches[batchIndex];
  const updatedSemester = currentSemester !== undefined ? Number(currentSemester) : oldBatch.currentSemester;

  const updated: Batch = {
    ...oldBatch,
    name: name ?? oldBatch.name,
    admissionYear: admissionYear ? Number(admissionYear) : oldBatch.admissionYear,
    currentSemester: updatedSemester,
    academicSession: academicSession ?? oldBatch.academicSession,
    semesterMode: semesterMode ?? oldBatch.semesterMode ?? 'SEQUENCE',
    status: status ?? oldBatch.status ?? 'ACTIVE',
    crIds: crIds ?? oldBatch.crIds,
  };

  data.batches[batchIndex] = updated;

  // If semester changed or sync requested, update all students in this batch
  if (syncStudentsSemester || (currentSemester !== undefined && Number(currentSemester) !== oldBatch.currentSemester)) {
    const studentsInBatch = data.users.filter(u => u.batchId === batchId);
    studentsInBatch.forEach(u => {
      u.currentSemester = updatedSemester;
      u.updatedAt = new Date().toISOString();
    });
  }

  db.save();

  syncToSupabase('batches', {
    id: updated.id,
    name: updated.name,
    admission_year: updated.admissionYear,
    current_semester: updated.currentSemester,
    academic_session: updated.academicSession,
    semester_mode: updated.semesterMode,
    status: updated.status,
    cr_ids: updated.crIds || [],
  }).catch(err => console.error('[Supabase Batch Update Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_UPDATED', `${updated.name} (${updated.semesterMode}, Sem ${updated.currentSemester})`);

  res.json({ batch: updated });
});

export default router;

import { Router, Response } from 'express';
<<<<<<< HEAD
import { db } from '../db.ts';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { Batch, BatchProgressionItem, SemesterProgressionPreview } from '../../types.ts';
=======
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Batch, BatchProgressionItem, SemesterProgressionPreview } from '../../types';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
import {
  fetchAllBatches,
  fetchBatchById,
  createBatchInDB,
  updateBatchInDB,
  fetchAllUsers,
  fetchAllCourses,
  fetchAllRoutineSlots,
  fetchAllExams,
  fetchAllAnnouncements,
  updateUserInDB,
<<<<<<< HEAD
} from '../supabaseData.ts';
=======
} from '../supabaseData';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

const router = Router();

// GET /api/batches/progression-preview (Admin preview before advancing sequence batches)
router.get('/progression-preview', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [allBatches, allUsers] = await Promise.all([
      fetchAllBatches(),
      fetchAllUsers(),
    ]);

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

    sequenceBatches.sort((a, b) => a.admissionYear - b.admissionYear || a.name.localeCompare(b.name));
    manualBatches.sort((a, b) => a.admissionYear - b.admissionYear || a.name.localeCompare(b.name));

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
  } catch (err: any) {
    console.error('[Batches API GET /progression-preview Error]:', err);
    res.status(500).json({ error: 'Failed to load progression preview' });
  }
});

// POST /api/batches/advance-sequence (Admin manual trigger to advance all SEQUENCE batches)
router.post('/advance-sequence', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { forceConfirm, notes } = req.body || {};

  try {
    const [allBatches, allUsers] = await Promise.all([
      fetchAllBatches(),
      fetchAllUsers(),
    ]);

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

        const updatedStatus = nextSemester > 8 ? 'GRADUATED' : 'ACTIVE';

        await updateBatchInDB(batch.id, {
          currentSemester: nextSemester,
          lastProgressedAt: nowIso,
          status: updatedStatus,
        });

        const studentsInBatch = allUsers.filter(u => u.batchId === batch.id);
        for (const student of studentsInBatch) {
          await updateUserInDB(student.id, {
            currentSemester: nextSemester,
          });
          totalUsersUpdated++;
        }

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

    const auditDetails = `Advanced ${affectedList.length} sequence batches: ${affectedList.map(a => `${a.batchName} (Sem ${a.previousSemester}→${a.newSemester})`).join(', ')}. Manual batches skipped.${notes ? ` Note: ${notes}` : ''}`;

    db.addAuditLog(
      req.user!.id,
      req.user!.name,
      'SEMESTER_PROGRESSION_ADVANCED',
      'Academic Sequence Batches',
      auditDetails
    );

    res.json({
      success: true,
      message: `Successfully advanced ${affectedList.length} sequence batches to their next academic semester!`,
      affectedBatches: affectedList,
      totalUsersUpdated,
      timestamp: nowIso,
    });
  } catch (err: any) {
    console.error('[Batches API POST /advance-sequence Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to advance sequence batches' });
  }
});

// GET /api/batches
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await fetchAllBatches();
    res.json({ batches });
  } catch (err: any) {
    console.error('[Batches API GET / Error]:', err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// GET /api/batches/:id (Enforce Batch Isolation for student/CR!)
router.get('/:id', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.id;
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.user.role !== 'ADMIN' && req.user.batchId !== batchId) {
    return res.status(403).json({
      error: '403 Forbidden: You do not have permission to access another batch\'s private information.',
    });
  }

  try {
    const batch = await fetchBatchById(batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const [allUsers, allCourses, allRoutines, allExams, allAnnouncements] = await Promise.all([
      fetchAllUsers(),
      fetchAllCourses(),
      fetchAllRoutineSlots(batchId),
      fetchAllExams(batchId),
      fetchAllAnnouncements(batchId),
    ]);

    const students = allUsers.filter(u => u.batchId === batchId);
    const crs = students.filter(u => u.role === 'CR' || (batch.crIds && batch.crIds.includes(u.id)));
    const courses = allCourses.filter(c => c.batchIds?.includes(batchId) || c.semester === batch.currentSemester);

    res.json({ batch, students, crs, courses, routines: allRoutines, exams: allExams, announcements: allAnnouncements });
  } catch (err: any) {
    console.error(`[Batches API GET /:id Error]:`, err);
    res.status(500).json({ error: 'Failed to fetch batch data' });
  }
});

// POST /api/batches (Admin only)
router.post('/', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, admissionYear, currentSemester, academicSession, semesterMode, status } = req.body;

  if (!name || !admissionYear || !currentSemester) {
    return res.status(400).json({ error: 'Name, admission year, and current semester are required' });
  }

  try {
    const newBatch: Batch = {
      id: `batch-${Date.now()}`,
      name: String(name).trim(),
      admissionYear: Number(admissionYear),
      currentSemester: Number(currentSemester),
      academicSession: academicSession || `${admissionYear}-${Number(admissionYear) + 1}`,
      semesterMode: semesterMode === 'MANUAL' ? 'MANUAL' : 'SEQUENCE',
      status: status || 'ACTIVE',
      crIds: [],
      createdAt: new Date().toISOString(),
    };

    const created = await createBatchInDB(newBatch);
    db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_CREATED', `${created.name} (${created.semesterMode})`);

    res.status(201).json({ batch: created });
  } catch (err: any) {
    console.error('[Batches API POST / Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error creating batch' });
  }
});

// PUT /api/batches/:id (Admin only)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.id;
  const { name, admissionYear, currentSemester, academicSession, semesterMode, status, crIds, syncStudentsSemester } = req.body;

  try {
    const oldBatch = await fetchBatchById(batchId);
    if (!oldBatch) return res.status(404).json({ error: 'Batch not found' });

    const updatedSemester = currentSemester !== undefined ? Number(currentSemester) : oldBatch.currentSemester;

    const updates: Partial<Batch> = {
      name: name !== undefined ? String(name).trim() : oldBatch.name,
      admissionYear: admissionYear !== undefined ? Number(admissionYear) : oldBatch.admissionYear,
      currentSemester: updatedSemester,
      academicSession: academicSession !== undefined ? academicSession : oldBatch.academicSession,
      semesterMode: semesterMode !== undefined ? semesterMode : oldBatch.semesterMode || 'SEQUENCE',
      status: status !== undefined ? status : oldBatch.status || 'ACTIVE',
      crIds: crIds !== undefined ? crIds : oldBatch.crIds,
    };

    const updated = await updateBatchInDB(batchId, updates);

    // If semester changed or sync requested, update all students in this batch
    if (syncStudentsSemester || (currentSemester !== undefined && Number(currentSemester) !== oldBatch.currentSemester)) {
      const allUsers = await fetchAllUsers();
      const studentsInBatch = allUsers.filter(u => u.batchId === batchId);
      for (const u of studentsInBatch) {
        await updateUserInDB(u.id, { currentSemester: updatedSemester });
      }
    }

    db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_UPDATED', `${updated.name} (${updated.semesterMode}, Sem ${updated.currentSemester})`);

    res.json({ batch: updated });
  } catch (err: any) {
    console.error(`[Batches API PUT /:id Error]:`, err);
    res.status(500).json({ error: err?.message || 'Server error updating batch' });
  }
});

export default router;

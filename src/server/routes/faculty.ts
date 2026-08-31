import { Router, Response } from 'express';
<<<<<<< HEAD
import { db } from '../db.ts';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { Faculty } from '../../types.ts';
=======
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Faculty } from '../../types';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
import {
  fetchAllFaculty,
  createFacultyInDB,
  updateFacultyInDB,
  deleteFacultyFromDB,
<<<<<<< HEAD
} from '../supabaseData.ts';
=======
} from '../supabaseData';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

const router = Router();

// GET /api/faculty (Public / All Users)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    let list = await fetchAllFaculty();

<<<<<<< HEAD
    if (search) {
      const q = (search as string).toLowerCase().trim();
      list = list.filter(
        f =>
          f.name.toLowerCase().includes(q) ||
          (f.shortName && f.shortName.toLowerCase().includes(q)) ||
          f.designation.toLowerCase().includes(q) ||
          (f.specialization && f.specialization.toLowerCase().includes(q)) ||
          f.email.toLowerCase().includes(q)
      );
    }

    res.json({ faculty: list });
  } catch (err: any) {
    console.error('[Faculty API GET / Error]:', err);
    res.status(500).json({ error: 'Failed to fetch faculty' });
=======
    if (!Array.isArray(list)) {
      list = [];
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      list = list.filter(f => {
        if (!f) return false;
        const name = (f.name || '').toLowerCase();
        const shortName = (f.shortName || '').toLowerCase();
        const designation = (f.designation || '').toLowerCase();
        const specialization = (f.specialization || '').toLowerCase();
        const email = (f.email || '').toLowerCase();
        return (
          name.includes(q) ||
          shortName.includes(q) ||
          designation.includes(q) ||
          specialization.includes(q) ||
          email.includes(q)
        );
      });
    }

    return res.json({ faculty: list });
  } catch (err: any) {
    console.error({
      route: '/api/faculty',
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || err?.details || null,
    });
    const fallbackList = (db.getData()?.faculty) || [];
    return res.status(200).json({ faculty: fallbackList });
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  }
});

// POST /api/faculty (Admin Only)
router.post('/', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;

<<<<<<< HEAD
    if (!name || !designation || !email) {
      return res.status(400).json({ error: 'Name, designation, and email are required' });
=======
    if (!name || !designation) {
      return res.status(400).json({ error: 'Name and designation are required' });
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    }

    const calculatedShortName = (shortName && String(shortName).trim()) 
      ? String(shortName).trim().toUpperCase() 
      : name.split(' ').filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 4);

    const newFaculty: Faculty = {
      id: `fac-${Date.now()}`,
      name: String(name).trim(),
      shortName: calculatedShortName || 'FAC',
      designation: String(designation).trim(),
      department: department ? String(department).trim() : 'Software Engineering',
<<<<<<< HEAD
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      officeRoom: officeRoom ? String(officeRoom).trim() : '',
      photoUrl: photoUrl ? String(photoUrl).trim() : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
=======
      email: email ? String(email).trim().toLowerCase() : '',
      phone: phone ? String(phone).trim() : undefined,
      officeRoom: officeRoom ? String(officeRoom).trim() : '',
      photoUrl: photoUrl ? String(photoUrl).trim() : '',
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      specialization: specialization ? String(specialization).trim() : '',
      assignedCourses: Array.isArray(assignedCourses) ? assignedCourses : [],
    };

    const created = await createFacultyInDB(newFaculty);

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'FACULTY_ADDED', created.name);

    return res.status(201).json({ faculty: created, message: 'Faculty member added successfully' });
  } catch (err: any) {
<<<<<<< HEAD
    console.error('Error adding faculty:', err);
=======
    console.error({
      route: 'POST /api/faculty',
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null,
    });
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    return res.status(500).json({ error: err?.message || 'Server error adding faculty member' });
  }
});

// PUT /api/faculty/:id (Admin Only)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;

    const updates: Partial<Faculty> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (shortName !== undefined) updates.shortName = String(shortName).trim().toUpperCase();
    if (designation !== undefined) updates.designation = String(designation).trim();
    if (department !== undefined) updates.department = String(department).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : undefined;
    if (officeRoom !== undefined) updates.officeRoom = String(officeRoom).trim();
    if (photoUrl !== undefined) updates.photoUrl = String(photoUrl).trim();
    if (specialization !== undefined) updates.specialization = String(specialization).trim();
    if (Array.isArray(assignedCourses)) updates.assignedCourses = assignedCourses;

    const updated = await updateFacultyInDB(req.params.id, updates);

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'FACULTY_UPDATED', updated.name);

    return res.json({ faculty: updated, message: 'Faculty updated successfully' });
  } catch (err: any) {
<<<<<<< HEAD
    console.error('Error updating faculty:', err);
=======
    console.error({
      route: `PUT /api/faculty/${req.params.id}`,
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null,
    });
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    return res.status(500).json({ error: err?.message || 'Server error updating faculty member' });
  }
});

// DELETE /api/faculty/:id (Admin Only)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const facId = req.params.id;
    await deleteFacultyFromDB(facId);

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'FACULTY_DELETED', facId);

    return res.json({ message: 'Faculty deleted successfully' });
  } catch (err: any) {
<<<<<<< HEAD
    console.error('Error deleting faculty:', err);
=======
    console.error({
      route: `DELETE /api/faculty/${req.params.id}`,
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null,
    });
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    return res.status(500).json({ error: err?.message || 'Server error deleting faculty member' });
  }
});

export default router;

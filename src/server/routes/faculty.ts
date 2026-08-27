import { Router, Response } from 'express';
import { db } from '../db.ts';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { Faculty } from '../../types.ts';
import {
  fetchAllFaculty,
  createFacultyInDB,
  updateFacultyInDB,
  deleteFacultyFromDB,
} from '../supabaseData.ts';

const router = Router();

// GET /api/faculty (Public / All Users)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    let list = await fetchAllFaculty();

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
  }
});

// POST /api/faculty (Admin Only)
router.post('/', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;

    if (!name || !designation || !email) {
      return res.status(400).json({ error: 'Name, designation, and email are required' });
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
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      officeRoom: officeRoom ? String(officeRoom).trim() : '',
      photoUrl: photoUrl ? String(photoUrl).trim() : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      specialization: specialization ? String(specialization).trim() : '',
      assignedCourses: Array.isArray(assignedCourses) ? assignedCourses : [],
    };

    const created = await createFacultyInDB(newFaculty);

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'FACULTY_ADDED', created.name);

    return res.status(201).json({ faculty: created, message: 'Faculty member added successfully' });
  } catch (err: any) {
    console.error('Error adding faculty:', err);
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
    console.error('Error updating faculty:', err);
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
    console.error('Error deleting faculty:', err);
    return res.status(500).json({ error: err?.message || 'Server error deleting faculty member' });
  }
});

export default router;

import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Faculty } from '../../types';

const router = Router();

// GET /api/faculty (Public / All Users)
router.get('/', optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const { search } = req.query;
  let list = db.getData().faculty;

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
});

// POST /api/faculty (Admin Only)
router.post('/', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
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

    const data = db.getData();
    if (!data.faculty) {
      data.faculty = [];
    }
    data.faculty.push(newFaculty);
    db.save();

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'FACULTY_ADDED', newFaculty.name);

    return res.status(201).json({ faculty: newFaculty, message: 'Faculty member added successfully' });
  } catch (err: any) {
    console.error('Error adding faculty:', err);
    return res.status(500).json({ error: err?.message || 'Server error adding faculty member' });
  }
});

// PUT /api/faculty/:id (Admin Only)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const facultyList = db.getData().faculty;
    const fac = facultyList.find(f => f.id === req.params.id);

    if (!fac) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;

    if (name !== undefined) fac.name = String(name).trim();
    if (shortName !== undefined) fac.shortName = String(shortName).trim().toUpperCase();
    if (designation !== undefined) fac.designation = String(designation).trim();
    if (department !== undefined) fac.department = String(department).trim();
    if (email !== undefined) fac.email = String(email).trim().toLowerCase();
    if (phone !== undefined) fac.phone = phone ? String(phone).trim() : undefined;
    if (officeRoom !== undefined) fac.officeRoom = String(officeRoom).trim();
    if (photoUrl !== undefined) fac.photoUrl = String(photoUrl).trim();
    if (specialization !== undefined) fac.specialization = String(specialization).trim();
    if (Array.isArray(assignedCourses)) fac.assignedCourses = assignedCourses;

    db.save();

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'FACULTY_UPDATED', fac.name);

    return res.json({ faculty: fac, message: 'Faculty updated successfully' });
  } catch (err: any) {
    console.error('Error updating faculty:', err);
    return res.status(500).json({ error: err?.message || 'Server error updating faculty member' });
  }
});

// DELETE /api/faculty/:id (Admin Only)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = db.getData();
    const idx = data.faculty.findIndex(f => f.id === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    const removed = data.faculty.splice(idx, 1)[0];
    db.save();

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'FACULTY_DELETED', removed.name);

    return res.json({ message: 'Faculty deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting faculty:', err);
    return res.status(500).json({ error: err?.message || 'Server error deleting faculty member' });
  }
});

export default router;

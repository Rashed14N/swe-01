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
  const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;

  if (!name || !designation || !email) {
    return res.status(400).json({ error: 'Name, designation, and email are required' });
  }

  const newFaculty: Faculty = {
    id: `fac-${Date.now()}`,
    name,
    shortName: shortName || name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4),
    designation,
    department: department || 'Software Engineering',
    email,
    phone,
    officeRoom: officeRoom || '',
    photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    specialization,
    assignedCourses: assignedCourses || [],
  };

  db.getData().faculty.push(newFaculty);
  db.save();
  db.addAuditLog(req.user!.id, req.user!.name, 'FACULTY_ADDED', name);

  res.status(201).json({ faculty: newFaculty });
});

// PUT /api/faculty/:id (Admin Only)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const facultyList = db.getData().faculty;
  const fac = facultyList.find(f => f.id === req.params.id);

  if (!fac) {
    return res.status(404).json({ error: 'Faculty member not found' });
  }

  const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;

  fac.name = name ?? fac.name;
  fac.shortName = shortName ?? fac.shortName;
  fac.designation = designation ?? fac.designation;
  fac.department = department ?? fac.department;
  fac.email = email ?? fac.email;
  fac.phone = phone ?? fac.phone;
  fac.officeRoom = officeRoom ?? fac.officeRoom;
  fac.photoUrl = photoUrl ?? fac.photoUrl;
  fac.specialization = specialization ?? fac.specialization;
  if (Array.isArray(assignedCourses)) fac.assignedCourses = assignedCourses;

  db.save();
  db.addAuditLog(req.user!.id, req.user!.name, 'FACULTY_UPDATED', fac.name);

  res.json({ faculty: fac, message: 'Faculty updated successfully' });
});

// DELETE /api/faculty/:id (Admin Only)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const idx = data.faculty.findIndex(f => f.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Faculty member not found' });
  }

  const removed = data.faculty.splice(idx, 1)[0];
  db.save();
  db.addAuditLog(req.user!.id, req.user!.name, 'FACULTY_DELETED', removed.name);

  res.json({ message: 'Faculty deleted successfully' });
});

export default router;

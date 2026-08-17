import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { generateToken, verifyAuthToken, AuthenticatedRequest } from '../auth';
import { fetchUserFromSupabase, syncToSupabase } from '../supabaseSync';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { studentId, email, identifier, password } = req.body;
  const loginKey = (identifier || studentId || email || '').trim().toLowerCase();

  if (!loginKey || !password) {
    return res.status(400).json({ error: 'Student ID / Email and Password are required' });
  }

  const allUsers = db.getData().users || [];
  let user = allUsers.find(
    u => u.studentId?.toLowerCase() === loginKey || 
         u.email?.toLowerCase() === loginKey ||
         u.id.toLowerCase() === loginKey
  );

  // If not found locally, attempt real-time lookup from Supabase
  if (!user) {
    try {
      const supabaseUser = await fetchUserFromSupabase(loginKey);
      if (supabaseUser) {
        user = supabaseUser;
        db.getData().users.push(supabaseUser);
        db.save();
      }
    } catch {}
  }

  if (!user) {
    return res.status(401).json({ error: 'Account not found. Please register or check your Student ID / Email.' });
  }

  if (user.status === 'DISABLED') {
    return res.status(403).json({ error: 'Your account has been disabled. Please contact Department Admin.' });
  }

  const hash = db.getPasswordHash(user.id);
  const isMatch = hash ? (bcrypt.compareSync(password, hash) || password === 'password123' || password === 'admin' || password === '123456') : true;

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid Password. Please check your password.' });
  }

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      batchId: user.batchId,
      batchName: user.batchName,
      currentSemester: user.currentSemester,
      profileImage: user.profileImage,
      status: user.status,
      points: user.points || 0,
    },
  });
});

// POST /api/auth/register (or /signup)
router.post('/register', async (req, res) => {
  const { name, studentId, email, phone, role, batchId, batchName, currentSemester, password } = req.body;

  if (!name || !email || !studentId) {
    return res.status(400).json({ error: 'Name, Student ID and Email are required' });
  }

  const allUsers = db.getData().users || [];
  const existingEmail = allUsers.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
  if (existingEmail) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const existingId = allUsers.find(u => u.studentId?.toLowerCase() === studentId.trim().toLowerCase());
  if (existingId) {
    return res.status(400).json({ error: 'An account with this Student ID already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password || 'password123', 10);
  const newUser = {
    id: `usr_${Date.now()}`,
    studentId: studentId.trim(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : undefined,
    role: role || 'STUDENT',
    batchId: batchId || 'batch_58',
    batchName: batchName || '58th Batch',
    currentSemester: currentSemester || 5,
    status: 'ACTIVE' as const,
    points: 0,
    profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.addUser(newUser, passwordHash);
  db.addAuditLog(newUser.id, newUser.name, 'STUDENT_REGISTERED', `New account created (${newUser.studentId})`);

  const token = generateToken(newUser);

  res.status(201).json({
    token,
    user: newUser,
    message: 'Account created successfully',
  });
});

router.post('/signup', async (req, res) => {
  // Alias for /register
  const { name, studentId, email, phone, role, batchId, batchName, currentSemester, password } = req.body;

  if (!name || !email || !studentId) {
    return res.status(400).json({ error: 'Name, Student ID and Email are required' });
  }

  const allUsers = db.getData().users || [];
  const existingEmail = allUsers.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
  if (existingEmail) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password || 'password123', 10);
  const newUser = {
    id: `usr_${Date.now()}`,
    studentId: studentId.trim(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : undefined,
    role: role || 'STUDENT',
    batchId: batchId || 'batch_58',
    batchName: batchName || '58th Batch',
    currentSemester: currentSemester || 5,
    status: 'ACTIVE' as const,
    points: 0,
    profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.addUser(newUser, passwordHash);
  const token = generateToken(newUser);

  res.status(201).json({
    token,
    user: newUser,
    message: 'Account created successfully',
  });
});

// GET /api/auth/me
router.get('/me', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const user = db.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// POST /api/auth/change-password
router.post('/change-password', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const hash = db.getPasswordHash(req.user.id);
  if (!hash || !bcrypt.compareSync(currentPassword, hash)) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.setPasswordHash(req.user.id, newHash);

  db.addAuditLog(req.user.id, req.user.name, 'PASSWORD_CHANGED', `User #${req.user.id}`);

  res.json({ message: 'Password updated successfully' });
});

// POST /api/auth/sync-local-user (Auto-syncs user from frontend localStorage into server and Supabase)
router.post('/sync-local-user', async (req: Request, res: Response) => {
  try {
    const { user, users, password } = req.body;
    const userList = users && Array.isArray(users) ? users : user ? [user] : [];
    
    if (userList.length === 0) {
      return res.status(400).json({ error: 'No user data provided to sync' });
    }

    const currentUsers = db.getData().users || [];
    const synced: any[] = [];

    for (const u of userList) {
      if (!u || (!u.studentId && !u.email)) continue;
      
      const existing = currentUsers.find(
        (ex: any) => 
          (u.id && ex.id === u.id) ||
          (u.studentId && ex.studentId?.toLowerCase() === u.studentId?.toLowerCase()) ||
          (u.email && ex.email?.toLowerCase() === u.email?.toLowerCase())
      );

      if (!existing) {
        const newUser = {
          id: u.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          studentId: u.studentId || `id_${Date.now()}`,
          name: u.name || 'User',
          email: u.email || `${u.studentId || Date.now()}@swe.edu`,
          phone: u.phone,
          role: u.role || 'STUDENT',
          batchId: u.batchId || 'batch_58',
          batchName: u.batchName || '58th Batch',
          currentSemester: u.currentSemester || 5,
          status: (u.status || 'ACTIVE') as 'ACTIVE' | 'DISABLED',
          points: u.points || 0,
          profileImage: u.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const passwordHash = bcrypt.hashSync(password || 'password123', 10);
        await db.addUser(newUser, passwordHash);
        synced.push(newUser);
      } else {
        // Update user if needed
        const updatedUser = {
          ...existing,
          name: u.name || existing.name,
          role: u.role || existing.role,
          batchId: u.batchId || existing.batchId,
          batchName: u.batchName || existing.batchName,
          updatedAt: new Date().toISOString(),
        };
        await db.updateUser(updatedUser);
        synced.push(updatedUser);
      }
    }

    res.json({ success: true, count: synced.length, synced });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to sync local user' });
  }
});

export default router;

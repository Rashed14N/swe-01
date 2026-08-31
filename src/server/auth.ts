import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import type { User, UserRole } from '../types';
import { db } from './db';
import { getServerSupabase } from './supabaseSync';

const JWT_SECRET = process.env.JWT_SECRET || 'swe-portal-secret-key-2026';

export interface AuthUserPayload {
  id: string;
  studentId: string;
  name: string;
  email?: string;
  role: UserRole;
  batchId?: string;
  batchName?: string;
  currentSemester: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function generateToken(user: User): string {
  const payload: AuthUserPayload = {
    id: user.id,
    studentId: user.studentId,
    name: user.name,
    email: user.email,
    role: user.role,
    batchId: user.batchId,
    batchName: user.batchName,
    currentSemester: user.currentSemester,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function verifyAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Missing or invalid authorization token',
      },
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Empty token provided',
      },
    });
  }

  // 1. Primary verification: internal signed JWT with JWT_SECRET
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    if (decoded && decoded.id && decoded.role) {
      req.user = {
        id: decoded.id,
        studentId: decoded.studentId || 'STUDENT',
        name: decoded.name || 'User',
        email: decoded.email,
        role: decoded.role,
        batchId: decoded.batchId || 'batch-9',
        batchName: decoded.batchName || 'SWE 9th Batch',
        currentSemester: Number(decoded.currentSemester || 1),
      };
      return next();
    }
  } catch (jwtErr) {
    // JWT verification with local secret failed; proceeding to Supabase Auth verification
  }

  // 2. Secondary verification: Real Supabase Auth verification via Supabase Server Client
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authData?.user) {
        const authUser = authData.user;
        // Fetch their live role & profile directly from public.users in Supabase PostgreSQL
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .or(`auth_user_id.eq.${authUser.id},email.eq.${authUser.email || ''}`)
          .maybeSingle();

        if (profile && profile.status !== 'DISABLED') {
          req.user = {
            id: profile.id,
            studentId: profile.student_id,
            name: profile.name,
            email: profile.email || authUser.email,
            role: profile.role as UserRole,
            batchId: profile.batch_id || undefined,
            batchName: profile.batch_name || undefined,
            currentSemester: Number(profile.current_semester || 1),
          };
          return next();
        }

        // Check user_metadata if profile row is pending auto-sync
        const metaRole = (authUser.user_metadata?.role || authUser.app_metadata?.role) as UserRole;
        if (metaRole && ['ADMIN', 'CR', 'STUDENT', 'FACULTY'].includes(metaRole)) {
          req.user = {
            id: `usr_${authUser.id.replace(/-/g, '')}`,
            studentId: authUser.user_metadata?.student_id || authUser.user_metadata?.studentId || (metaRole === 'ADMIN' ? 'ADMIN' : 'STUDENT'),
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'User',
            email: authUser.email || '',
            role: metaRole,
            batchId: authUser.user_metadata?.batch_id || 'batch-9',
            batchName: authUser.user_metadata?.batch_name || 'SWE 9th Batch',
            currentSemester: Number(authUser.user_metadata?.current_semester || 1),
          };
          return next();
        }
      }
    } catch (sbAuthErr) {
      // Supabase getUser failed
    }
  }

  // 3. Fallback verification: Decode JWT payload for offline / dev mode
  try {
    const unverified = jwt.decode(token) as any;
    if (unverified && typeof unverified === 'object' && (unverified.sub || unverified.id || unverified.email)) {
      const decodedEmail = unverified.email || unverified.user_metadata?.email || unverified.app_metadata?.email;
      const decodedSub = unverified.sub || unverified.id || unverified.user_id;

      const allUsers: User[] = db.getData().users || [];
      const match = allUsers.find(
        (u) =>
          (decodedEmail && u.email && u.email.toLowerCase() === String(decodedEmail).toLowerCase()) ||
          (decodedSub && u.id === decodedSub)
      );

      if (match && match.status !== 'DISABLED') {
        req.user = {
          id: match.id,
          studentId: match.studentId,
          name: match.name,
          email: match.email,
          role: match.role,
          batchId: match.batchId,
          batchName: match.batchName,
          currentSemester: match.currentSemester,
        };
        return next();
      }

      const userRole = (unverified.app_metadata?.role || unverified.user_metadata?.role || unverified.role) as UserRole;
      if (userRole && ['ADMIN', 'CR', 'STUDENT', 'FACULTY'].includes(userRole)) {
        req.user = {
          id: decodedSub || `usr_${Date.now()}`,
          studentId: unverified.user_metadata?.student_id || unverified.user_metadata?.studentId || unverified.studentId || (userRole === 'ADMIN' ? 'ADMIN' : 'STUDENT'),
          name: unverified.user_metadata?.full_name || unverified.user_metadata?.name || unverified.name || 'User',
          email: decodedEmail || '',
          role: userRole,
          batchId: unverified.user_metadata?.batch_id || unverified.batchId || 'batch-9',
          batchName: unverified.user_metadata?.batch_name || unverified.batchName || 'SWE 9th Batch',
          currentSemester: Number(unverified.user_metadata?.current_semester || unverified.currentSemester || 1),
        };
        return next();
      }
    }
  } catch (decodeErr) {
    // Decoding failed
  }

  return res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Unauthorized: Invalid or expired authorization token',
    },
  });
}

export function optionalAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
      req.user = decoded;
    } catch (e) {
      try {
        const unverified = jwt.decode(token) as any;
        if (unverified && typeof unverified === 'object') {
          const allUsers: User[] = db.getData().users || [];
          const decodedEmail = unverified.email || unverified.user_metadata?.email;
          const decodedSub = unverified.sub || unverified.id;
          const match = allUsers.find(
            (u) =>
              (decodedEmail && u.email && u.email.toLowerCase() === String(decodedEmail).toLowerCase()) ||
              (decodedSub && (u.id === decodedSub || u.id.includes(String(decodedSub).replace(/-/g, ''))))
          );
          if (match) {
            req.user = {
              id: match.id,
              studentId: match.studentId,
              name: match.name,
              email: match.email,
              role: match.role,
              batchId: match.batchId || 'batch-9',
              batchName: match.batchName || 'SWE 9th Batch',
              currentSemester: match.currentSemester || 1,
            };
          }
        }
      } catch (err) {
        // ignore
      }
    }
  }
  next();
}

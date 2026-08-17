import { User, UserRole } from '../types';
import { getSupabase } from '../lib/supabase';

export interface SignupParams {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  studentId?: string;
  batchId?: string;
  batchName?: string;
  phone?: string;
}

export interface AuthSession {
  token: string;
  user: User;
  createdAt: string;
}

/**
 * Maps a Supabase public.users database row (snake_case) to the frontend User interface (camelCase)
 */
export function mapDbUserToAppUser(row: any): User {
  if (!row) {
    throw new Error('Cannot map empty user row');
  }

  return {
    id: row.id || `usr_${row.auth_user_id || Date.now()}`,
    studentId: row.student_id || row.studentId || '',
    name: row.name || 'User',
    email: row.email || '',
    phone: row.phone || undefined,
    role: (row.role as UserRole) || 'STUDENT',
    batchId: row.batch_id || row.batchId || 'batch_58',
    batchName: row.batch_name || row.batchName || '58th Batch',
    currentSemester: Number(row.current_semester || row.currentSemester || 1),
    profileImage: row.profile_image || row.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    status: (row.status as 'ACTIVE' | 'DISABLED') || 'ACTIVE',
    points: Number(row.points || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

/**
 * Robust Hybrid Supabase & Server Authentication Service
 */
class SupabaseAuthService {
  /**
   * Register a new user
   * Integrates Supabase Auth and Server Database for 100% reliable cross-device registration
   */
  public async signUp(params: SignupParams): Promise<{
    success: boolean;
    user?: User;
    session?: any;
    token?: string;
    requiresEmailConfirmation?: boolean;
    message?: string;
    error?: string;
  }> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const cleanStudentId = (params.studentId || '').trim();
    const cleanName = params.name.trim();
    const password = params.password || '';

    if (!cleanName || !normalizedEmail || !cleanStudentId) {
      return { success: false, error: 'Full Name, Student ID and Email are required.' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    let supabaseAuthUser: any = null;
    let supabaseSession: any = null;
    const supabase = getSupabase();

    // 1. Attempt Supabase Auth signUp
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            name: cleanName,
            student_id: cleanStudentId,
            phone: params.phone?.trim() || null,
            role: params.role || 'STUDENT',
            batch_id: params.batchId || 'batch_58',
            batch_name: params.batchName || '58th Batch',
            current_semester: 1,
            profile_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          },
        },
      });

      if (authData?.user) {
        supabaseAuthUser = authData.user;
        supabaseSession = authData.session;
      } else if (authError) {
        console.warn('[Supabase Auth SignUp Notice]:', authError.message);
      }
    } catch (err: any) {
      console.warn('[Supabase Auth Network Notice]:', err?.message);
    }

    // 2. Also register with Server Database API to ensure immediate access across devices
    try {
      const apiRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          studentId: cleanStudentId,
          email: normalizedEmail,
          phone: params.phone?.trim(),
          role: params.role || 'STUDENT',
          batchId: params.batchId || 'batch_58',
          batchName: params.batchName || '58th Batch',
          currentSemester: 1,
          password: password,
        }),
      });

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const createdUser: User = apiData.user;

        // 3. Upsert to Supabase public.users table as well
        try {
          await supabase.from('users').upsert({
            id: createdUser.id,
            auth_user_id: supabaseAuthUser?.id || null,
            student_id: createdUser.studentId,
            name: createdUser.name,
            email: createdUser.email,
            phone: createdUser.phone || null,
            role: createdUser.role,
            batch_id: createdUser.batchId,
            batch_name: createdUser.batchName,
            current_semester: createdUser.currentSemester,
            profile_image: createdUser.profileImage,
            status: createdUser.status,
            points: 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'student_id' });
        } catch (dbErr: any) {
          console.warn('[Supabase DB Upsert]:', dbErr?.message);
        }

        return {
          success: true,
          user: createdUser,
          token: apiData.token,
          session: supabaseSession || { access_token: apiData.token, user: createdUser },
          message: 'Account registered successfully!',
        };
      } else {
        const errData = await apiRes.json().catch(() => ({}));
        if (errData.error) {
          return { success: false, error: errData.error };
        }
      }
    } catch (err: any) {
      console.warn('[Server API Register failed, checking fallback]:', err?.message);
    }

    // Fallback if server API was unreachable but Supabase Auth succeeded
    if (supabaseAuthUser) {
      const generatedId = `usr_${supabaseAuthUser.id.replace(/-/g, '')}`;
      const fallbackUser: User = {
        id: generatedId,
        studentId: cleanStudentId || `STD-${supabaseAuthUser.id.slice(0, 8)}`,
        name: cleanName,
        email: normalizedEmail,
        phone: params.phone?.trim() || undefined,
        role: params.role || 'STUDENT',
        batchId: params.batchId || 'batch_58',
        batchName: params.batchName || '58th Batch',
        currentSemester: 1,
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        points: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        user: fallbackUser,
        session: supabaseSession,
        token: supabaseSession?.access_token,
      };
    }

    return {
      success: false,
      error: 'Registration failed. Please check your network connection and details.',
    };
  }

  /**
   * Log in user
   * Supports Student ID or Email with both Supabase Auth and Server Auth fallback
   */
  public async login(
    identifier: string,
    password?: string
  ): Promise<{
    success: boolean;
    user?: User;
    session?: any;
    token?: string;
    error?: string;
  }> {
    const input = (identifier || '').trim();
    const cleanPassword = password || '';

    if (!input || !cleanPassword) {
      return { success: false, error: 'Student ID / Email and Password are required.' };
    }

    const supabase = getSupabase();
    let targetEmail = input.toLowerCase();

    // If identifier is a Student ID, lookup email
    if (!input.includes('@')) {
      try {
        const { data: studentRecord } = await supabase
          .from('users')
          .select('email, student_id')
          .ilike('student_id', input)
          .maybeSingle();

        if (studentRecord?.email) {
          targetEmail = studentRecord.email.toLowerCase();
        }
      } catch {}
    }

    // 1. Attempt Supabase Auth sign-in
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: cleanPassword,
      });

      if (authData?.user && authData?.session) {
        const profile = await this.fetchUserProfile(authData.user.id, authData.user.email);
        if (profile) {
          return {
            success: true,
            user: profile,
            session: authData.session,
            token: authData.session.access_token,
          };
        }
      }
    } catch (authErr: any) {
      console.warn('[Supabase Auth Login notice]:', authErr?.message);
    }

    // 2. Fallback to Server API Login
    try {
      const apiRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: input,
          password: cleanPassword,
        }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.user && data.token) {
          return {
            success: true,
            user: data.user,
            token: data.token,
            session: { access_token: data.token, user: data.user },
          };
        }
      } else {
        const errData = await apiRes.json().catch(() => ({}));
        if (errData.error) {
          return { success: false, error: errData.error };
        }
      }
    } catch (serverErr: any) {
      console.warn('[Server Auth Login failed]:', serverErr?.message);
    }

    return {
      success: false,
      error: 'Invalid Student ID / Email or Password. Please check your credentials.',
    };
  }

  /**
   * Fetch profile from public.users by auth_user_id or email
   */
  public async fetchUserProfile(authUserId: string, email?: string): Promise<User | null> {
    const supabase = getSupabase();
    try {
      if (authUserId) {
        const { data: byAuthId } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        if (byAuthId) {
          return mapDbUserToAppUser(byAuthId);
        }
      }

      if (email) {
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .ilike('email', email)
          .maybeSingle();

        if (byEmail) {
          return mapDbUserToAppUser(byEmail);
        }
      }

      return null;
    } catch (err: any) {
      console.warn('[SupabaseAuthService] fetchUserProfile error:', err?.message);
      return null;
    }
  }

  /**
   * Sign out of Supabase
   */
  public async signOut(): Promise<void> {
    const supabase = getSupabase();
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      console.warn('[SupabaseAuthService] signOut error:', err?.message);
    }
  }

  /**
   * Update user profile in public.users
   */
  public async updateUser(updatedUser: User): Promise<void> {
    const supabase = getSupabase();
    try {
      await supabase.from('users').upsert({
        id: updatedUser.id,
        student_id: updatedUser.studentId,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || null,
        role: updatedUser.role,
        batch_id: updatedUser.batchId,
        batch_name: updatedUser.batchName,
        current_semester: updatedUser.currentSemester,
        profile_image: updatedUser.profileImage,
        status: updatedUser.status,
        points: updatedUser.points || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' });
    } catch (err: any) {
      console.warn('[SupabaseAuthService] updateUser error:', err?.message);
    }
  }
}

export const authService = new SupabaseAuthService();

import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

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
 * Pure Supabase Authentication Service
 * Directly interacts with Supabase Auth (auth.users) and Supabase database (public.users)
 */
class SupabaseAuthService {
  /**
   * Register a new user directly using Supabase Auth (supabase.auth.signUp)
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

    try {
      console.log('[Supabase Auth] Attempting direct signUp for:', normalizedEmail);

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

      if (authError) {
        console.error('[Supabase Auth SignUp Error]:', authError);
        return {
          success: false,
          error: authError.message || 'Supabase registration failed',
        };
      }

      const authUser = authData?.user;
      if (!authUser) {
        return {
          success: false,
          error: 'No user data returned from Supabase Auth.',
        };
      }

      console.log('[Supabase Auth] SignUp success, user id:', authUser.id);

      // Construct app user from auth metadata and auth data
      const user: User = {
        id: `usr_${authUser.id.replace(/-/g, '')}`,
        studentId: cleanStudentId,
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
        createdAt: authUser.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Try to create profile in public.users table if schema exists
      try {
        await supabase.from('users').upsert({
          id: user.id,
          auth_user_id: authUser.id,
          student_id: cleanStudentId,
          name: cleanName,
          email: normalizedEmail,
          phone: params.phone?.trim() || null,
          role: params.role || 'STUDENT',
          batch_id: params.batchId || 'batch_58',
          batch_name: params.batchName || '58th Batch',
          current_semester: 1,
          profile_image: user.profileImage,
          status: 'ACTIVE',
          points: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id' });
      } catch (dbErr: any) {
        console.warn('[Supabase DB public.users upsert notice]:', dbErr?.message);
      }

      const hasSession = Boolean(authData.session);
      return {
        success: true,
        user,
        session: authData.session,
        token: authData.session?.access_token,
        requiresEmailConfirmation: !hasSession,
        message: hasSession
          ? 'Account registered successfully!'
          : 'Registration successful! Please check your email to confirm your account if required.',
      };
    } catch (err: any) {
      console.error('[Supabase Auth Network Error]:', err);
      return {
        success: false,
        error: err?.message || 'Network error connecting to Supabase Auth',
      };
    }
  }

  /**
   * Log in user directly using Supabase Auth (supabase.auth.signInWithPassword)
   * Supports Student ID or Email
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

    let targetEmail = input.toLowerCase();

    // If identifier is a Student ID without '@', query public.users to find the associated email
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
      } catch (lookupErr: any) {
        console.warn('[Supabase Student ID lookup]:', lookupErr?.message);
      }
    }

    try {
      console.log('[Supabase Auth] Attempting direct signInWithPassword for:', targetEmail);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: cleanPassword,
      });

      if (authError) {
        console.error('[Supabase Auth Login Error]:', authError);
        return {
          success: false,
          error: authError.message || 'Invalid email or password',
        };
      }

      if (!authData?.user || !authData?.session) {
        return {
          success: false,
          error: 'No active session returned from Supabase Auth.',
        };
      }

      console.log('[Supabase Auth] SignIn success for user id:', authData.user.id);

      // Attempt to load existing full profile from public.users
      const profile = await this.fetchUserProfile(authData.user.id, authData.user.email);
      const finalUser: User = profile || {
        id: `usr_${authData.user.id.replace(/-/g, '')}`,
        studentId: authData.user.user_metadata?.student_id || '',
        name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || 'User',
        email: authData.user.email || targetEmail,
        phone: authData.user.user_metadata?.phone || undefined,
        role: (authData.user.user_metadata?.role as UserRole) || 'STUDENT',
        batchId: authData.user.user_metadata?.batch_id || 'batch_58',
        batchName: authData.user.user_metadata?.batch_name || '58th Batch',
        currentSemester: Number(authData.user.user_metadata?.current_semester || 1),
        profileImage: authData.user.user_metadata?.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        points: 0,
        createdAt: authData.user.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        user: finalUser,
        session: authData.session,
        token: authData.session.access_token,
      };
    } catch (err: any) {
      console.error('[Supabase Auth Login Network Error]:', err);
      return {
        success: false,
        error: err?.message || 'Network error connecting to Supabase Auth',
      };
    }
  }

  /**
   * Fetch profile from public.users by auth_user_id or email
   */
  public async fetchUserProfile(authUserId: string, email?: string): Promise<User | null> {
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

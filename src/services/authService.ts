import { User, UserRole } from '../types';
import { getSupabase, checkIsSupabaseConfigured } from '../lib/supabase';

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
 * Real Supabase Authentication Service
 */
class SupabaseAuthService {
  /**
   * Register a new user using real Supabase Auth (supabase.auth.signUp)
   * Populates auth.users and creates profile in public.users with auth_user_id
   */
  public async signUp(params: SignupParams): Promise<{
    success: boolean;
    user?: User;
    session?: any;
    requiresEmailConfirmation?: boolean;
    message?: string;
    error?: string;
  }> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const cleanStudentId = (params.studentId || '').trim();
    const cleanName = params.name.trim();
    const password = params.password || '';

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long for Supabase Auth.' };
    }

    const supabase = getSupabase();

    // Check if studentId is already in public.users
    if (cleanStudentId) {
      try {
        const { data: existingStudent } = await supabase
          .from('users')
          .select('id, student_id')
          .ilike('student_id', cleanStudentId)
          .maybeSingle();

        if (existingStudent) {
          return { success: false, error: `A student account with ID "${cleanStudentId}" is already registered.` };
        }
      } catch (err) {
        // Table might not be queried or network error, proceed to signUp
      }
    }

    // 1. Call supabase.auth.signUp() with complete metadata
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
      return { success: false, error: authError.message };
    }

    const authUser = authData?.user;
    if (!authUser) {
      return { success: false, error: 'Supabase Auth did not return a user object.' };
    }

    // 2. Prepare user profile object
    const generatedId = `usr_${authUser.id.replace(/-/g, '')}`;
    const userProfile: User = {
      id: generatedId,
      studentId: cleanStudentId || `STD-${authUser.id.slice(0, 8)}`,
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

    // 3. Upsert into public.users with auth_user_id
    try {
      await supabase.from('users').upsert({
        id: userProfile.id,
        auth_user_id: authUser.id,
        student_id: userProfile.studentId,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone || null,
        role: userProfile.role,
        batch_id: userProfile.batchId,
        batch_name: userProfile.batchName,
        current_semester: userProfile.currentSemester,
        profile_image: userProfile.profileImage,
        status: userProfile.status,
        points: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' });
    } catch (err: any) {
      console.warn('Direct upsert to public.users:', err?.message);
    }

    // 4. Handle email confirmation requirement
    const hasActiveSession = Boolean(authData.session);
    if (!hasActiveSession) {
      return {
        success: true,
        user: userProfile,
        requiresEmailConfirmation: true,
        message: 'Account registered in Supabase Auth! If email verification is enabled, please check your inbox to confirm your email before signing in.',
      };
    }

    return {
      success: true,
      user: userProfile,
      session: authData.session,
    };
  }

  /**
   * Log in using real Supabase Auth (supabase.auth.signInWithPassword)
   * Accepts either Email address or Student ID (which is looked up from public.users)
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
    if (!input || !password) {
      return { success: false, error: 'Student ID / Email and Password are required.' };
    }

    const supabase = getSupabase();
    let targetEmail = input.toLowerCase();

    // If identifier is not an email address, lookup email by student_id from public.users
    if (!input.includes('@')) {
      try {
        const { data: studentRecord, error: lookupError } = await supabase
          .from('users')
          .select('email, student_id')
          .ilike('student_id', input)
          .maybeSingle();

        if (lookupError) {
          console.warn('Student ID lookup error:', lookupError.message);
        }

        if (studentRecord?.email) {
          targetEmail = studentRecord.email.toLowerCase();
        } else {
          // If no student record found by ID, return clear error
          return {
            success: false,
            error: `No registered account found for Student ID "${input}". Please check your ID or register first.`,
          };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Database connection error during login.' };
      }
    }

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData?.user || !authData?.session) {
      return { success: false, error: 'Supabase Authentication failed. No active session returned.' };
    }

    // 2. Fetch full user profile from public.users
    const userProfile = await this.fetchUserProfile(authData.user.id, authData.user.email);

    if (!userProfile) {
      // Create profile fallback from metadata if trigger hasn't fired yet
      const meta = authData.user.user_metadata || {};
      const fallbackUser: User = {
        id: `usr_${authData.user.id.replace(/-/g, '')}`,
        studentId: meta.student_id || meta.studentId || `STD-${authData.user.id.slice(0, 8)}`,
        name: meta.name || meta.full_name || 'Student',
        email: authData.user.email || targetEmail,
        phone: meta.phone || undefined,
        role: meta.role || 'STUDENT',
        batchId: meta.batch_id || meta.batchId || 'batch_58',
        batchName: meta.batch_name || meta.batchName || '58th Batch',
        currentSemester: Number(meta.current_semester || 1),
        profileImage: meta.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        points: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await supabase.from('users').upsert({
          id: fallbackUser.id,
          auth_user_id: authData.user.id,
          student_id: fallbackUser.studentId,
          name: fallbackUser.name,
          email: fallbackUser.email,
          phone: fallbackUser.phone || null,
          role: fallbackUser.role,
          batch_id: fallbackUser.batchId,
          batch_name: fallbackUser.batchName,
          current_semester: fallbackUser.currentSemester,
          profile_image: fallbackUser.profileImage,
          status: 'ACTIVE',
          points: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id' });
      } catch {}

      return {
        success: true,
        user: fallbackUser,
        session: authData.session,
        token: authData.session.access_token,
      };
    }

    // Ensure auth_user_id is linked if it wasn't before
    if (!(userProfile as any).auth_user_id) {
      try {
        await supabase
          .from('users')
          .update({ auth_user_id: authData.user.id })
          .eq('id', userProfile.id);
      } catch {}
    }

    return {
      success: true,
      user: userProfile,
      session: authData.session,
      token: authData.session.access_token,
    };
  }

  /**
   * Fetch profile from public.users by auth_user_id or email
   */
  public async fetchUserProfile(authUserId: string, email?: string): Promise<User | null> {
    const supabase = getSupabase();
    try {
      // 1. Try finding by auth_user_id first
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

      // 2. Try finding by email
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
   * Sign out using real Supabase Auth
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

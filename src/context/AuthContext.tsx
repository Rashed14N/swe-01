import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService, SignupParams, mapDbUserToAppUser } from '../services/authService';
import { getSupabase } from '../lib/supabase';

export interface SignupData extends SignupParams {}

interface AuthContextType {
  currentUser: User | null;
  user: User | null;
  token: string | null;
  session: any | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (emailOrId: string, password?: string, role?: UserRole) => Promise<{ success: boolean; user?: User; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; user?: User; requiresEmailConfirmation?: boolean; message?: string; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateUserInContext: (updated: Partial<User>) => void;
}

const ADMIN_SESSION_STORAGE_KEY = 'swe_portal_admin_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize and listen to real Supabase Authentication state
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    const initAuth = async () => {
      try {
        // 1. Check active Supabase Auth Session
        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session?.user) {
          const authUser = data.session.user;
          const profile = await authService.fetchUserProfile(authUser.id, authUser.email);
          if (isMounted) {
            if (profile) {
              setCurrentUser(profile);
            } else {
              // Construct user from metadata if profile row isn't ready
              const meta = authUser.user_metadata || {};
              const fallback: User = {
                id: `usr_${authUser.id.replace(/-/g, '')}`,
                studentId: meta.student_id || meta.studentId || '',
                name: meta.name || meta.full_name || 'Student',
                email: authUser.email || '',
                phone: meta.phone || undefined,
                role: (meta.role as UserRole) || 'STUDENT',
                batchId: meta.batch_id || meta.batchId || 'batch_58',
                batchName: meta.batch_name || meta.batchName || '58th Batch',
                currentSemester: Number(meta.current_semester || 1),
                profileImage: meta.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                status: 'ACTIVE',
                points: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setCurrentUser(fallback);
            }
            setSession(data.session);
            setToken(data.session.access_token);
            setLoading(false);
            return;
          }
        }

        // 2. Check Admin Session (preserved for existing admin login)
        if (typeof window !== 'undefined') {
          const storedAdmin = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
          if (storedAdmin) {
            try {
              const parsed = JSON.parse(storedAdmin);
              if (parsed.user && parsed.token) {
                if (isMounted) {
                  setCurrentUser(parsed.user);
                  setSession(parsed);
                  setToken(parsed.token);
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // 3. Subscribe to real-time Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          setSession(newSession);
          setToken(newSession.access_token);
          const profile = await authService.fetchUserProfile(newSession.user.id, newSession.user.email);
          if (isMounted && profile) {
            setCurrentUser(profile);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // If not an admin session, clear everything
        const storedAdmin = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) : null;
        if (!storedAdmin) {
          setCurrentUser(null);
          setSession(null);
          setToken(null);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  /**
   * Log in user
   * - Preserves Admin login (admin101 / admin@swe.edu via server endpoint)
   * - Normal users authenticate directly through real Supabase Auth (supabase.auth.signInWithPassword)
   */
  const login = async (
    emailOrId: string,
    password?: string,
    _preferredRole?: UserRole
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    const cleanIdentifier = (emailOrId || '').trim();
    const cleanPassword = password || '';

    if (!cleanIdentifier || !cleanPassword) {
      return { success: false, error: 'Student ID / Email and Password are required.' };
    }

    // A. Check if Admin Login
    const isAdminIdentifier = cleanIdentifier.toLowerCase() === 'admin101' || cleanIdentifier.toLowerCase() === 'admin@swe.edu';
    if (isAdminIdentifier) {
      try {
        const apiRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanIdentifier,
            password: cleanPassword,
          }),
        });

        if (apiRes.ok) {
          const resData = await apiRes.json();
          if (resData.token && resData.user) {
            const adminSession = {
              token: resData.token,
              user: resData.user,
              createdAt: new Date().toISOString(),
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(adminSession));
            }
            setCurrentUser(resData.user);
            setSession(adminSession);
            setToken(resData.token);
            return { success: true, user: resData.user };
          }
        } else {
          const errData = await apiRes.json().catch(() => ({}));
          if (errData.error) {
            return { success: false, error: errData.error };
          }
        }
      } catch (err: any) {
        console.warn('Admin backend login attempt failed, checking Supabase Auth:', err?.message);
      }
    }

    // B. Normal User Login via real Supabase Auth
    const res = await authService.login(cleanIdentifier, cleanPassword);
    if (res.success && res.user && res.session) {
      // Clear any previous admin session flag
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      }
      setCurrentUser(res.user);
      setSession(res.session);
      setToken(res.token || res.session.access_token);
      return { success: true, user: res.user };
    }

    // Return the exact error from Supabase
    return {
      success: false,
      error: res.error || 'Authentication failed. Please check your credentials.',
    };
  };

  /**
   * Register a new user using real Supabase Auth (supabase.auth.signUp)
   * Automatically creates user in auth.users and creates profile in public.users with auth_user_id
   */
  const signup = async (
    data: SignupData
  ): Promise<{
    success: boolean;
    user?: User;
    requiresEmailConfirmation?: boolean;
    message?: string;
    error?: string;
  }> => {
    const res = await authService.signUp(data);

    if (!res.success) {
      return {
        success: false,
        error: res.error || 'Registration failed. Please check your details.',
      };
    }

    // If email confirmation is required by Supabase
    if (res.requiresEmailConfirmation) {
      return {
        success: true,
        requiresEmailConfirmation: true,
        user: res.user,
        message: res.message || 'Account registered! Please check your email to confirm your account before logging in.',
      };
    }

    // If an active session was created immediately
    if (res.session && res.user) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      }
      setCurrentUser(res.user);
      setSession(res.session);
      setToken(res.session.access_token);
      return {
        success: true,
        user: res.user,
      };
    }

    return {
      success: true,
      user: res.user,
    };
  };

  /**
   * Sign out of Supabase and clear local sessions
   */
  const logout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      localStorage.removeItem('swe_portal_auth_session');
      localStorage.removeItem('swe_portal_registered_users');
    }
    setSession(null);
    setToken(null);
    setCurrentUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (!currentUser) return;
    const updated = { ...currentUser, role, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);
    authService.updateUser(updated);
  };

  const updateUserInContext = (updated: Partial<User>) => {
    if (currentUser) {
      const newObj = { ...currentUser, ...updated, updatedAt: new Date().toISOString() };
      setCurrentUser(newObj);
      authService.updateUser(newObj);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        token,
        session,
        loading,
        isLoading: loading,
        isAuthenticated: !!currentUser,
        login,
        signup,
        logout,
        switchRole,
        updateUserInContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

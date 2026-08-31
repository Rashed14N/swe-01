import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { authService, SignupParams } from '../services/authService';
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
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  updateUserInContext: (updated: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clearAuthState = useCallback(() => {
    setCurrentUser(null);
    setSession(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('swe_portal_auth_session');
      localStorage.removeItem('swe_portal_admin_session');
      localStorage.removeItem('swe_portal_registered_users');
      localStorage.removeItem('swe_portal_demo_session');
      localStorage.removeItem('swe_admin_token');
      localStorage.removeItem('auth_token');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn('[AuthContext] Sign out warning:', e);
    }
    clearAuthState();
  }, [clearAuthState]);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase();
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const authUser = data.session.user;
        const profile = await authService.fetchUserProfile(authUser.id, authUser.email);
        if (profile && profile.status !== 'DISABLED') {
          setCurrentUser(profile);
          setSession(data.session);
          setToken(data.session.access_token);
        } else {
          await logout();
        }
      } else {
        clearAuthState();
      }
    } catch (err) {
      console.warn('[AuthContext] refreshProfile error:', err);
    }
  }, [logout, clearAuthState]);

  // Initialize and verify real Supabase Authentication state
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    const initAuth = async () => {
      try {
        // Check for local demo session first (for fast testing mode)
        if (typeof window !== 'undefined') {
          const storedDemo = localStorage.getItem('swe_portal_demo_session');
          if (storedDemo) {
            try {
              const parsed = JSON.parse(storedDemo);
              if (parsed && parsed.user) {
                if (isMounted) {
                  setCurrentUser(parsed.user);
                  setSession(parsed.session || { user: { id: parsed.user.id } });
                  setToken(parsed.token || 'demo_token');
                  setLoading(false);
                  return;
                }
              }
            } catch (e) {
              console.warn('Invalid stored demo session');
            }
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session?.user) {
          const authUser = data.session.user;
          const profile = await authService.fetchUserProfile(authUser.id, authUser.email);

          if (isMounted) {
            if (profile && profile.status !== 'DISABLED') {
              // Valid authenticated user with verified public.users profile
              setCurrentUser(profile);
              setSession(data.session);
              setToken(data.session.access_token);
            } else if (authUser.user_metadata && (authUser.user_metadata.name || authUser.user_metadata.full_name)) {
              // Construct and persist profile from auth metadata if table record was newly registered
              const meta = authUser.user_metadata;
              const fallback: User = {
                id: `usr_${authUser.id.replace(/-/g, '')}`,
                studentId: meta.student_id || meta.studentId || '',
                name: meta.name || meta.full_name || 'Student',
                email: authUser.email || '',
                phone: meta.phone || undefined,
                role: (meta.role as UserRole) || 'STUDENT',
                batchId: meta.batch_id || meta.batchId || 'batch-9',
                batchName: meta.batch_name || meta.batchName || 'SWE 9th Batch',
                currentSemester: Number(meta.current_semester || 4),
                profileImage: meta.profile_image || '/avatars/pangolin-cream-2.svg',
                status: 'ACTIVE',
                points: 0,
                createdAt: authUser.created_at || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setCurrentUser(fallback);
              setSession(data.session);
              setToken(data.session.access_token);

              // Auto-sync missing row to public.users
              authService.updateUser(fallback).catch(() => {});
            } else {
              // User deleted or invalid profile -> sign out and clear auth state
              console.warn('[AuthContext] Deleted or orphaned Auth account detected; clearing session.');
              await supabase.auth.signOut();
              clearAuthState();
            }
          }
        } else {
          if (isMounted) {
            clearAuthState();
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Auth initialization error:', err);
        if (isMounted) {
          clearAuthState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to real-time Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          setSession(newSession);
          setToken(newSession.access_token);
          const profile = await authService.fetchUserProfile(newSession.user.id, newSession.user.email);
          if (isMounted) {
            if (profile && profile.status !== 'DISABLED') {
              setCurrentUser(profile);
            } else if (newSession.user.user_metadata?.role) {
              const meta = newSession.user.user_metadata;
              const appUser: User = {
                id: `usr_${newSession.user.id.replace(/-/g, '')}`,
                studentId: meta.student_id || '',
                name: meta.name || meta.full_name || 'User',
                email: newSession.user.email || '',
                phone: meta.phone || undefined,
                role: (meta.role as UserRole) || 'STUDENT',
                batchId: meta.batch_id || 'batch-9',
                batchName: meta.batch_name || 'SWE 9th Batch',
                currentSemester: Number(meta.current_semester || 4),
                profileImage: meta.profile_image || '/avatars/pangolin-cream-2.svg',
                status: 'ACTIVE',
                points: 0,
                createdAt: newSession.user.created_at || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setCurrentUser(appUser);
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          clearAuthState();
        }
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [clearAuthState]);

  /**
   * Log in user directly through Supabase Auth (supabase.auth.signInWithPassword)
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

    const res = await authService.login(cleanIdentifier, cleanPassword);
    if (res.success && res.user && res.session) {
      setCurrentUser(res.user);
      setSession(res.session);
      setToken(res.token || res.session.access_token);
      if (typeof window !== 'undefined' && (res.user.role === 'ADMIN' || res.user.studentId === '111111111' || res.token?.startsWith('demo_') || res.token?.startsWith('admin_'))) {
        localStorage.setItem('swe_portal_demo_session', JSON.stringify({
          user: res.user,
          session: res.session,
          token: res.token || res.session.access_token
        }));
      }
      return { success: true, user: res.user };
    }

    return {
      success: false,
      error: res.error || 'Authentication failed. Please check your credentials.',
    };
  };

  /**
   * Register a new user using real Supabase Auth (supabase.auth.signUp)
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

    if (res.requiresEmailConfirmation) {
      return {
        success: true,
        requiresEmailConfirmation: true,
        user: res.user,
        message: res.message || 'Account registered! Please check your email to confirm your account before logging in.',
      };
    }

    if (res.session && res.user) {
      setCurrentUser(res.user);
      setSession(res.session);
      setToken(res.token || res.session.access_token || 'portal_token');
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

  const switchRole = (role: UserRole) => {
    if (!currentUser) return;
    const updated = { ...currentUser, role, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);
    authService.updateUser(updated);
  };

  const updateUserInContext = async (updated: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (currentUser) {
      const newObj = { ...currentUser, ...updated, updatedAt: new Date().toISOString() };
      setCurrentUser(newObj);
      
      // Update demo session storage if applicable
      if (typeof window !== 'undefined') {
        const storedDemo = localStorage.getItem('swe_portal_demo_session');
        if (storedDemo) {
          try {
            const parsed = JSON.parse(storedDemo);
            localStorage.setItem('swe_portal_demo_session', JSON.stringify({
              ...parsed,
              user: newObj,
            }));
          } catch (e) {
            console.warn('Failed to update local demo session');
          }
        }
      }

      const res = await authService.updateUser(newObj);
      return res;
    }
    return { success: false, error: 'No authenticated user found' };
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
        isAuthenticated: !!currentUser && !!session,
        login,
        signup,
        logout,
        switchRole,
        updateUserInContext,
        refreshProfile,
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


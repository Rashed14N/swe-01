import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService, SignupParams } from '../services/authService';

export interface SignupData extends SignupParams {}

interface AuthContextType {
  currentUser: User | null;
  user: User | null;
  token: string | null;
  session: any | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (emailOrId: string, password?: string, role?: UserRole) => Promise<{ success: boolean; error?: string }> | any;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }> | any;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateUserInContext: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize and load saved session
  useEffect(() => {
    const currentSession = authService.getSession();
    if (currentSession) {
      setSession(currentSession);
      setCurrentUser(currentSession.user);
    }
    setLoading(false);
  }, []);

  const login = async (emailOrId: string, password?: string, role?: UserRole) => {
    try {
      // First attempt backend API login
      try {
        const apiRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: emailOrId, studentId: emailOrId, email: emailOrId, password: password || 'password123' }),
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data.token && data.user) {
            const newSession = {
              token: data.token,
              user: data.user,
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem('swe_portal_auth_session', JSON.stringify(newSession));
            authService.updateUser(data.user);
            setSession(newSession);
            setCurrentUser(data.user);
            return { success: true, user: data.user };
          }
        } else {
          const errData = await apiRes.json().catch(() => ({}));
          if (errData.error) {
            return { success: false, error: errData.error };
          }
        }
      } catch (backendErr) {
        // Fallback to local authService
      }

      // Fallback to local authService
      const res = authService.login(emailOrId, password, role);
      if (res.success && res.session) {
        setSession(res.session);
        setCurrentUser(res.session.user);
        return { success: true, user: res.session.user };
      }
      return { success: false, error: res.error || 'Invalid credentials. Please check your details or register.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const signup = async (data: SignupData) => {
    try {
      // First attempt backend API registration
      try {
        const apiRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (apiRes.ok) {
          const resData = await apiRes.json();
          if (resData.token && resData.user) {
            const newSession = {
              token: resData.token,
              user: resData.user,
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem('swe_portal_auth_session', JSON.stringify(newSession));
            authService.updateUser(resData.user);
            setSession(newSession);
            setCurrentUser(resData.user);
            return { success: true, user: resData.user };
          }
        } else {
          const errData = await apiRes.json().catch(() => ({}));
          if (errData.error) {
            return { success: false, error: errData.error };
          }
        }
      } catch (backendErr) {
        // Fallback to local authService
      }

      // Fallback to local authService
      const res = authService.signUp(data);
      if (res.success && res.session) {
        setSession(res.session);
        setCurrentUser(res.session.user);
        return { success: true, user: res.session.user };
      }
      return { success: false, error: res.error || 'Sign up failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Sign up failed' };
    }
  };

  const logout = () => {
    authService.clearSession();
    setSession(null);
    setCurrentUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (!currentUser) return;
    const updated = authService.switchUserRole(currentUser.id, role);
    if (updated) {
      setCurrentUser(updated);
      setSession(authService.getSession());
    }
  };

  const updateUserInContext = (updated: Partial<User>) => {
    if (currentUser) {
      const newObj = { ...currentUser, ...updated };
      setCurrentUser(newObj);
      authService.updateUser(newObj);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        token: session?.token || null,
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

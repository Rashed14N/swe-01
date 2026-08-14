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
    } else {
      // Seed initial user for demo / quick preview
      const result = authService.login('tanvir.swe@student.mu.edu.bd', 'demo123', 'STUDENT');
      if (result.session) {
        setSession(result.session);
        setCurrentUser(result.session.user);
      }
    }
    setLoading(false);
  }, []);

  const login = async (emailOrId: string, password?: string, role?: UserRole) => {
    try {
      const res = authService.login(emailOrId, password, role);
      if (res.success && res.session) {
        setSession(res.session);
        setCurrentUser(res.session.user);
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid credentials' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const res = authService.signUp(data);
      if (res.success && res.session) {
        setSession(res.session);
        setCurrentUser(res.session.user);
        return { success: true };
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

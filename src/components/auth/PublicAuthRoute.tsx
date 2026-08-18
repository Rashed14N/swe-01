import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Loader2 } from 'lucide-react';

interface PublicAuthRouteProps {
  children: React.ReactNode;
}

export const PublicAuthRoute: React.FC<PublicAuthRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // 1. Initializing Authentication State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#1769E8] flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 mb-4 animate-bounce">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#0A2147]">
          <Loader2 className="w-4 h-4 animate-spin text-[#1769E8]" />
          <span>Verifying SWE Portal Session...</span>
        </div>
      </div>
    );
  }

  // 2. Already Logged In -> Redirect to requested target or appropriate role dashboard
  if (isAuthenticated && user) {
    const fromPath = (location.state as any)?.from?.pathname;
    if (fromPath && typeof fromPath === 'string' && fromPath !== '/login' && fromPath !== '/register' && fromPath !== '/unauthorized') {
      return <Navigate to={fromPath} replace />;
    }

    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'CR') {
      return <Navigate to="/cr/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Not Logged In -> Render Login/Register Form
  return <>{children}</>;
};

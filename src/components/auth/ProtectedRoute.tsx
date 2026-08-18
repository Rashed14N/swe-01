import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../layout/AppLayout';
import { UserRole } from '../../types';
import { Loader2 } from 'lucide-react';
import { SweLogo } from '../common/SweLogo';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const location = useLocation();

  // 1. Initializing Authentication State (Prevent Flicker)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 p-2 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-4 animate-bounce">
          <SweLogo variant="icon" size="sm" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#0A2147]">
          <Loader2 className="w-4 h-4 animate-spin text-[#1769E8]" />
          <span>Verifying SWE Portal Session...</span>
        </div>
      </div>
    );
  }

  // 2. Not Authenticated -> Redirect to Login with Return Path
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. User authenticated but profile/role invalid (or marked deleted/disabled)
  if (!user.role || user.status === 'DISABLED') {
    logout();
    return <Navigate to="/login" state={{ from: location, error: 'Account profile unavailable or disabled.' }} replace />;
  }

  // 4. Role Authorization Guard -> Redirect to /unauthorized if role not permitted
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" state={{ attemptedPath: location.pathname }} replace />;
  }

  // 5. Authorized -> Render standard App Layout
  return <AppLayout>{children}</AppLayout>;
};

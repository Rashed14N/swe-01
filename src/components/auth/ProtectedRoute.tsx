import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags, FeatureKey } from '../../context/FeatureFlagContext';
import { AppLayout } from '../layout/AppLayout';
import { UserRole } from '../../types';
import { Loader2, PowerOff, ArrowLeft, ShieldAlert } from 'lucide-react';
import { SweLogo } from '../common/SweLogo';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  featureKey?: FeatureKey;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, featureKey }) => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const { isFeatureEnabled, getFeature } = useFeatureFlags();
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

  // 5. Feature Toggle Enforcement
  if (featureKey && !isFeatureEnabled(featureKey)) {
    const flag = getFeature(featureKey);
    const featureTitle = flag?.name || 'This Feature';
    const disabledMessage =
      flag?.disabledMessage ||
      'This module has been temporarily turned off by the department administrator. Please check back later.';

    if (user.role !== 'ADMIN') {
      return (
        <AppLayout>
          <div className="min-h-[65vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                <PowerOff className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  Temporarily Turned Off
                </span>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  {featureTitle} Unavailable
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {disabledMessage}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </AppLayout>
      );
    }

    // Admin Preview Mode with clear warning banner
    return (
      <AppLayout>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Admin Preview:</strong> <strong>{featureTitle}</strong> is currently turned{' '}
              <span className="font-bold text-rose-600 dark:text-rose-400">OFF</span> for students &amp; CRs.
            </span>
          </div>
          <Link
            to="/admin/features"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors text-center"
          >
            Manage Feature Controls
          </Link>
        </div>
        {children}
      </AppLayout>
    );
  }

  // 6. Authorized -> Render standard App Layout
  return <AppLayout>{children}</AppLayout>;
};

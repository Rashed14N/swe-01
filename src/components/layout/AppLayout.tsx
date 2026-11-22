import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { ToastContainer } from '../common/ToastContainer';
import { AcademicChatbot } from '../chatbot/AcademicChatbot';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags } from '../../context/FeatureFlagContext';
import { trackFeatureUsage } from '../../services/analyticsTracker';

interface AppLayoutProps {
  children: React.ReactNode;
}

const HEARTBEAT_INTERVAL_MS = 30_000; // Flush exact active seconds every 30s

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { user, token } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();

  const activePathRef = useRef<string>(location.pathname);
  const lastFlushTimeRef = useRef<number>(Date.now());
  const userRef = useRef(user);
  const tokenRef = useRef(token);

  useEffect(() => {
    userRef.current = user;
    tokenRef.current = token;
  }, [user, token]);

  // Helper to flush exact elapsed active seconds since lastFlushTimeRef without double counting
  const flushActiveDuration = (pathOverride?: string) => {
    const activeUser = userRef.current;
    const activeToken = tokenRef.current;
    if (!activeUser || !activeToken) return;

    const now = Date.now();
    const elapsedSec = Math.round((now - lastFlushTimeRef.current) / 1000);
    lastFlushTimeRef.current = now;

    if (elapsedSec >= 2) {
      trackFeatureUsage({
        user: activeUser,
        token: activeToken,
        path: pathOverride || activePathRef.current,
        actionType: 'HEARTBEAT',
        durationSec: Math.min(300, elapsedSec),
      });
    }
  };

  // 1. Track route navigation: flush previous route's real duration, then record entry to new route
  useEffect(() => {
    if (!user || !token) return;

    const prevPath = activePathRef.current;
    if (prevPath && prevPath !== location.pathname) {
      flushActiveDuration(prevPath);
    }

    activePathRef.current = location.pathname;
    lastFlushTimeRef.current = Date.now();

    trackFeatureUsage({
      user,
      token,
      path: location.pathname,
      actionType: 'VIEW',
      durationSec: 0,
    });
  }, [location.pathname, user?.id, token]);

  // 2. Periodic active-time heartbeat + visibilitychange + pagehide flush
  useEffect(() => {
    if (!user || !token) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        flushActiveDuration();
      } else {
        // Keep clock aligned while tab is hidden so background time is not counted
        lastFlushTimeRef.current = Date.now();
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushActiveDuration();
      } else {
        lastFlushTimeRef.current = Date.now();
      }
    };

    const handlePageHide = () => {
      flushActiveDuration();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [user?.id, token]);

  useEffect(() => {
    const handleCloseSidebar = () => {
      setIsMobileOpen(false);
    };
    window.addEventListener('close-mobile-sidebar', handleCloseSidebar);
    return () => window.removeEventListener('close-mobile-sidebar', handleCloseSidebar);
  }, []);

  return (
    <div className="min-h-screen bg-[#EEF3F9] dark:bg-[#090F1E] text-[#0F172A] dark:text-[#F8FAFC] flex font-sans antialiased relative transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ${
          isCollapsed ? 'md:ml-20' : 'md:ml-60'
        }`}
      >
        <TopNavbar onOpenMobileMenu={() => setIsMobileOpen(true)} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">
          {children}
        </main>
      </div>

      {isFeatureEnabled('chatbot') && <AcademicChatbot />}
      <ToastContainer />
    </div>
  );
};

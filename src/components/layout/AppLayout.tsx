import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { ToastContainer } from '../common/ToastContainer';
import { useAuth } from '../../context/AuthContext';
import { trackFeatureUsage } from '../../services/analyticsTracker';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { user, token } = useAuth();
  const lastPathRef = useRef<string>(location.pathname);
  const enterTimeRef = useRef<number>(Date.now());

  // Track feature usage on location change
  useEffect(() => {
    const prevPath = lastPathRef.current;
    const durationSec = Math.round((Date.now() - enterTimeRef.current) / 1000);

    // Track previously visited path with its real duration if user spent > 2 seconds
    if (prevPath && durationSec >= 2 && user) {
      trackFeatureUsage({
        user,
        token,
        path: prevPath,
        actionType: 'VIEW',
        durationSec: Math.min(300, durationSec),
      });
    }

    lastPathRef.current = location.pathname;
    enterTimeRef.current = Date.now();

    // Track entry to the new path
    if (user) {
      trackFeatureUsage({
        user,
        token,
        path: location.pathname,
        actionType: 'VIEW',
        durationSec: 15,
      });
    }
  }, [location.pathname, user, token]);

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

      <ToastContainer />
    </div>
  );
};


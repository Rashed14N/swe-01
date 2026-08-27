import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { ToastContainer } from '../common/ToastContainer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1500px] w-full mx-auto animate-panel-entry">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};


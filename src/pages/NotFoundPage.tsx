import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { SweLogo } from '../components/common/SweLogo';
import { useAuth } from '../context/AuthContext';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleDashboardRedirect = () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    if (user.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (user.role === 'CR') {
      navigate('/cr/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between font-sans">
      {/* Top Brand Bar */}
      <header className="h-16 px-6 flex items-center border-b border-slate-200/80 bg-white">
        <div className="flex items-center gap-2.5">
          <SweLogo variant="icon" size="sm" className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-xs" />
          <div>
            <span className="text-sm font-extrabold text-[#0A2147] tracking-tight block leading-tight">SWE Portal</span>
            <span className="text-[10px] text-slate-500 font-medium block">Metropolitan University</span>
          </div>
        </div>
      </header>

      {/* Main 404 Center Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-blue-50 border border-blue-100 text-[#1769E8] flex items-center justify-center mx-auto mb-6 shadow-xs">
            <FileQuestion className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold font-mono rounded-full mb-3 uppercase tracking-wider">
            Error 404
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0A2147] tracking-tight mb-3">
            Page not found
          </h1>

          <p className="text-sm sm:text-base text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
            The page you're looking for doesn't exist, has been removed, or the link you followed might be broken.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDashboardRedirect}
              className="w-full sm:w-auto py-3 px-6 bg-[#1769E8] hover:bg-[#1258C5] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <LayoutDashboard className="w-4 h-4" />
              {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto py-3 px-6 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500">
            <button onClick={() => navigate('/routine')} className="hover:text-[#1769E8] transition-colors">
              Class Routine
            </button>
            <span>•</span>
            <button onClick={() => navigate('/courses')} className="hover:text-[#1769E8] transition-colors">
              Courses
            </button>
            <span>•</span>
            <button onClick={() => navigate('/resources/notes')} className="hover:text-[#1769E8] transition-colors">
              Lecture Notes
            </button>
            <span>•</span>
            <button onClick={() => navigate('/notices')} className="hover:text-[#1769E8] transition-colors">
              Notices
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Department of Software Engineering • Metropolitan University
      </footer>
    </div>
  );
};

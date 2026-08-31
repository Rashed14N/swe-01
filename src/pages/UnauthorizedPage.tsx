import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';
import { SweLogo } from '../components/common/SweLogo';
import { useAuth } from '../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleDashboardRedirect = () => {
    if (!user) {
      navigate('/login');
      return;
    }
<<<<<<< HEAD
    if (user.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (user.role === 'CR') {
=======
    if (user.role === 'CR') {
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      navigate('/cr/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between font-sans">
      {/* Top Brand Bar */}
      <header className="h-16 px-6 flex items-center border-b border-slate-200/80 bg-white">
        <div className="flex items-center gap-2.5">
          <SweLogo variant="icon" size="sm" />
          <div>
            <span className="text-sm font-extrabold text-[#0A2147] tracking-tight block leading-tight">SWE Portal</span>
            <span className="text-[10px] text-slate-500 font-medium block">Metropolitan University</span>
          </div>
        </div>
      </header>

      {/* Main 403 Center Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-rose-100 shadow-xl p-8 sm:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-6 shadow-xs">
            <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="inline-block px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold font-mono rounded-full mb-3 uppercase tracking-wider">
            Access Restricted (403)
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0A2147] tracking-tight mb-3">
            Permission Denied
          </h1>

          <p className="text-sm sm:text-base text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
            You do not have the required role permissions to access this administrative or management route.
          </p>

          {user && (
            <div className="mb-8 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-left max-w-sm mx-auto">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Logged In As</span>
                  <span className="font-extrabold text-slate-800 text-sm">{user.name}</span>
                </div>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-blue-700 text-xs uppercase shadow-2xs">
                  Role: {user.role}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDashboardRedirect}
              className="w-full sm:w-auto py-3 px-6 bg-[#1769E8] hover:bg-[#1258C5] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <LayoutDashboard className="w-4 h-4" />
              Return to Your Dashboard
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

          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign in with a different account
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

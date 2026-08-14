import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  User as UserIcon, 
  KeyRound, 
  Sparkles, 
  Mail, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  Layers, 
  IdCard,
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LoginPageProps {
  initialMode?: 'LOGIN' | 'REGISTER';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode = 'LOGIN' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, logout, isAuthenticated, user } = useAuth();

  // Check if URL has ?mode=register or initialMode is REGISTER
  const searchParams = new URLSearchParams(location.search);
  const urlMode = searchParams.get('mode') === 'register' ? 'REGISTER' : initialMode;

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(urlMode);

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setMode('REGISTER');
    }
  }, [location.search]);

  // LOGIN STATE
  const [studentIdOrEmail, setStudentIdOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // REGISTER STATE
  const [regName, setRegName] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('STUDENT');
  const [regBatchName, setRegBatchName] = useState('58th Batch');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [isRegLoading, setIsRegLoading] = useState(false);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoginLoading(true);

    const res = await login(studentIdOrEmail.trim(), loginPassword);
    setIsLoginLoading(false);

    if (res?.success || res === true) {
      navigate('/dashboard');
    } else {
      setLoginError(res?.error || 'Authentication failed. Please check your credentials.');
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    // Form Validations for Beginners
    if (!regName.trim()) {
      setRegError('Please enter your Full Name.');
      return;
    }
    if (!regStudentId.trim()) {
      setRegError('Please enter your Student / University ID.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 4) {
      setRegError('Password must be at least 4 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Password and Confirm Password do not match.');
      return;
    }

    setIsRegLoading(true);

    try {
      const batchId = regBatchName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const res = await signup({
        name: regName.trim(),
        studentId: regStudentId.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        role: regRole,
        batchId: batchId || 'batch_58',
        batchName: regBatchName.trim() || '58th Batch',
        password: regPassword,
      });

      setIsRegLoading(false);

      if (res?.success) {
        setRegSuccess('🎉 Account successfully registered! Redirecting to your dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setRegError(res?.error || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setIsRegLoading(false);
      setRegError(err.message || 'An unexpected error occurred during registration.');
    }
  };

  // One-click quick demo accounts
  const handleDemoSelect = async (demoId: string, demoPass: string) => {
    setStudentIdOrEmail(demoId);
    setLoginPassword(demoPass);
    setLoginError(null);
    setIsLoginLoading(true);

    const res = await login(demoId, demoPass);
    setIsLoginLoading(false);

    if (res?.success || res === true) {
      navigate('/dashboard');
    } else {
      setLoginError(res?.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Brand Panel */}
        <div
          style={{
            background: 'linear-gradient(180deg, #041E4A 0%, #062A63 55%, #073B82 100%)',
          }}
          className="md:w-[48%] p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

          <div>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/30">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white block">
                  SWE Portal
                </span>
                <span className="text-xs text-slate-300 block">
                  Dept. of Software Engineering
                </span>
              </div>
            </div>

            <div className="mt-10 md:mt-14 max-w-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Academic & Student Hub
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight tracking-tight">
                {mode === 'LOGIN' 
                  ? 'Access Academic Info, Routine & Resources.'
                  : 'Create Your Student or Representative Account.'}
              </h2>
              <p className="mt-4 text-xs md:text-sm text-slate-300 leading-relaxed">
                Stay updated with live class routines, downloadable course materials, past question papers, and instant notices from class representatives & department authority.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">Verified Academic Access</span>
                <span className="text-slate-300 text-[11px]">Separate role-tailored dashboards for Students, CRs & Admins</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2">
              © {new Date().getFullYear()} Department of Software Engineering • Metropolitan University
            </div>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="md:w-[52%] p-6 md:p-10 bg-white flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            
            {/* Active Session Info if already logged in */}
            {isAuthenticated && user && (
              <div className="mb-5 p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-blue-900">Current Login:</span>
                    <span className="font-extrabold text-slate-900">{user.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700">
                    ID: {user.studentId || user.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (user.role === 'ADMIN') navigate('/admin/dashboard');
                      else if (user.role === 'CR') navigate('/cr/dashboard');
                      else navigate('/dashboard');
                    }}
                    className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors text-center"
                  >
                    Go to Dashboard →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setLoginError(null);
                      setRegSuccess(null);
                    }}
                    className="py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-lg text-xs transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* Top Switcher: Sign In vs Register Now */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 border border-slate-200">
              <button
                type="button"
                id="btn-switch-login"
                onClick={() => {
                  setMode('LOGIN');
                  setLoginError(null);
                }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'LOGIN'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
              
              <button
                type="button"
                id="btn-switch-register"
                onClick={() => {
                  setMode('REGISTER');
                  setRegError(null);
                }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'REGISTER'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <UserPlus className="w-4 h-4" /> Register Now
              </button>
            </div>

            {/* ===================== SIGN IN FORM ===================== */}
            {mode === 'LOGIN' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Welcome Back! 👋
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your Student ID or Email to access your dashboard.
                  </p>
                </div>

                {loginError && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Student ID or Email Address
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        id="input-login-id"
                        value={studentIdOrEmail}
                        onChange={e => setStudentIdOrEmail(e.target.value)}
                        placeholder="e.g. 252-134-022 or name@student.mu.edu.bd"
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => alert('Demo Mode: You can use any password or click one of the Demo Accounts below!')}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        id="input-login-password"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="rounded text-blue-600 border-slate-300 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Remember my login</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-signin"
                    disabled={isLoginLoading}
                    className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] mt-2"
                  >
                    {isLoginLoading ? 'Signing In...' : 'Sign In to Portal'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Prompt to Register */}
                <div className="mt-5 text-center p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <p className="text-xs text-slate-600">
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      id="btn-goto-register"
                      onClick={() => {
                        setMode('REGISTER');
                        setRegError(null);
                      }}
                      className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Register Now <ArrowRight className="w-3 h-3" />
                    </button>
                  </p>
                </div>

                {/* One-Click Demo Accounts */}
                <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> One-Click Quick Demo Accounts
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDemoSelect('252-134-022', 'password123')}
                      className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-left transition-all group"
                    >
                      <span className="text-[10px] font-bold text-blue-600 block uppercase">Student</span>
                      <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-blue-700">Tanvir / Rashed</span>
                      <span className="text-[10px] text-slate-500">58th Batch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoSelect('252-134-001', 'password123')}
                      className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 text-left transition-all group"
                    >
                      <span className="text-[10px] font-bold text-amber-600 block uppercase">Class Rep (CR)</span>
                      <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-amber-700">Naimur / Mahmud</span>
                      <span className="text-[10px] text-slate-500">CR Dashboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoSelect('ADMIN-001', 'password123')}
                      className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/60 text-left transition-all group"
                    >
                      <span className="text-[10px] font-bold text-rose-600 block uppercase">Admin</span>
                      <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-rose-700">Dr. Mahbubur</span>
                      <span className="text-[10px] text-slate-500">Full System</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== REGISTER NOW FORM ===================== */}
            {mode === 'REGISTER' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    Create New Account <Sparkles className="w-4 h-4 text-blue-600" />
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fill in your details below to register and access the portal.
                  </p>
                </div>

                {regError && (
                  <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    {regError}
                  </div>
                )}

                {regSuccess && (
                  <div className="mb-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {regSuccess}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        id="input-reg-name"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="e.g. Rashedul Hasan"
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Student ID & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Student / Univ. ID *
                      </label>
                      <div className="relative">
                        <IdCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          id="input-reg-studentid"
                          value={regStudentId}
                          onChange={e => setRegStudentId(e.target.value)}
                          placeholder="e.g. 252-134-022"
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          id="input-reg-email"
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          placeholder="student@mu.edu.bd"
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role & Batch Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Role *
                      </label>
                      <select
                        id="select-reg-role"
                        value={regRole}
                        onChange={e => setRegRole(e.target.value as UserRole)}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                      >
                        <option value="STUDENT">Student</option>
                        <option value="CR">Class Representative (CR)</option>
                        <option value="ADMIN">Faculty / Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Batch Name *
                      </label>
                      <select
                        id="select-reg-batch"
                        value={regBatchName}
                        onChange={e => setRegBatchName(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                      >
                        <option value="58th Batch">58th Batch (Semester 5)</option>
                        <option value="59th Batch">59th Batch (Semester 4)</option>
                        <option value="60th Batch">60th Batch (Semester 3)</option>
                        <option value="61st Batch">61st Batch (Semester 2)</option>
                        <option value="62nd Batch">62nd Batch (Semester 1)</option>
                        <option value="9th Batch">9th Batch (Evening / Master's)</option>
                        <option value="General Batch">Other / General Batch</option>
                      </select>
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          id="input-reg-password"
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-8 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        id="input-reg-confirmpassword"
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Register Submit Button */}
                  <button
                    type="submit"
                    id="btn-submit-register"
                    disabled={isRegLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] mt-3"
                  >
                    {isRegLoading ? 'Creating Your Account...' : 'Complete Registration & Enter Portal'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Back to Sign In Link */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      id="btn-goto-signin"
                      onClick={() => {
                        setMode('LOGIN');
                        setLoginError(null);
                      }}
                      className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Sign In here
                    </button>
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap,
  ShieldCheck,
  ArrowRight, 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  KeyRound, 
  Mail, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  Layers, 
  IdCard,
  Phone
} from 'lucide-react';
import { SweLogo } from '../components/common/SweLogo';
import { useAuth } from '../context/AuthContext';
import { UserRole, Batch } from '../types';

const FALLBACK_BATCHES: Batch[] = [
  { id: 'batch-8', name: 'SWE 8th Batch', admissionYear: 2022, currentSemester: 5, academicSession: '2022-2023', semesterMode: 'SEQUENCE', status: 'ACTIVE', crIds: [], createdAt: '' },
  { id: 'batch-9', name: 'SWE 9th Batch', admissionYear: 2023, currentSemester: 4, academicSession: '2023-2024', semesterMode: 'SEQUENCE', status: 'ACTIVE', crIds: [], createdAt: '' },
  { id: 'batch-10', name: 'SWE 10th Batch', admissionYear: 2024, currentSemester: 3, academicSession: '2024-2025', semesterMode: 'SEQUENCE', status: 'ACTIVE', crIds: [], createdAt: '' },
  { id: 'batch-11', name: 'SWE 11th Batch', admissionYear: 2025, currentSemester: 2, academicSession: '2025-2026', semesterMode: 'SEQUENCE', status: 'ACTIVE', crIds: [], createdAt: '' },
  { id: 'batch-12', name: 'SWE 12th Batch', admissionYear: 2026, currentSemester: 1, academicSession: '2026-2027', semesterMode: 'SEQUENCE', status: 'ACTIVE', crIds: [], createdAt: '' },
  { id: 'batch-7', name: 'SWE 7th Batch', admissionYear: 2021, currentSemester: 8, academicSession: '2021-2022', semesterMode: 'MANUAL', status: 'GRADUATED', crIds: [], createdAt: '' },
  { id: 'batch-6', name: 'SWE 6th Batch', admissionYear: 2020, currentSemester: 8, academicSession: '2020-2021', semesterMode: 'MANUAL', status: 'GRADUATED', crIds: [], createdAt: '' },
  { id: 'batch-5', name: 'SWE 5th Batch', admissionYear: 2019, currentSemester: 8, academicSession: '2019-2020', semesterMode: 'MANUAL', status: 'GRADUATED', crIds: [], createdAt: '' },
];

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

  // Dynamic Batches from Database
  const [batches, setBatches] = useState<Batch[]>(FALLBACK_BATCHES);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setMode('REGISTER');
    }
  }, [location.search]);

  // Fetch live batches for registration dropdown
  useEffect(() => {
    let isMounted = true;
    setIsLoadingBatches(true);
    fetch('/api/batches')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (Array.isArray(data?.batches) && data.batches.length > 0) {
          // Keep all batches created by Admin, sort chronologically/by admission year
          const sorted = [...data.batches].sort((a: Batch, b: Batch) => {
            return (a.admissionYear || 0) - (b.admissionYear || 0) || a.name.localeCompare(b.name);
          });
          setBatches(sorted);
          if (!sorted.some(b => b.id === selectedBatchId)) {
            setSelectedBatchId(sorted[0].id);
          }
        }
      })
      .catch(err => {
        console.warn('Could not fetch live batches for register form, using defaults:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBatches(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // LOGIN STATE
  const [studentIdOrEmail, setStudentIdOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // REGISTER STATE (Strictly STUDENT for self-registration)
  const [regName, setRegName] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('batch-9');
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

    if (res?.success) {
      const loggedUser = res?.user;
      if (loggedUser?.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (loggedUser?.role === 'CR') {
        navigate('/cr/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      setLoginError(res?.error || 'Authentication failed. Please check your credentials.');
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    // Form Validations
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
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Password and Confirm Password do not match.');
      return;
    }

    setIsRegLoading(true);

    try {
      const chosenBatch = batches.find(b => b.id === selectedBatchId) || batches[0] || {
        id: 'batch-9',
        name: 'SWE 9th Batch',
        currentSemester: 4,
      };

      const res = await signup({
        name: regName.trim(),
        studentId: regStudentId.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        role: 'STUDENT', // Strictly forced to STUDENT for public registration
        batchId: chosenBatch.id,
        batchName: chosenBatch.name,
        currentSemester: chosenBatch.currentSemester,
        password: regPassword,
      });

      setIsRegLoading(false);

      if (res?.success) {
        if (res.requiresEmailConfirmation) {
          setRegSuccess(res.message || '🎉 Registration successful! Please check your email inbox to confirm your account, then log in.');
          setStudentIdOrEmail(regEmail.trim());
          setTimeout(() => {
            setMode('LOGIN');
          }, 3000);
        } else {
          setRegSuccess('🎉 Account successfully registered! Redirecting to student dashboard...');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 800);
        }
      } else {
        setRegError(res?.error || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setIsRegLoading(false);
      setRegError(err.message || 'An unexpected error occurred during registration.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-3 sm:p-5 md:p-8 font-sans relative overflow-hidden">
      
      {/* 3 Dynamic Theme-Color Light Rays (Blue, Cyan, Indigo) */}
      
      {/* Ray 1: Top-Left to Center-Right Wide Royal Blue Ray */}
      <div 
        className="absolute -top-32 -left-20 w-[120vw] h-[35rem] pointer-events-none origin-top-left -rotate-[22deg] opacity-75"
        style={{
          background: 'linear-gradient(90deg, rgba(37,99,235,0.18) 0%, rgba(56,189,248,0.12) 35%, rgba(255,255,255,0) 80%)',
          filter: 'blur(35px)',
        }}
      />

      {/* Ray 2: Bottom-Right to Center-Left Sweeping Cyan/Sky Ray */}
      <div 
        className="absolute -bottom-40 -right-20 w-[110vw] h-[30rem] pointer-events-none origin-bottom-right rotate-[28deg] opacity-70"
        style={{
          background: 'linear-gradient(270deg, rgba(6,182,212,0.18) 0%, rgba(59,130,246,0.12) 40%, rgba(255,255,255,0) 85%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Ray 3: Top-Right Diagonal Indigo/Cobalt Beam */}
      <div 
        className="absolute -top-20 -right-10 w-[80vw] h-[22rem] pointer-events-none origin-top-right -rotate-[35deg] opacity-60"
        style={{
          background: 'linear-gradient(270deg, rgba(99,102,241,0.15) 0%, rgba(37,99,235,0.08) 50%, rgba(255,255,255,0) 90%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Soft Ambient Depth Glows */}
      <div className="absolute top-1/4 left-1/5 w-96 h-96 rounded-full bg-blue-400/10 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-400/10 blur-[90px] pointer-events-none" />
      
      {/* Subtle Precision Light Micro-Dot Matrix */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(100, 116, 139, 0.22) 1.2px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Modern Architectural Geometric Rings */}
      <div className="absolute top-10 left-10 w-44 h-44 border border-slate-300/50 rounded-full pointer-events-none" />
      <div className="absolute top-16 left-16 w-32 h-32 border border-dashed border-blue-400/40 rounded-full pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-56 h-56 border border-slate-300/45 rounded-3xl rotate-12 pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-40 h-40 border border-cyan-400/35 rounded-2xl -rotate-6 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-300/70 border border-slate-200/90 overflow-hidden flex flex-col md:flex-row"
      >
        
        {/* Left Brand Panel (Desktop) */}
        <div
          style={{
            background: 'linear-gradient(180deg, #041E4A 0%, #062A63 55%, #073B82 100%)',
          }}
          className="hidden md:flex md:w-[48%] p-8 md:p-12 text-white flex-col justify-between relative overflow-hidden shrink-0"
        >
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-400 blur-3xl pointer-events-none" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-400 blur-3xl pointer-events-none" 
          />

          <div>
            {/* SWE Logo Header */}
            <div className="flex items-center gap-3.5">
              <SweLogo variant="icon" size="lg" />
              <div>
                <span className="text-xl lg:text-[22px] font-extrabold tracking-tight text-white block leading-tight">
                  Student Portal
                </span>
                <span className="text-xs text-blue-200 block font-medium mt-0.5">
                  Department of Software Engineering
                </span>
              </div>
            </div>

            <div className="mt-10 md:mt-14 max-w-md">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/20 mb-3.5 uppercase tracking-wider">
                <GraduationCap className="w-3.5 h-3.5 text-blue-300" /> ACADEMIC & STUDENT HUB
              </span>
              <h2 className="text-2xl lg:text-[28px] font-extrabold text-white leading-tight tracking-tight">
                <span className="block">Your Central Gateway</span>
                <span className="block">to Academic Excellence.</span>
              </h2>
              <p className="mt-4 text-xs md:text-sm text-slate-300 leading-relaxed">
                Access class routines, course resources, exam updates, department notices, and important batch announcements from one organized portal.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block uppercase tracking-wide text-[11px]">
                  VERIFIED ACADEMIC ACCESS
                </span>
                <span className="text-slate-300 text-[11px] leading-tight block mt-0.5">
                  Students & Class Representatives can sign in only.<br />
                  CR and Admin access is assigned by the department.
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2">
              © 2026 Department of Software Engineering • Metropolitan University
            </div>
          </div>
        </div>

        {/* Right Form Area & Mobile Container */}
        <div className="w-full md:w-[52%] flex flex-col justify-between">
          
          {/* Mobile Top Header */}
          <div className="md:hidden bg-gradient-to-r from-[#041E4A] via-[#062A63] to-[#073B82] p-4 sm:p-5 text-white flex items-center gap-3 border-b border-blue-900/30">
            <SweLogo variant="icon" size="sm" />
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-tight">
                Student Portal
              </span>
              <span className="text-xs text-blue-200 block font-medium mt-0.5">
                Department of Software Engineering
              </span>
            </div>
          </div>

          {/* Form Content Area */}
          <div className="p-6 md:p-10 bg-gradient-to-br from-[#FAFCFF] via-[#F4F7FC] to-[#EDF2FA] flex-1 flex flex-col justify-center relative overflow-hidden">
            {/* Delicate Theme Tint Ambient Glows (low visibility, not dense) */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-500/[0.05] blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-indigo-500/[0.04] blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-sky-400/[0.03] blur-3xl pointer-events-none" />
            
            <div className="max-w-md w-full mx-auto relative z-10">
            
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

            {/* Top Switcher: Clean Sleek Segmented Control */}
            <div className="relative bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/90 flex items-center shadow-xs">
              <button
                type="button"
                id="btn-switch-login"
                onClick={() => {
                  setMode('LOGIN');
                  setLoginError(null);
                }}
                className={`relative z-10 flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 rounded-lg select-none whitespace-nowrap cursor-pointer ${
                  mode === 'LOGIN' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Sign In</span>
                {mode === 'LOGIN' && (
                  <motion.div
                    layoutId="activeAuthTabPill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-0 bg-[#0B4491] rounded-lg shadow-md shadow-blue-950/20 -z-10"
                  />
                )}
              </button>
              
              <button
                type="button"
                id="btn-switch-register"
                onClick={() => {
                  setMode('REGISTER');
                  setRegError(null);
                }}
                className={`relative z-10 flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 rounded-lg select-none whitespace-nowrap cursor-pointer ${
                  mode === 'REGISTER' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Register</span>
                {mode === 'REGISTER' && (
                  <motion.div
                    layoutId="activeAuthTabPill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-0 bg-[#0B4491] rounded-lg shadow-md shadow-blue-950/20 -z-10"
                  />
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ===================== SIGN IN FORM ===================== */}
              {mode === 'LOGIN' ? (
                <motion.div
                  key="login-view"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 14 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {loginError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2.5 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      {loginError}
                    </motion.div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1.5">
                        Student ID or Email
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          id="input-login-id"
                          value={studentIdOrEmail}
                          onChange={e => setStudentIdOrEmail(e.target.value)}
                          placeholder="Enter your student ID or email"
                          className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl pl-10 pr-4 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-medium shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-bold text-slate-800">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => alert('Please enter your registered password. If you forgot your password, contact your CR or Department Support.')}
                          className="text-xs sm:text-sm text-[#0B4491] font-bold hover:underline"
                        >
                          Help?
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          id="input-login-password"
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl pl-10 pr-10 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-medium shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="rounded text-[#0B4491] border-slate-300 focus:ring-[#0B4491] w-4 h-4 cursor-pointer"
                        />
                        <span>Remember my login</span>
                      </label>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      id="btn-submit-signin"
                      disabled={isLoginLoading}
                      className="w-full py-3.5 bg-[#0B4491] hover:bg-[#08336E] text-white text-sm sm:text-base font-bold rounded-xl shadow-lg shadow-blue-900/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
                    >
                      {isLoginLoading ? 'Signing In...' : 'Sign In to Portal'} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                  </form>

                  {/* Quick Demo Student Account for Testing */}
                  <div className="mt-3.5 p-2.5 sm:p-3 rounded-xl bg-blue-50/80 border border-blue-100/90 flex items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-[#0B4491] text-white font-bold text-[10px] tracking-wider uppercase shrink-0">
                        Demo
                      </span>
                      <span className="truncate text-slate-600 text-[11px] sm:text-xs">
                        ID: <strong className="text-slate-900 font-mono">111111111</strong> • Pass: <strong className="text-slate-900 font-mono">password</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentIdOrEmail('111111111');
                        setLoginPassword('password');
                        setLoginError(null);
                      }}
                      className="text-[11px] font-bold text-[#0B4491] hover:text-[#08336E] bg-white hover:bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-200/80 shadow-2xs transition-colors shrink-0 cursor-pointer"
                    >
                      Auto-fill
                    </button>
                  </div>

                  {/* Prompt to Register */}
                  <div className="mt-4 text-center p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl">
                    <p className="text-xs sm:text-sm text-slate-600">
                      Don't have an account yet?{' '}
                      <button
                        type="button"
                        id="btn-goto-register"
                        onClick={() => {
                          setMode('REGISTER');
                          setRegError(null);
                        }}
                        className="text-[#0B4491] font-extrabold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Register Now <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* ===================== REGISTER NOW FORM ===================== */
                <motion.div
                  key="register-view"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {regError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="mb-3.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2.5 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      {regError}
                    </motion.div>
                  )}

                  {regSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="mb-3.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {regSuccess}
                    </motion.div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          id="input-reg-name"
                          value={regName}
                          onChange={e => setRegName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl pl-10 pr-3.5 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-medium shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Student ID & Email Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">
                          Student ID *
                        </label>
                        <div className="relative">
                          <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            id="input-reg-studentid"
                            value={regStudentId}
                            onChange={e => setRegStudentId(e.target.value)}
                            placeholder="Enter your student ID"
                            className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl pl-10 pr-3.5 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-medium shadow-2xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            id="input-reg-email"
                            value={regEmail}
                            onChange={e => setRegEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl pl-10 pr-3.5 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-medium shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Batch Selection & Contact Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-bold text-slate-800">
                            Batch *
                          </label>
                          {isLoadingBatches && (
                            <span className="text-xs text-[#0B4491] font-semibold animate-pulse">Syncing...</span>
                          )}
                        </div>
                        <div className="relative">
                          <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            id="select-reg-batch"
                            value={selectedBatchId}
                            onChange={e => setSelectedBatchId(e.target.value)}
                            className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl pl-10 pr-3.5 py-3 text-sm sm:text-base text-slate-900 focus:outline-none font-medium cursor-pointer shadow-2xs"
                          >
                            {batches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">
                          Phone Number (Optional)
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            id="input-reg-phone"
                            value={regPhone}
                            onChange={e => setRegPhone(e.target.value)}
                            placeholder="Enter your phone number"
                            className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl pl-10 pr-3.5 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-medium shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">
                          Password *
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            id="input-reg-password"
                            value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl pl-10 pr-9 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-medium shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          id="input-reg-confirmpassword"
                          value={regConfirmPassword}
                          onChange={e => setRegConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0B4491] focus:ring-4 focus:ring-blue-500/15 rounded-xl px-3.5 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-medium shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Register Submit Button */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      id="btn-submit-register"
                      disabled={isRegLoading}
                      className="w-full py-3.5 bg-[#0B4491] hover:bg-[#08336E] text-white text-sm sm:text-base font-bold rounded-xl shadow-lg shadow-blue-900/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-3 cursor-pointer"
                    >
                      {isRegLoading ? 'Creating Your Account...' : 'Complete Registration & Enter Portal'} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                  </form>

                  {/* Back to Sign In Link */}
                  <div className="mt-4 text-center">
                    <p className="text-xs sm:text-sm text-slate-600">
                      Already have an account?{' '}
                      <button
                        type="button"
                        id="btn-goto-signin"
                        onClick={() => {
                          setMode('LOGIN');
                          setLoginError(null);
                        }}
                        className="text-[#0B4491] font-extrabold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Sign In here
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            </div>
          </div>

          {/* Mobile Bottom Info Section (Photo 3 & Remaining Left Panel Details on Mobile) */}
          <div 
            style={{
              background: 'linear-gradient(180deg, #041E4A 0%, #062A63 55%, #073B82 100%)',
            }}
            className="md:hidden p-6 text-white border-t border-slate-200/80 relative overflow-hidden"
          >
            <div className="max-w-md mx-auto relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-200 border border-blue-400/20 mb-3 uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-blue-300" /> ACADEMIC & STUDENT HUB
              </span>
              <h2 className="text-2xl font-extrabold text-white leading-tight tracking-tight">
                <span className="block">Your Central Gateway</span>
                <span className="block">to Academic Excellence.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Access class routines, course resources, exam updates, department notices, and important batch announcements from one organized portal.
              </p>

              <div className="mt-5 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-white block uppercase tracking-wide text-xs">
                    VERIFIED ACADEMIC ACCESS
                  </span>
                  <span className="text-slate-300 text-xs sm:text-sm leading-tight block mt-1">
                    Students & Class Representatives can sign in only.<br />
                    CR and Admin access is assigned by the department.
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-5 text-center">
                © 2026 Department of Software Engineering • Metropolitan University
              </div>
            </div>
          </div>

        </div>

      </motion.div>
    </div>
  );
};

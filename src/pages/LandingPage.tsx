import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Calendar, Shield, Users, ArrowRight,
  Sparkles, CheckCircle2, Award, Clock, FileText,
  ChevronRight, LogIn, HelpCircle
} from 'lucide-react';
import { SweLogo } from '../components/common/SweLogo';
import { DepartmentNotice, Faculty, sortFacultyByHierarchy } from '../types';
import { fetchNoticesFromSupabase } from '../services/supabaseDataService';

const FALLBACK_NOTICES: DepartmentNotice[] = [
  {
    id: 'n_1',
    title: 'Department Seminar on Software Architecture & Microservices',
    content: 'Special seminar session conducted by industry guest speakers for all batches.',
    category: 'SEMINAR',
    publishDate: '2026-08-20',
    isImportant: true,
    createdBy: 'admin',
    createdByName: 'Department Office',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n_2',
    title: 'Final Examination Guidelines & Routine Notice',
    content: 'Guidelines and schedule for upcoming semester final examinations.',
    category: 'EXAM',
    publishDate: '2026-08-18',
    isImportant: true,
    createdBy: 'admin',
    createdByName: 'Exam Committee',
    createdAt: new Date().toISOString(),
  },
];

const FALLBACK_FACULTY: Faculty[] = [
  {
    id: 'fac_1',
    name: 'Fuad Ahmed',
    shortName: 'FA',
    designation: 'Professor & Head',
    department: 'Department of Software Engineering',
    phone: '+8801611829316',
    email: 'fahmed@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_2',
    name: 'Nazia Sultana Chowdhury',
    shortName: 'NSC',
    designation: 'Assistant Professor',
    department: 'Department of Software Engineering',
    phone: '+8801627055017',
    email: 'nazia@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_3',
    name: 'Rina Paul',
    shortName: 'RP',
    designation: 'Assistant Professor',
    department: 'Department of Software Engineering',
    phone: '+8801319931147',
    email: 'rina@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_4',
    name: 'Al Akram Chowdhury',
    shortName: 'AAC',
    designation: 'Assistant Professor',
    department: 'Department of Software Engineering',
    phone: '+8801730980003',
    email: 'akram@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_5',
    name: 'Wadia Iqbal Chowdhury',
    shortName: 'WIC',
    designation: 'Lecturer',
    department: 'Department of Software Engineering',
    phone: '+8801758305093',
    email: 'wadia@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_6',
    name: 'Iffat Ahmed Chowdhury Nahid',
    shortName: 'IAC',
    designation: 'Lecturer',
    department: 'Department of Software Engineering',
    phone: '+8801724296767',
    email: 'nahid@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_7',
    name: 'Nazia Hassan',
    shortName: 'NHN',
    designation: 'Lecturer',
    department: 'Department of Software Engineering',
    phone: '+8801777264878',
    email: 'naziahassan@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_8',
    name: 'Syeda Sanjida Rahman',
    shortName: 'SSR',
    designation: 'Lecturer',
    department: 'Department of Software Engineering',
    phone: '+8801783852026',
    email: 'sanjida@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_9',
    name: 'Dhiman Dash',
    shortName: 'DD',
    designation: 'Lecturer',
    department: 'Department of Software Engineering',
    phone: '+8801764619468',
    email: 'dhiman@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_10',
    name: 'Lukman Hussain Nakib',
    shortName: 'LN',
    designation: 'Lecturer',
    department: 'Department of Software Engineering',
    phone: '+8801738779684',
    email: 'nakib@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_11',
    name: 'Mridul Kanti Bhattacharjee',
    shortName: 'MKB',
    designation: 'Adjunct Faculty',
    department: 'Department of Software Engineering',
    phone: '+8801763784158',
    email: 'mridul@metrouni.edu.bd',
    assignedCourses: [],
  },
  {
    id: 'fac_12',
    name: 'Nasrin Akter Tanya',
    shortName: 'NAT',
    designation: 'Lecturer (Study Leave)',
    department: 'Department of Software Engineering',
    phone: '+8801716942150',
    email: 'tanya@metrouni.edu.bd',
    assignedCourses: [],
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<DepartmentNotice[]>(FALLBACK_NOTICES);
  const [facultyList, setFacultyList] = useState<Faculty[]>(() => sortFacultyByHierarchy(FALLBACK_FACULTY));

  useEffect(() => {
    fetchNoticesFromSupabase()
      .then(data => {
        if (data && data.length > 0) setNotices(data.slice(0, 3));
      })
      .catch(() => {});

    fetch('/api/faculty')
      .then(res => res.json())
      .then(data => {
        if (data && data.faculty && data.faculty.length > 0) {
          setFacultyList(sortFacultyByHierarchy(data.faculty));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#070D18] text-white selection:bg-blue-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[600px] -left-40 w-[600px] h-[600px] bg-sky-500/10 blur-[140px] rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-slate-800/80 bg-[#070D18]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <SweLogo theme="navy" size="md" />
            <div>
              <span className="text-base font-bold tracking-tight text-white block">
                SWE Student Portal
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                Dept. of Software Engineering
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#notices" className="hover:text-blue-400 transition-colors">Department Notices</a>
            <a href="#features" className="hover:text-blue-400 transition-colors">Portal Features</a>
            <a href="#faculty" className="hover:text-blue-400 transition-colors">Faculty Directory</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" /> Portal Access
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" /> Department Academic Management System
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1] mb-6">
          One Central Hub for <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400">
            SWE Academic Life
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          Access daily class schedules, enrolled courses, upcoming exam dates, past question archives, lecture notes, and official department notices in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            Launch Student Portal <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Class Representative & Admin Desk
          </button>
        </div>

        {/* Metrics Strip */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10 border-t border-slate-800/80">
          <div className="bg-slate-900/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-800/80 shadow-lg">
            <span className="text-2xl sm:text-3xl font-black text-white">10+</span>
            <span className="text-xs text-slate-400 block mt-1 font-medium">Active Batches</span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-800/80 shadow-lg">
            <span className="text-2xl sm:text-3xl font-black text-blue-400">500+</span>
            <span className="text-xs text-slate-400 block mt-1 font-medium">Questions & Notes</span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-800/80 shadow-lg">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">100%</span>
            <span className="text-xs text-slate-400 block mt-1 font-medium">Batch Isolation</span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-800/80 shadow-lg">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">24/7</span>
            <span className="text-xs text-slate-400 block mt-1 font-medium">Academic Access</span>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="relative z-10 py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Engineered for Academic Excellence</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Tailored tools for Software Engineering students, class representatives, and faculty members.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              Batch Class Routines
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Updated schedules for regular classes, lab sessions, makeup lectures, and classroom allocations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              Resource Repository
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Organized question banks, lecture slides, syllabus handouts, lab templates, and reference manuals.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              Exam & Notice Tracker
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Never miss midterm tests, final exam dates, assignment deadlines, and official department circulars.
            </p>
          </div>
        </div>
      </section>

      {/* Latest Department Notices Section */}
      <section id="notices" className="relative z-10 py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Latest Department Notices</h2>
            <p className="text-xs text-slate-400 mt-1">Official circulars published by Department Administration</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
          >
            All Notices <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {notices.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-xs text-slate-500">
              Loading notices or no notices published yet.
            </div>
          ) : (
            notices.map(notice => (
              <div
                key={notice.id}
                className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800/80 hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded-full uppercase">
                      {notice.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{notice.publishDate}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white line-clamp-2">{notice.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">{notice.content}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>By: {notice.createdByName}</span>
                  <span className="text-blue-400 font-semibold">Official Circular</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Action Banner */}
      <section className="relative z-10 py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-blue-900/40 to-slate-900/80 border border-blue-500/20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to access your batch routine and study resources?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">
            Sign in using your student credentials to view your class schedules, download exam question papers, and stay notified.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xl shadow-blue-500/25 transition-all inline-flex items-center gap-2 active:scale-95"
          >
            Enter Student Portal <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-500 relative z-10 bg-[#070D18]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SweLogo theme="navy" size="xs" />
            <span className="font-semibold text-slate-400">Department of Software Engineering</span>
          </div>
          <p>© {new Date().getFullYear()} SWE Student Portal. Designed for SWE Students & Faculty.</p>
          <div className="flex gap-4 text-slate-400">
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Privacy & Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

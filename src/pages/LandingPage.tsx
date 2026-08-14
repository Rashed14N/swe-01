import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, ArrowRight, ShieldCheck, Clock,
  HelpCircle, Award, ChevronRight
} from 'lucide-react';
import { DepartmentNotice, Faculty } from '../types';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<DepartmentNotice[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);

  useEffect(() => {
    fetch('/api/notices')
      .then(res => res.json())
      .then(data => setNotices(data.notices.slice(0, 3)))
      .catch(console.error);

    fetch('/api/faculty')
      .then(res => res.json())
      .then(data => setFacultyList(data.faculty.slice(0, 4)))
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 font-sans flex flex-col">
      {/* Top Header Navbar */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#041E4A] flex items-center justify-center text-white font-bold shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
                SWE Portal
              </span>
              <span className="text-[10px] text-slate-500 block">
                Software Engineering Department
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#notices" className="hover:text-blue-600 transition-colors">Department Notices</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Portal Features</a>
            <a href="#faculty" className="hover:text-blue-600 transition-colors">Faculty Directory</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-3.5 py-2 text-slate-700 hover:text-blue-600 text-xs font-bold rounded-lg transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              Register Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-b from-white to-[#F7F9FC] border-b border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold mb-6">
            <Award className="w-4 h-4 text-blue-600" /> Official Department Academic Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-900 max-w-3xl mx-auto">
            Software Engineering Department Academic Portal
          </h1>

          <p className="mt-4 text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Centralized academic resources, batch class routines, exam schedules, question bank, and verified student study materials in one secure workspace.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              Register New Account <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-6 py-3 bg-white text-slate-700 text-xs font-bold rounded-lg border border-[#E2E8F0] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              Sign In to Portal
            </button>
          </div>

          {/* Key Metrics Strip */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8 border-t border-[#E2E8F0]">
            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
              <span className="text-2xl font-black text-slate-900">10+</span>
              <span className="text-xs text-slate-500 block mt-0.5 font-medium">Active Batches</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
              <span className="text-2xl font-black text-slate-900">500+</span>
              <span className="text-xs text-slate-500 block mt-0.5 font-medium">Questions & Notes</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
              <span className="text-2xl font-black text-slate-900">100%</span>
              <span className="text-xs text-slate-500 block mt-0.5 font-medium">Batch Isolation</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
              <span className="text-2xl font-black text-slate-900">24/7</span>
              <span className="text-xs text-slate-500 block mt-0.5 font-medium">Academic Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Department Notices Section */}
      <section id="notices" className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Latest Department Notices</h2>
            <p className="text-xs text-slate-500 mt-0.5">Official updates published by Department Administration</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
          >
            All Notices <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {notices.map(notice => (
            <div
              key={notice.id}
              className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-full uppercase">
                    {notice.category}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{notice.publishDate}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{notice.title}</h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">{notice.content}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-slate-500">
                <span>By: {notice.createdByName}</span>
                <span className="text-blue-600 font-semibold">Official Notice</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-12 md:py-16 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Engineered for Academic Excellence</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Designed specifically for Software Engineering students, class representatives, and faculty members.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E2E8F0]">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg w-fit mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Strict Batch Isolation</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Server-side security rules ensure every batch maintains its private routines, exam schedules, and announcements without cross-batch data exposure.
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E2E8F0]">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg w-fit mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Auto-Sorted Exam Radar</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Upcoming quizzes, midterms, and lab viva dates automatically sort by proximity with live "days left" countdown badges.
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E2E8F0]">
              <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg w-fit mb-4">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Verified Question Bank</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Filter past final examination papers, quizzes, and lecture notes by course, semester, and year with full PDF preview and download tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Faculty Preview */}
      <section id="faculty" className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Department Faculty Members</h2>
          <p className="text-xs text-slate-500 mt-1">Distinguished educators and researchers of Software Engineering</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {facultyList.map(fac => (
            <div key={fac.id} className="bg-white rounded-xl p-5 text-center flex flex-col items-center border border-[#E2E8F0] shadow-xs">
              <img
                src={fac.photoUrl}
                alt={fac.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 mb-3"
              />
              <h3 className="text-xs font-bold text-slate-900">{fac.name}</h3>
              <span className="text-[11px] font-semibold text-blue-600 mt-0.5">{fac.designation}</span>
              <p className="text-[10px] text-slate-500 mt-1">{fac.officeRoom}</p>
              <span className="text-[11px] text-slate-600 mt-2 font-mono truncate max-w-full">{fac.email}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white text-slate-500 py-8 border-t border-[#E2E8F0] text-xs text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Department of Software Engineering. All rights reserved.</p>
          <p className="mt-1 text-[11px] text-slate-400">SWE Portal Academic System • Centralized Department Architecture</p>
        </div>
      </footer>
    </div>
  );
};


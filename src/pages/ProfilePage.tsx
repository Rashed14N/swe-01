import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Upload, CheckCircle2, Clock, XCircle, FileText, 
  Award, ShieldCheck, Mail, Phone, Hash, GraduationCap, Save, 
  Sparkles, Edit3, Layers, BookOpen, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Resource, ResourceType } from '../types';
import { getUserAvatarUrl } from '../data/avatars';
import { AvatarPickerModal } from '../components/profile/AvatarPickerModal';

export const ProfilePage: React.FC = () => {
  const { user, token, updateUserInContext } = useAuth();
  const { addToast } = useNotifications();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'contribute' | 'uploads'>('profile');

  // Avatar Modal
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Synchronize state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Contributions & Upload State
  const [myContributions, setMyContributions] = useState<Resource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingContributions, setIsLoadingContributions] = useState(true);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('QUESTION');
  const [courseCode, setCourseCode] = useState('SWE 305');
  const [courseTitle, setCourseTitle] = useState('Database Systems');
  const [semester, setSemester] = useState(user?.currentSemester || 4);
  const [academicYear, setAcademicYear] = useState(2026);
  const [examType, setExamType] = useState('FINAL');
  const [labCategory, setLabCategory] = useState('LAB_MANUAL');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const fetchMyContributions = () => {
    if (!token) return;
    setIsLoadingContributions(true);
    fetch('/api/resources/my-uploads', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMyContributions(data.resources || []))
      .catch(console.error)
      .finally(() => setIsLoadingContributions(false));
  };

  useEffect(() => {
    fetchMyContributions();
  }, [token]);

  // Handle Profile Update (Name, Email, Phone)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('error', 'Name cannot be empty.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      addToast('error', 'Please enter a valid email address.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateUserInContext({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
      });

      if (res && res.success === false) {
        addToast('error', res.error || 'Failed to update profile.');
      } else {
        addToast('success', 'Profile information updated successfully!');
      }
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Avatar Selection from Modal
  const handleAvatarSelect = async (newAvatarUrl: string) => {
    try {
      await updateUserInContext({
        profileImage: newAvatarUrl,
      });
      addToast('success', 'Profile avatar updated!');
    } catch (e) {
      addToast('error', 'Failed to update avatar.');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !courseCode || !courseTitle) {
      addToast('error', 'Please fill in title and course details');
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          type,
          courseCode,
          courseTitle,
          semester: Number(semester),
          academicYear: Number(academicYear),
          examType,
          labCategory,
          description,
          fileUrl: fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileName: `${type.toLowerCase()}_${courseCode.replace(' ', '')}.pdf`,
          fileSize: '1.4 MB',
        }),
      });

      if (res.ok) {
        addToast('success', 'Resource submitted for CR / Admin verification!');
        setTitle('');
        setDescription('');
        setFileUrl('');
        fetchMyContributions();
        setActiveTab('uploads');
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Upload failed');
      }
    } catch (e) {
      addToast('error', 'Server error during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Approved & Public
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-bold rounded-full flex items-center gap-1 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> Verification Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-full flex items-center gap-1 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" /> Pending Verification
          </span>
        );
    }
  };

  const avatarUrl = getUserAvatarUrl(user);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Profile Hero Header Card */}
      <div className="bg-white dark:bg-[#0F172A] p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10">
          {/* Avatar with Change Button */}
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 p-1 border-2 border-blue-500/40 dark:border-blue-500/30 shadow-md flex items-center justify-center">
              <img
                src={avatarUrl}
                alt={user?.name}
                className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              title="Change Preset Avatar"
              className="absolute -bottom-1.5 -right-1.5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg border-2 border-white dark:border-slate-900 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {user?.name || 'Student Profile'}
              </h1>
              <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-200 dark:border-blue-800">
                {user?.batchName || 'SWE 9th Batch'}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-md uppercase border border-slate-200 dark:border-slate-700">
                {user?.role || 'STUDENT'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                ID: <strong className="text-slate-800 dark:text-slate-200">{user?.studentId || 'N/A'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user?.email}
              </span>
              {user?.phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {user.phone}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Change Preset Avatar
              </button>
            </div>
          </div>
        </div>

        {/* Right Stats Block */}
        <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
                Total Uploads
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {myContributions.length} Files
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Edit Profile Information
        </button>

        <button
          onClick={() => setActiveTab('contribute')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'contribute'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          Contribute Resource
        </button>

        <button
          onClick={() => setActiveTab('uploads')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer relative ${
            activeTab === 'uploads'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          My Uploaded Files
          {myContributions.length > 0 && (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
              activeTab === 'uploads' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {myContributions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Profile Information & Rename Details */}
      {activeTab === 'profile' && (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
          {/* Avatar Preview Card */}
          <div className="md:col-span-1 bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Profile Avatar
            </h3>

            <div className="relative">
              <div className="w-28 h-28 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 p-1.5 border-2 border-blue-500 shadow-lg">
                <img
                  src={avatarUrl}
                  alt={user?.name}
                  className="w-full h-full object-cover rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Preset Avatar Active
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose from our curated collection of student and tech avatars
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="w-full py-2.5 px-4 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Select Different Avatar
            </button>
          </div>

          {/* Edit Information Form */}
          <div className="md:col-span-2 bg-white dark:bg-[#0F172A] p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Account Details & Contact Information
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update your full name, email address, and phone number
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name (নাম পরিবর্তন)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address (ইমেইল পরিবর্তন)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number (ফোন নম্বর)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              {/* Read-Only Academic Badges */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Student ID (Verified)</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{user?.studentId || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Batch & Semester</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{user?.batchName} (Sem {user?.currentSemester})</span>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Contribute Resource */}
      {activeTab === 'contribute' && (
        <div className="bg-white dark:bg-[#0F172A] p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs animate-fade-in max-w-2xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Contribute Study Resource</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Share question papers, lecture notes, or lab materials</p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Resource Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="QUESTION">Question Paper</option>
                <option value="NOTE">Lecture Notes</option>
                <option value="LAB">Lab Resource / Code</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Resource Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Database Systems Midterm 2025 Solved"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Course Code
                </label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="SWE 305"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Semester
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={8}
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Course Title
              </label>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Database Systems"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
              />
            </div>

            {type === 'QUESTION' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
                  >
                    <option value="FINAL">Final</option>
                    <option value="MIDTERM">Midterm</option>
                    <option value="QUIZ">Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {type === 'LAB' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Lab Category
                </label>
                <select
                  value={labCategory}
                  onChange={(e) => setLabCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
                >
                  <option value="LAB_MANUAL">Lab Manual</option>
                  <option value="SOURCE_CODE">Source Code</option>
                  <option value="VIVA_QUESTIONS">Viva Questions</option>
                  <option value="LAB_REPORT">Sample Report</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                File URL / Document Link
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/... or direct PDF link"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Leave blank to attach standard PDF sample document.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of this material..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Uploaded Files */}
      {activeTab === 'uploads' && (
        <div className="bg-white dark:bg-[#0F172A] p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">My Uploaded Contributions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Track verification status of your uploaded study materials</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800">
              {myContributions.length} Total Uploads
            </span>
          </div>

          {isLoadingContributions ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading your contributions...</div>
          ) : myContributions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
              You haven't contributed any resources yet. Switch to the "Contribute Resource" tab to upload questions, notes, or lab solutions!
            </div>
          ) : (
            <div className="grid gap-3">
              {myContributions.map((res) => (
                <div
                  key={res.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{res.title}</span>
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold font-mono rounded">
                          {res.courseCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Type: <strong className="text-slate-700 dark:text-slate-300">{res.type}</strong> • Semester {res.semester} • Date: {res.createdAt?.split('T')[0]}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 sm:self-center">
                    {getStatusBadge(res.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatarUrl={avatarUrl}
        userName={user?.name || 'Student'}
        studentId={user?.studentId || ''}
        onSelectAvatar={handleAvatarSelect}
      />
    </div>
  );
};

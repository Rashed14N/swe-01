import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, Upload, CheckCircle2, Clock, XCircle, FileText, 
  Award, ShieldCheck, Mail, Phone, Hash, GraduationCap, Save, 
  Sparkles, Edit3, Layers, BookOpen, Check, Link as LinkIcon, ExternalLink, Copy, Globe, ChevronDown,
  Camera, RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Resource, ResourceType, Course, Faculty, getFacultyRank } from '../types';
import { getUserAvatarUrl, PRESET_AVATARS, DEFAULT_AVATAR_URL } from '../data/avatars';
import { AvatarPickerModal } from '../components/profile/AvatarPickerModal';
import { parseGoogleDriveLink } from '../lib/driveUtils';
import { formatStudentId } from '../utils/studentId';
import { fetchResourcesFromSupabase, saveResourceToSupabase } from '../services/supabaseDataService';

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
  const [courseCode, setCourseCode] = useState('SWE 311');
  const [courseTitle, setCourseTitle] = useState('Software Engineering');
  const [facultyName, setFacultyName] = useState('');
  const [isCustomFaculty, setIsCustomFaculty] = useState(false);
  const [academicYear, setAcademicYear] = useState(2026);
  const [examType, setExamType] = useState<'QUIZ' | 'MIDTERM' | 'FINAL' | 'SUPPLE' | 'CLASS_TEST'>('FINAL');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [autoMatchedCourse, setAutoMatchedCourse] = useState<Course | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/courses?all=true').then((r) => (r.ok ? r.json() : { courses: [] })),
      fetch('/api/faculty').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([cData, fData]) => {
        const courses: Course[] = Array.isArray(cData.courses) ? cData.courses : [];
        setCoursesList(courses);
        const facs: Faculty[] = Array.isArray(fData) ? fData : fData.faculty || [];
        facs.sort((a, b) => {
          const rankA = getFacultyRank ? getFacultyRank(a.designation) : 99;
          const rankB = getFacultyRank ? getFacultyRank(b.designation) : 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name);
        });
        setFacultyList(facs);
      })
      .catch(console.error);
  }, []);

  const handleCourseCodeChange = (inputCode: string) => {
    setCourseCode(inputCode);
    if (!inputCode.trim()) {
      setAutoMatchedCourse(null);
      return;
    }
    const cleanInput = inputCode.trim().toUpperCase().replace(/[\s\-_]/g, '');
    const cleanNumbers = inputCode.trim().replace(/\D/g, '');

    const matched =
      coursesList.find((c) => c.code.trim().toUpperCase().replace(/[\s\-_]/g, '') === cleanInput) ||
      coursesList.find((c) => c.code.trim().toUpperCase() === inputCode.trim().toUpperCase()) ||
      coursesList.find((c) => cleanNumbers.length >= 3 && c.code.replace(/\D/g, '') === cleanNumbers);

    if (matched) {
      setCourseTitle(matched.title);
      setAutoMatchedCourse(matched);
      if (!facultyName && matched.assignedFacultyName) {
        setFacultyName(matched.assignedFacultyName);
        setIsCustomFaculty(false);
      }
    } else {
      setAutoMatchedCourse(null);
    }
  };

  const fetchMyContributions = async () => {
    setIsLoadingContributions(true);
    const activeToken =
      token ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') ||
          localStorage.getItem('swe_portal_auth_token') ||
          localStorage.getItem('swe_admin_token') ||
          localStorage.getItem('token') ||
          'demo_session_token_111111111'
        : null);

    let list: Resource[] = [];

    // 1. Try server API /api/resources/my-uploads
    if (activeToken) {
      try {
        const res = await fetch('/api/resources/my-uploads', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.resources) && data.resources.length > 0) {
            list = data.resources;
          }
        }
      } catch (err) {
        console.warn('[ProfilePage] /api/resources/my-uploads warning:', err);
      }
    }

    // 2. If empty, query /api/resources and match by user ID, student ID, email, or name
    if (list.length === 0 && user) {
      try {
        const res = await fetch('/api/resources');
        if (res.ok) {
          const data = await res.json();
          const allRes: Resource[] = Array.isArray(data.resources) ? data.resources : (Array.isArray(data) ? data : []);
          const currentUserId = user.id;
          const currentStudentId = user.studentId?.trim().toLowerCase();
          const currentDigitsOnly = currentStudentId ? currentStudentId.replace(/\D/g, '') : '';
          const currentEmail = user.email?.trim().toLowerCase();
          const currentName = user.name?.trim().toLowerCase();

          const filtered = allRes.filter((r) => {
            if (r.uploaderId && r.uploaderId === currentUserId) return true;
            if (currentDigitsOnly) {
              const uploaderSidDigits = (r.uploaderStudentId || '').replace(/\D/g, '');
              const uploaderIdDigits = (r.uploaderId || '').replace(/\D/g, '');
              if (uploaderSidDigits && uploaderSidDigits === currentDigitsOnly) return true;
              if (uploaderIdDigits && uploaderIdDigits === currentDigitsOnly) return true;
            }
            if (currentStudentId && (
              (r.uploaderStudentId && r.uploaderStudentId.toLowerCase() === currentStudentId) ||
              (r.uploaderId && r.uploaderId.toLowerCase() === currentStudentId)
            )) return true;
            if (currentEmail && (r as any).uploaderEmail && (r as any).uploaderEmail.toLowerCase() === currentEmail) return true;
            if (currentName && r.uploaderName && r.uploaderName.toLowerCase().includes(currentName)) return true;
            return false;
          });

          if (filtered.length > 0) {
            list = filtered;
          }
        }
      } catch (err) {
        console.warn('[ProfilePage] /api/resources fallback warning:', err);
      }
    }

    // 3. Direct Supabase query fallback if list is still empty
    if (list.length === 0 && user) {
      try {
        const supabaseData = await fetchResourcesFromSupabase();
        if (supabaseData && supabaseData.length > 0) {
          const currentUserId = user.id;
          const currentStudentId = user.studentId?.trim().toLowerCase();
          const currentDigitsOnly = currentStudentId ? currentStudentId.replace(/\D/g, '') : '';
          const currentEmail = user.email?.trim().toLowerCase();
          const currentName = user.name?.trim().toLowerCase();

          const filtered = supabaseData.filter((r) => {
            if (r.uploaderId && r.uploaderId === currentUserId) return true;
            if (currentDigitsOnly) {
              const uploaderSidDigits = (r.uploaderStudentId || '').replace(/\D/g, '');
              const uploaderIdDigits = (r.uploaderId || '').replace(/\D/g, '');
              if (uploaderSidDigits && uploaderSidDigits === currentDigitsOnly) return true;
              if (uploaderIdDigits && uploaderIdDigits === currentDigitsOnly) return true;
            }
            if (currentStudentId && (
              (r.uploaderStudentId && r.uploaderStudentId.toLowerCase() === currentStudentId) ||
              (r.uploaderId && r.uploaderId.toLowerCase() === currentStudentId)
            )) return true;
            if (currentEmail && (r as any).uploaderEmail && (r as any).uploaderEmail.toLowerCase() === currentEmail) return true;
            if (currentName && r.uploaderName && r.uploaderName.toLowerCase().includes(currentName)) return true;
            return false;
          });

          if (filtered.length > 0) {
            list = filtered;
          }
        }
      } catch (err) {
        console.warn('[ProfilePage] Supabase fallback warning:', err);
      }
    }

    setMyContributions(list);
    setIsLoadingContributions(false);
  };

  useEffect(() => {
    fetchMyContributions();
  }, [token, user?.id, user?.studentId, activeTab]);

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

  // Handle Avatar Reset to Default
  const handleResetAvatar = async () => {
    try {
      await updateUserInContext({
        profileImage: DEFAULT_AVATAR_URL,
      });
      addToast('success', 'Profile avatar reset to default!');
    } catch (e) {
      addToast('error', 'Failed to reset avatar.');
    }
  };

  // Custom Photo Upload (Max 100KB)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please choose an image file (PNG, JPG, WEBP).');
      if (e.target) e.target.value = '';
      return;
    }

    const MAX_BYTES = 100 * 1024; // 100 KB limit
    if (file.size > MAX_BYTES) {
      const sizeInKb = (file.size / 1024).toFixed(1);
      addToast('error', `Image size (${sizeInKb} KB) exceeds the 100 KB limit. Please select an image under 100 KB.`);
      if (e.target) e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      const base64Part = base64.split(',')[1] || '';
      const calculatedBytes = Math.floor((base64Part.length * 3) / 4);
      if (calculatedBytes > MAX_BYTES) {
        addToast('error', `Encoded image exceeds the 100 KB limit.`);
        if (e.target) e.target.value = '';
        return;
      }

      setIsUploadingPhoto(true);
      try {
        const res = await updateUserInContext({
          profileImage: base64,
        });

        if (token) {
          await fetch('/api/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ profileImage: base64 }),
          }).catch(console.warn);
        }

        if (res && res.success === false) {
          addToast('error', res.error || 'Failed to update profile photo.');
        } else {
          addToast('success', `Profile photo uploaded successfully (${(file.size / 1024).toFixed(1)} KB)!`);
        }
      } catch (err: any) {
        addToast('error', err?.message || 'Failed to upload photo.');
      } finally {
        setIsUploadingPhoto(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !courseCode || !courseTitle) {
      addToast('error', 'Please fill in title and course details');
      return;
    }

    const finalDownloadUrl = fileUrl.trim();
    if (!finalDownloadUrl) {
      addToast('error', 'Please provide a download link.');
      return;
    }

    const activeToken =
      token ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') ||
          localStorage.getItem('swe_admin_token') ||
          localStorage.getItem('token')
        : null);

    if (!user && !activeToken) {
      addToast('error', 'Please log in to upload question papers.');
      return;
    }

    setIsUploading(true);
    try {
      const isDrive = finalDownloadUrl.includes('drive.google.com') || finalDownloadUrl.includes('docs.google.com');

      const res = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          type: 'QUESTION',
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
          facultyName: facultyName.trim() || undefined,
          academicYear: Number(academicYear),
          examType,
          description: description.trim() || undefined,
          fileUrl: finalDownloadUrl,
          fileName: `${courseCode.replace(/\s+/g, '_')}_${examType}_${academicYear}.pdf`,
          fileSize: isDrive ? 'Google Drive' : '1.6 MB',
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data && data.resource) {
          saveResourceToSupabase(data.resource).catch(console.warn);
        }
        addToast('success', 'Question paper submitted for Admin verification (+10 points)!');
        setTitle('');
        setFacultyName('');
        setDescription('');
        setFileUrl('');
        await fetchMyContributions();
        setActiveTab('uploads');
      } else {
        const err = await res.json();
        const errText =
          typeof err.error === 'string'
            ? err.error
            : typeof err.message === 'string'
            ? err.message
            : err.error?.message || err.error?.code || 'Upload failed';
        addToast('error', errText);
      }
    } catch (e: any) {
      const errMsg = typeof e === 'string' ? e : e?.message || 'Server error during upload';
      addToast('error', errMsg);
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
  const currentAvatarObj = PRESET_AVATARS.find(
    (a) => a.url === avatarUrl || a.id === user?.profileImage || a.fileName === user?.profileImage
  );
  const isCustomPhoto = user?.profileImage?.startsWith('data:image/');

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto font-sans antialiased">
      {/* Profile Hero Header Card */}
      <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 z-10 min-w-0 w-full lg:w-auto">
          {/* Avatar with Camera badge */}
          <div className="relative shrink-0">
            <div 
              onClick={() => setIsAvatarModalOpen(true)}
              title="Click to change avatar"
              className="w-18 h-18 sm:w-[84px] sm:h-[84px] rounded-full overflow-hidden bg-slate-50 dark:bg-slate-800 p-0.5 border-2 border-blue-500/30 dark:border-blue-500/40 shadow-xs flex items-center justify-center cursor-pointer group"
            >
              <img
                src={avatarUrl}
                alt={user?.name || 'Student Avatar'}
                className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              title="Change Avatar"
              className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-sm border-2 border-white dark:border-slate-900 transition-transform active:scale-95 hover:scale-105 cursor-pointer flex items-center justify-center"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Student Profile Info */}
          <div className="min-w-0 flex-1">
            {/* Student Name & Badges in clean horizontal hierarchy */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {user?.name || 'Student Profile'}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200/80 dark:border-blue-800/80">
                {user?.batchName || 'SWE 9th Batch'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold rounded-md uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                {user?.role || 'STUDENT'}
              </span>
            </div>

            {/* Compact Secondary Information Row (ID, Email, Phone) */}
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ID: <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatStudentId(user?.studentId) || 'N/A'}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 break-all sm:truncate max-w-xs">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {user?.email}
              </span>
              {user?.phone && (
                <>
                  <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {user.phone}
                  </span>
                </>
              )}
            </div>

            {/* Change Avatar Action */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer group"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                Change Avatar
              </button>
            </div>
          </div>
        </div>

        {/* Right Stats Block: Total Uploads Card */}
        <div className="shrink-0 w-full sm:w-auto z-10">
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5 min-w-[190px]">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
                Total Uploads
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {myContributions.length} Files
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Mobile Optimized Scrollable Header */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 dark:border-slate-800 pb-1.5 overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('profile')}
          className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Profile Information
        </button>

        <button
          onClick={() => setActiveTab('contribute')}
          className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'contribute'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          Contribute Question Paper
        </button>

        <button
          onClick={() => setActiveTab('uploads')}
          className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer relative ${
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

      {/* Tab 1: Profile Information (Balanced 2-Column Redesign) */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch animate-fade-in">
          {/* LEFT: Profile Avatar Card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Profile Avatar
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Custom character avatar
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                38 Presets
              </span>
            </div>

            {/* Centered Avatar Area (Circle) */}
            <div className="my-auto py-5 flex flex-col items-center text-center">
              {/* Avatar with Camera Overlay (Circular) */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                title="Click to upload photo (Max 100KB)"
                className="relative group cursor-pointer"
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-slate-50 dark:bg-slate-800 p-1 border-2 border-blue-500/30 dark:border-blue-500/40 shadow-sm transition-transform group-hover:scale-102">
                  <img
                    src={avatarUrl}
                    alt={user?.name || 'Current Avatar'}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div 
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md border-2 border-white dark:border-slate-900 transition-transform group-hover:scale-110 active:scale-95 flex items-center justify-center"
                  title="Upload photo"
                >
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              {/* Status and description */}
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isCustomPhoto ? 'Custom Photo Active' : 'Preset Avatar Active'}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                {isCustomPhoto
                  ? 'Your uploaded profile photo is active across the student portal'
                  : 'Choose from our curated collection or upload your own custom photo'}
              </p>

              <div className="mt-3 px-3 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/70 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {isCustomPhoto ? (
                  <span>Photo: <strong className="text-blue-600 dark:text-blue-400">Uploaded Custom Photo</strong> (≤100KB)</span>
                ) : (
                  <span>Active preset: <strong className="text-slate-800 dark:text-slate-100">{currentAvatarObj?.name || 'Default Avatar'}</strong></span>
                )}
              </div>
            </div>

            {/* Avatar Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              {/* Hidden file input for 100KB photo upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-70"
              >
                <Upload className="w-4 h-4" />
                {isUploadingPhoto ? 'Uploading Photo...' : 'Upload Photo (Max 100KB)'}
              </button>

              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Choose Preset Avatar
              </button>

              <button
                type="button"
                onClick={handleResetAvatar}
                className="w-full py-1.5 px-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Default
              </button>
            </div>
          </div>

          {/* RIGHT: Account Details & Contact Information Card */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            {/* Card Header with Top-Right Save Changes Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Account Details & Contact Information
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update your full name, email address, and phone number
                </p>
              </div>

              {/* Clearly visible Save Changes button in top-right */}
              <button
                type="submit"
                form="account-details-form"
                disabled={isSavingProfile}
                className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-70 shrink-0"
              >
                <Save className="w-4 h-4" />
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Form Fields */}
            <form id="account-details-form" onSubmit={handleSaveProfile} className="space-y-4 my-auto py-3">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              {/* Mobile Save Button (Visible only on small screens) */}
              <div className="sm:hidden pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  {isSavingProfile ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Bottom Compact Information Cards: Student ID & Batch/Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Student ID
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded">
                      Verified
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-slate-100 truncate block">
                    {formatStudentId(user?.studentId) || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Batch & Semester
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate block">
                    {user?.batchName || 'SWE Batch'} {user?.currentSemester ? `(Sem ${user.currentSemester})` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contribute Question Paper */}
      {activeTab === 'contribute' && (
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs animate-fade-in max-w-2xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Contribute Question Paper</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Share previous semester quiz, midterm, or final exam question papers (+10 Pts)</p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Question Paper Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SWE 311 Final Exam Autumn 2025"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Course Code *
                  </label>
                  <span className="text-[10px] text-slate-400 lowercase">type or pick</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    list="profile-course-codes"
                    value={courseCode}
                    onChange={(e) => handleCourseCodeChange(e.target.value)}
                    placeholder="e.g. SWE 311 or 311"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <datalist id="profile-course-codes">
                    {coursesList.map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </datalist>
                </div>
                {autoMatchedCourse && (
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auto-detected: {autoMatchedCourse.code} (Sem {autoMatchedCourse.semester})
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Course Title *
                  </label>
                  {autoMatchedCourse && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      Auto-filled
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Faculty / Teacher Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                {isCustomFaculty ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomFaculty(false);
                      setFacultyName('');
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    ← Select from Dropdown
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomFaculty(true)}
                    className="text-[10px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
                  >
                    + Type Custom
                  </button>
                )}
              </div>

              {!isCustomFaculty ? (
                <div className="relative">
                  <select
                    value={
                      facultyList.some((f) => f.name === facultyName)
                        ? facultyName
                        : facultyName
                        ? '__CUSTOM__'
                        : ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CUSTOM__') {
                        setIsCustomFaculty(true);
                      } else {
                        setFacultyName(val);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="">-- Select Faculty / Teacher --</option>
                    {facultyList.map((f) => (
                      <option key={f.id || f.name} value={f.name}>
                        {f.name} {f.shortName ? `(${f.shortName})` : ''} — {f.designation}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✍️ Other / Enter Custom Faculty Name...</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    placeholder="Optional — e.g. Dr. Md. Kamrul Hasan"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Exam Type *
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as 'QUIZ' | 'MIDTERM' | 'FINAL' | 'SUPPLE' | 'CLASS_TEST')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
                >
                  <option value="QUIZ">Quiz Question</option>
                  <option value="FINAL">Final Exam Question</option>
                  <option value="SUPPLE">Supple Exam Question</option>
                  <option value="CLASS_TEST">CT Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Year *
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Download Link Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0A2147] dark:text-white mb-1.5">
                Download Link *
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="Paste direct download link or Google Drive link"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                Paste your instant download link directly.
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
                placeholder="Short notes about questions, topics covered, difficulty level..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Submissions earn <strong>+10 points</strong> on submission and <strong>+25 bonus points</strong> once verified by Admin!</span>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Submitting...' : 'Submit Question Paper for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Uploaded Files */}
      {activeTab === 'uploads' && (
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">My Uploaded Files</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Track verification status of your uploaded study materials</p>
            </div>
            <span className="self-start sm:self-auto px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800">
              {myContributions.length} Total Uploads
            </span>
          </div>

          {isLoadingContributions ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
              <span>Loading your uploaded files...</span>
            </div>
          ) : myContributions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 space-y-3">
              <p>You haven&apos;t contributed any resources yet.</p>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab('contribute')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Contribute Question Paper
                </button>
              </div>
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

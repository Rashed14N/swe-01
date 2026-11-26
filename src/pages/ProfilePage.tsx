import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileText,
  GraduationCap,
  Hash,
  IdCard,
  Layers,
  Link as LinkIcon,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Batch,
  Course,
  Faculty,
  getFacultyRank,
  Resource,
  ResourceType,
  RetakeSummaryOverview,
} from '../types';
import { DEFAULT_AVATAR_URL, getUserAvatarUrl, PRESET_AVATARS } from '../data/avatars';
import { AvatarPickerModal } from '../components/profile/AvatarPickerModal';
import { DigitalStudentIdCard } from '../components/profile/DigitalStudentIdCard';
import {
  AcademicSnapshotPanel,
  ProfileCgpaSummary,
  ProfileSemesterBreakdownItem,
} from '../components/profile/AcademicSnapshotPanel';
import { formatStudentId } from '../utils/studentId';
import { formatSemesterLabel, getEffectiveSemester } from '../utils/semester';
import {
  fetchResourcesFromSupabase,
  saveResourceToSupabase,
} from '../services/supabaseDataService';
import { safeParseJsonOrFallback } from '../lib/apiClient';

type ProfileTab = 'overview' | 'account' | 'contribute' | 'uploads';
type UploadStatusFilter = 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED';

export const ProfilePage: React.FC = () => {
  const { user, token, updateUserInContext } = useAuth();
  const { addToast } = useNotifications();

  // Workspace Tab State
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [copiedHeaderId, setCopiedHeaderId] = useState(false);
  const [idExportTrigger, setIdExportTrigger] = useState(0);

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [batchList, setBatchList] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(user?.batchId || 'batch-9');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Academic Snapshot Data State (CGPA, Retakes)
  const [cgpaSummary, setCgpaSummary] = useState<ProfileCgpaSummary | null>(null);
  const [semesterBreakdown, setSemesterBreakdown] = useState<ProfileSemesterBreakdownItem[]>([]);
  const [isLoadingCgpa, setIsLoadingCgpa] = useState(true);

  const [retakeOverview, setRetakeOverview] = useState<RetakeSummaryOverview | null>(null);
  const [isLoadingRetakes, setIsLoadingRetakes] = useState(true);

  // Contributions & Upload State
  const [myContributions, setMyContributions] = useState<Resource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingContributions, setIsLoadingContributions] = useState(true);
  const [uploadSearch, setUploadSearch] = useState('');
  const [uploadStatusFilter, setUploadStatusFilter] = useState<UploadStatusFilter>('ALL');

  // Upload Form State
  const [title, setTitle] = useState('');
  const [type] = useState<ResourceType>('QUESTION');
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

  // Custom Photo Upload (Max 100KB)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  // Fetch batches for selection
  useEffect(() => {
    fetch('/api/batches')
      .then((r) => safeParseJsonOrFallback(r, { batches: [] }))
      .then((d) => {
        const list: Batch[] = Array.isArray(d?.batches) ? d.batches : [];
        setBatchList(list);
      })
      .catch(() => {});
  }, []);

  // Fetch live student academic snapshot (CGPA, Retakes)
  useEffect(() => {
    if (!token || isAdmin) {
      setIsLoadingCgpa(false);
      setIsLoadingRetakes(false);
      return;
    }

    let cancelled = false;
    const authHeaders = { Authorization: `Bearer ${token}` };

    setIsLoadingCgpa(true);
    fetch('/api/cgpa', { headers: authHeaders })
      .then((r) => safeParseJsonOrFallback<any>(r, null))
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d?.cgpaSummary) {
          setCgpaSummary(d.cgpaSummary);
          setSemesterBreakdown(Array.isArray(d.semesterBreakdown) ? d.semesterBreakdown : []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingCgpa(false);
      });

    setIsLoadingRetakes(true);
    fetch('/api/retakes', { headers: authHeaders })
      .then((r) => safeParseJsonOrFallback<any>(r, null))
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d?.data) {
          setRetakeOverview(d.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingRetakes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, isAdmin, user?.batchId]);

  // Synchronize edit form state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      if (user.batchId) {
        setSelectedBatchId(user.batchId);
      }
    }
  }, [user]);

  // Fetch courses & faculty for Question Paper contribution form
  useEffect(() => {
    Promise.all([
      fetch('/api/courses?all=true').then((r) => safeParseJsonOrFallback(r, { courses: [] })),
      fetch('/api/faculty').then((r) => safeParseJsonOrFallback(r, [] as any)),
    ])
      .then(([cData, fData]) => {
        const courses: Course[] = Array.isArray(cData?.courses) ? cData.courses : [];
        setCoursesList(courses);
        const facs: Faculty[] = Array.isArray(fData) ? fData : fData?.faculty || [];
        facs.sort((a, b) => {
          const rankA = getFacultyRank ? getFacultyRank(a.designation) : 99;
          const rankB = getFacultyRank ? getFacultyRank(b.designation) : 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name);
        });
        setFacultyList(facs);
      })
      .catch(() => {});
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
        const data = await safeParseJsonOrFallback<any>(res, null);
        if (data && Array.isArray(data.resources) && data.resources.length > 0) {
          list = data.resources;
        }
      } catch (err) {
        console.warn('[ProfilePage] /api/resources/my-uploads warning:', err);
      }
    }

    const filterForCurrentUser = (allRes: Resource[]) => {
      if (!user) return [];
      const currentUserId = user.id;
      const currentStudentId = user.studentId?.trim().toLowerCase();
      const currentDigitsOnly = currentStudentId ? currentStudentId.replace(/\D/g, '') : '';
      const currentEmail = user.email?.trim().toLowerCase();
      const currentName = user.name?.trim().toLowerCase();

      return allRes.filter((r) => {
        if (r.uploaderId && r.uploaderId === currentUserId) return true;
        if (currentDigitsOnly) {
          const uploaderSidDigits = (r.uploaderStudentId || '').replace(/\D/g, '');
          const uploaderIdDigits = (r.uploaderId || '').replace(/\D/g, '');
          if (uploaderSidDigits && uploaderSidDigits === currentDigitsOnly) return true;
          if (uploaderIdDigits && uploaderIdDigits === currentDigitsOnly) return true;
        }
        if (
          currentStudentId &&
          ((r.uploaderStudentId && r.uploaderStudentId.toLowerCase() === currentStudentId) ||
            (r.uploaderId && r.uploaderId.toLowerCase() === currentStudentId))
        ) {
          return true;
        }
        if (
          currentEmail &&
          (r as any).uploaderEmail &&
          (r as any).uploaderEmail.toLowerCase() === currentEmail
        ) {
          return true;
        }
        if (currentName && r.uploaderName && r.uploaderName.toLowerCase().includes(currentName)) {
          return true;
        }
        return false;
      });
    };

    // 2. Fallback to /api/resources
    if (list.length === 0 && user) {
      try {
        const res = await fetch('/api/resources');
        const data = await safeParseJsonOrFallback<any>(res, null);
        if (data) {
          const allRes: Resource[] = Array.isArray(data.resources)
            ? data.resources
            : Array.isArray(data)
            ? data
            : [];
          const filtered = filterForCurrentUser(allRes);
          if (filtered.length > 0) list = filtered;
        }
      } catch (err) {
        console.warn('[ProfilePage] /api/resources fallback warning:', err);
      }
    }

    // 3. Direct Supabase query fallback
    if (list.length === 0 && user) {
      try {
        const supabaseData = await fetchResourcesFromSupabase();
        if (supabaseData && supabaseData.length > 0) {
          const filtered = filterForCurrentUser(supabaseData);
          if (filtered.length > 0) list = filtered;
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
  }, [token, user?.id, user?.studentId]);

  // Handle Profile Update (Name, Email, Phone, Batch & Semester)
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
      const chosenBatch =
        batchList.find((b) => b.id === selectedBatchId) ||
        batchList.find(
          (b) => user?.batchName && b.name.toLowerCase() === user.batchName.toLowerCase()
        ) || {
          id: selectedBatchId || user?.batchId || 'batch-9',
          name: user?.batchName || 'SWE 9th Batch',
          currentSemester: user?.currentSemester || 5,
        };

      const res = await updateUserInContext({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        batchId: chosenBatch.id,
        batchName: chosenBatch.name,
        currentSemester: chosenBatch.currentSemester,
      });

      // Synchronize backend profile endpoint as well
      try {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || undefined,
            batchId: chosenBatch.id,
          }),
        });
      } catch {
        // Non-blocking backend sync
      }

      if (res && res.success === false) {
        addToast('error', res.error || 'Failed to update profile.');
      } else {
        addToast(
          'success',
          isAdmin
            ? 'Administrator profile updated successfully.'
            : `Profile updated! Enrolled in ${chosenBatch.name} (Semester ${chosenBatch.currentSemester}).`
        );
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
      if (token) {
        fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profileImage: newAvatarUrl }),
        }).catch(() => {});
      }
      addToast('success', 'Profile avatar updated!');
    } catch {
      addToast('error', 'Failed to update avatar.');
    }
  };

  // Handle Avatar Reset to Default
  const handleResetAvatar = async () => {
    try {
      await updateUserInContext({
        profileImage: DEFAULT_AVATAR_URL,
      });
      if (token) {
        fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profileImage: DEFAULT_AVATAR_URL }),
        }).catch(() => {});
      }
      addToast('success', 'Profile avatar reset to default!');
    } catch {
      addToast('error', 'Failed to reset avatar.');
    }
  };

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
      addToast(
        'error',
        `Image size (${sizeInKb} KB) exceeds the 100 KB limit. Please select an image under 100 KB.`
      );
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
        addToast('error', 'Encoded image exceeds the 100 KB limit.');
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
          addToast(
            'success',
            `Profile photo uploaded successfully (${(file.size / 1024).toFixed(1)} KB)!`
          );
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
      const isDrive =
        finalDownloadUrl.includes('drive.google.com') ||
        finalDownloadUrl.includes('docs.google.com');

      const res = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          type,
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
        const data = await safeParseJsonOrFallback<any>(res, {});
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
        const err = await safeParseJsonOrFallback<any>(res, { error: 'Upload failed' });
        const errText =
          typeof err?.error === 'string'
            ? err.error
            : typeof err?.message === 'string'
            ? err.message
            : err?.error?.message || err?.error?.code || 'Upload failed';
        addToast('error', errText);
      }
    } catch (e: any) {
      const errMsg = typeof e === 'string' ? e : e?.message || 'Server error during upload';
      addToast('error', errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyHeaderId = async () => {
    const formatted = formatStudentId(user?.studentId);
    if (!formatted) return;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedHeaderId(true);
      addToast('success', `Copied Student ID: ${formatted}`);
      setTimeout(() => setCopiedHeaderId(false), 1800);
    } catch {
      addToast('error', 'Unable to copy Student ID.');
    }
  };

  const handleTriggerIdDownload = () => {
    if (activeTab !== 'overview') {
      setActiveTab('overview');
      setTimeout(() => setIdExportTrigger((c) => c + 1), 160);
    } else {
      setIdExportTrigger((c) => c + 1);
    }
  };

  const filteredContributions = useMemo(() => {
    const q = uploadSearch.trim().toLowerCase();
    return myContributions.filter((item) => {
      const normalizedStatus =
        item.status === 'APPROVED'
          ? 'APPROVED'
          : item.status === 'REJECTED'
          ? 'REJECTED'
          : 'PENDING';
      if (uploadStatusFilter !== 'ALL' && normalizedStatus !== uploadStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.title?.toLowerCase().includes(q) ||
        item.courseCode?.toLowerCase().includes(q) ||
        item.courseTitle?.toLowerCase().includes(q)
      );
    });
  }, [myContributions, uploadSearch, uploadStatusFilter]);

  const uploadCounts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    for (const r of myContributions) {
      if (r.status === 'APPROVED') approved++;
      else if (r.status === 'REJECTED') rejected++;
      else pending++;
    }
    return { all: myContributions.length, approved, pending, rejected };
  }, [myContributions]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
    }
  };

  const avatarUrl = getUserAvatarUrl(user);
  const currentAvatarObj = PRESET_AVATARS.find(
    (a) => a.url === avatarUrl || a.id === user?.profileImage || a.fileName === user?.profileImage
  );
  const isCustomPhoto = user?.profileImage?.startsWith('data:image/');
  const formattedStudentId = formatStudentId(user?.studentId);
  const roleDisplay =
    user?.role === 'ADMIN'
      ? 'System Administrator'
      : user?.role === 'CR'
      ? 'Class Representative'
      : 'Student';

  const tabs: Array<{
    id: ProfileTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'overview', label: 'Overview & ID', icon: IdCard },
    { id: 'account', label: 'Account & Avatar', icon: Settings },
    { id: 'contribute', label: 'Contribute Paper', icon: Upload },
    { id: 'uploads', label: 'My Uploads', icon: Layers, count: myContributions.length },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto font-sans antialiased">
      {/* CLEAN ACADEMIC WORKSPACE HEADER */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Identity Block */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0">
            {/* Avatar with quick camera trigger */}
            <div className="relative shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                title="Change profile avatar"
                className="w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 block cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <img
                  src={avatarUrl}
                  alt={user?.name || 'Student Avatar'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              </button>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                title="Change Avatar"
                className="absolute -bottom-0.5 -right-0.5 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full border-2 border-white dark:border-[#0F172A] transition-colors cursor-pointer flex items-center justify-center"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            {/* Clean Typographic Metadata (Zero Pill Sandwiches) */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                  {user?.name || 'Student Profile'}
                </h1>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {roleDisplay}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                {isAdmin ? (
                  <>Department of Software Engineering · SWE Administration</>
                ) : (
                  <>
                    {user?.batchName || 'SWE 9th Batch'} · {formatSemesterLabel(user, 'full')} · Department of Software Engineering
                  </>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                {formattedStudentId && (
                  <button
                    type="button"
                    onClick={handleCopyHeaderId}
                    className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer tabular-nums"
                    title="Click to copy Student ID"
                  >
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formattedStudentId}</span>
                    {copiedHeaderId ? (
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                )}

                {user?.email && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                    <span className="inline-flex items-center gap-1.5 break-all sm:truncate max-w-xs">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {user.email}
                    </span>
                  </>
                )}

                {user?.phone && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {user.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Top-Bar Workspace Actions (Max 2 concise buttons) */}
          <div className="flex items-center gap-2.5 shrink-0 pt-1 lg:pt-0">
            <button
              type="button"
              onClick={handleTriggerIdDownload}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              Download ID
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'account' ? 'overview' : 'account')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Settings className="w-4 h-4" />
              {activeTab === 'account' ? 'Back to Overview' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* ORGANIZED WORKSPACE TAB BAR */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 overflow-x-auto scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative shrink-0 whitespace-nowrap px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`text-[11px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & DIGITAL ID (CLEAN ACADEMIC WORKSPACE) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start animate-fade-in">
          {/* LEFT COLUMN (5 cols): Digital Student ID */}
          <div className="lg:col-span-5">
            <DigitalStudentIdCard
              user={user}
              avatarUrl={avatarUrl}
              academicStanding={cgpaSummary?.academicStanding}
              sessionName={cgpaSummary?.sessionName || 'Autumn 2026'}
              onNotify={(toastType, message) => addToast(toastType, message)}
              externalExportTrigger={idExportTrigger}
            />
          </div>

          {/* RIGHT COLUMN (7 cols): Live Academic Snapshot, Retakes, Contributions */}
          <div className="lg:col-span-7">
            <AcademicSnapshotPanel
              user={user}
              cgpaSummary={cgpaSummary}
              semesterBreakdown={semesterBreakdown}
              isLoadingCgpa={isLoadingCgpa}
              retakeOverview={retakeOverview}
              isLoadingRetakes={isLoadingRetakes}
              contributions={myContributions}
              onSwitchTab={setActiveTab}
            />
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNT & AVATAR SETTINGS */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch animate-fade-in">
          {/* LEFT: Avatar Studio Card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Profile Avatar
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Shown on your Digital ID Card and portal profile
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                38 Presets
              </span>
            </div>

            <div className="my-auto py-6 flex flex-col items-center text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                title="Click to upload photo (Max 100KB)"
                className="relative group cursor-pointer"
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 transition-transform group-hover:scale-102">
                  <img
                    src={avatarUrl}
                    alt={user?.name || 'Current Avatar'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full border-2 border-white dark:border-[#0F172A] transition-transform group-hover:scale-105 flex items-center justify-center"
                  title="Upload photo"
                >
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isCustomPhoto ? 'Custom Photo Active' : 'Preset Avatar Active'}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                {isCustomPhoto
                  ? 'Your uploaded photo is active across the portal and Digital ID.'
                  : `Active preset: ${currentAvatarObj?.name || 'Default Avatar'}`}
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
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
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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

          {/* RIGHT: Account Details & Contact Form */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Account Details & Enrollment
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update your name, contact details, and active SWE batch
                </p>
              </div>

              <button
                type="submit"
                form="account-details-form"
                disabled={isSavingProfile}
                className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 shrink-0"
              >
                <Save className="w-4 h-4" />
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <form
              id="account-details-form"
              onSubmit={handleSaveProfile}
              className="space-y-4 my-auto py-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {!isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Academic Batch
                    </label>
                    {(() => {
                      const matched = batchList.find((b) => b.id === selectedBatchId);
                      const sem = matched?.currentSemester ?? (user?.currentSemester || 5);
                      return (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                          Active: Semester {sem}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {batchList.length > 0 ? (
                        batchList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} (Semester {b.currentSemester})
                          </option>
                        ))
                      ) : (
                        <option value={user?.batchId || 'batch-9'}>
                          {user?.batchName || 'SWE 9th Batch'} (Semester {user?.currentSemester || 5})
                        </option>
                      )}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    Changing your batch automatically synchronizes your routine, courses, and Digital ID Card.
                  </p>
                </div>
              )}

              <div className="sm:hidden pt-1">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {isSavingProfile ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Clean Read-Only Verification Summary Strip */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Verified ID:{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                  {formattedStudentId || 'N/A'}
                </strong>
              </span>
              <span>
                {isAdmin
                  ? 'Role: SWE System Administrator'
                  : `Active Term: Semester ${getEffectiveSemester(user)}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTRIBUTE QUESTION PAPER */}
      {activeTab === 'contribute' && (
        <div className="bg-white dark:bg-[#0F172A] p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 animate-fade-in max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Contribute Question Paper
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Share previous semester quiz, CT, midterm, or final exam papers (+10 pts on submit, +25 bonus on approval)
              </p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Question Paper Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SWE 311 Final Exam Autumn 2025"
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Course Code *
                  </label>
                  <span className="text-[11px] text-slate-400">type or pick</span>
                </div>
                <input
                  type="text"
                  required
                  list="profile-course-codes"
                  value={courseCode}
                  onChange={(e) => handleCourseCodeChange(e.target.value)}
                  placeholder="e.g. SWE 311 or 311"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <datalist id="profile-course-codes">
                  {coursesList.map((c) => (
                    <option key={c.id || c.code} value={c.code}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </datalist>
                {autoMatchedCourse && (
                  <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auto-matched: {autoMatchedCourse.code} (Sem {autoMatchedCourse.semester})
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Course Title *
                  </label>
                  {autoMatchedCourse && (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
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
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Faculty / Teacher Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                {isCustomFaculty ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomFaculty(false);
                      setFacultyName('');
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Select from dropdown
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomFaculty(true)}
                    className="text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
                  >
                    + Type custom
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
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Select Faculty / Teacher --</option>
                    {facultyList.map((f) => (
                      <option key={f.id || f.name} value={f.name}>
                        {f.name} {f.shortName ? `(${f.shortName})` : ''} — {f.designation}
                      </option>
                    ))}
                    <option value="__CUSTOM__">Other / Enter Custom Faculty Name...</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="Optional — e.g. Dr. Md. Kamrul Hasan"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white"
                  autoFocus
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Exam Type *
                </label>
                <select
                  value={examType}
                  onChange={(e) =>
                    setExamType(
                      e.target.value as 'QUIZ' | 'MIDTERM' | 'FINAL' | 'SUPPLE' | 'CLASS_TEST'
                    )
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="QUIZ">Quiz Question</option>
                  <option value="MIDTERM">Midterm Exam Question</option>
                  <option value="FINAL">Final Exam Question</option>
                  <option value="SUPPLE">Supple Exam Question</option>
                  <option value="CLASS_TEST">CT Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Year *
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white tabular-nums"
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Download Link *
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="Paste direct download link or Google Drive link"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short notes about questions, topics covered, or difficulty..."
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Submitting...' : 'Submit Question Paper for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: MY UPLOADED FILES */}
      {activeTab === 'uploads' && (
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
          {/* Header + Filter Controls */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  My Uploaded Files
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track verification status across all your contributed study materials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('contribute')}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload New Paper
              </button>
            </div>

            {/* Segmented Status Filter + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/70 p-1 rounded-xl overflow-x-auto scrollbar-none">
                {(
                  [
                    { id: 'ALL', label: 'All', count: uploadCounts.all },
                    { id: 'APPROVED', label: 'Approved', count: uploadCounts.approved },
                    { id: 'PENDING', label: 'Pending', count: uploadCounts.pending },
                    { id: 'REJECTED', label: 'Rejected', count: uploadCounts.rejected },
                  ] as Array<{ id: UploadStatusFilter; label: string; count: number }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setUploadStatusFilter(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      uploadStatusFilter === item.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={uploadSearch}
                  onChange={(e) => setUploadSearch(e.target.value)}
                  placeholder="Search title or course code..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Uploads List / States */}
          {isLoadingContributions ? (
            <div className="p-6 space-y-3 animate-pulse">
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          ) : myContributions.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No uploaded files yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Contribute previous quiz, midterm, or final question papers to help your batchmates and earn contributor points.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('contribute')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Contribute Question Paper
                </button>
              </div>
            </div>
          ) : filteredContributions.length === 0 ? (
            <div className="py-10 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No uploads match your current filter or search query.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredContributions.map((res) => (
                <div
                  key={res.id}
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {res.title}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                          {res.courseCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {res.type} · Semester {res.semester} · {res.createdAt?.split('T')[0]}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 sm:self-center">
                    {getStatusLabel(res.status)}
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

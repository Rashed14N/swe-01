import React, { useState, useRef } from 'react';
import { Mail, Phone, User, Copy, Check, Camera, Loader2 } from 'lucide-react';
import { Faculty } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient } from '../../services/adminApiClient';

interface FacultyCardProps {
  faculty: Faculty;
  onPhotoUpdated?: () => void;
}

export const FacultyCard: React.FC<FacultyCardProps> = ({ faculty, onPhotoUpdated }) => {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const isAdmin = user?.role === 'ADMIN';

  const [copiedType, setCopiedType] = useState<'email' | 'phone' | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopy = (text: string, type: 'email' | 'phone') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
    }, 1800);
  };

  // Only Admin can upload or change faculty image
  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file (PNG/JPG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'Faculty image size must be under 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (!base64) return;

      setIsUploadingPhoto(true);
      try {
        await adminApiClient.updateFaculty(faculty.id, { photoUrl: base64 });
        addToast('success', `Photo updated for ${faculty.name}`);
        if (onPhotoUpdated) onPhotoUpdated();
      } catch (err: any) {
        console.error('Failed to update faculty photo:', err);
        addToast('error', err?.message || 'Failed to upload photo');
      } finally {
        setIsUploadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative w-full rounded-2xl border border-[#B9D5FD] dark:border-blue-900/70 bg-gradient-to-br from-[#FFFFFF] via-[#F4F8FF] to-[#EAF2FF] dark:from-[#0F172A] dark:via-[#13203A] dark:to-[#162544] shadow-[0_2px_12px_rgba(37,99,235,0.06)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.12)] hover:border-[#2563EB] transition-all duration-200 p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden group">
      {/* Background Subtle Ray Highlights (Matching Question Card & Portal Ray Effect) */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-[0.065] dark:opacity-[0.09]"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 300 240"
        >
          <defs>
            <linearGradient id={`cardRayGrad-${faculty.id}`} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon points="150,0 0,160 0,220" fill={`url(#cardRayGrad-${faculty.id})`} />
          <polygon points="150,0 40,240 80,240" fill={`url(#cardRayGrad-${faculty.id})`} />
          <polygon points="150,0 125,240 175,240" fill={`url(#cardRayGrad-${faculty.id})`} />
          <polygon points="150,0 220,240 260,240" fill={`url(#cardRayGrad-${faculty.id})`} />
          <polygon points="150,0 300,160 300,220" fill={`url(#cardRayGrad-${faculty.id})`} />
        </svg>
      </div>

      {/* Ambient Top Light Beam */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-blue-500/10 dark:bg-blue-400/10 blur-xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center flex-1">
        {/* 1. Circular Profile / Avatar Area */}
        <div className="relative mb-2 flex items-center justify-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white dark:bg-slate-800 border-2 border-white dark:border-blue-900/60 ring-1 ring-[#B9D5FD] dark:ring-blue-900/50 flex items-center justify-center text-slate-800 dark:text-slate-200 shadow-2xs overflow-hidden shrink-0">
            {faculty.photoUrl ? (
              <img
                src={faculty.photoUrl}
                alt={faculty.name}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : faculty.shortName ? (
              <span className="font-mono font-bold text-sm sm:text-base tracking-wider text-blue-700 dark:text-blue-300">
                {faculty.shortName}
              </span>
            ) : (
              <User className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400 stroke-[1.75]" />
            )}
          </div>

          {/* Admin-Only Photo Upload Trigger */}
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAdminPhotoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                title="Admin: Upload or change faculty photo"
                aria-label="Admin: Upload faculty photo"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </button>
            </>
          )}
        </div>

        {/* 2. Faculty / Person Name */}
        <div className="text-center w-full px-1 mb-0.5">
          <h3
            className="text-[14px] sm:text-[15px] font-semibold text-[#0A2147] dark:text-white leading-tight tracking-tight text-center truncate"
            title={faculty.name}
          >
            {faculty.name}
          </h3>
        </div>

        {/* Academic Designation & Room */}
        <div className="text-center mb-2.5 px-1">
          <p className="text-[11px] sm:text-[11.5px] font-medium text-blue-600 dark:text-blue-400 leading-tight">
            {faculty.designation}
            {faculty.shortName ? (
              <span className="ml-1 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400">
                ({faculty.shortName})
              </span>
            ) : null}
          </p>
          {faculty.officeRoom && (
            <p className="text-[10px] sm:text-[10.5px] font-normal text-[#52657C] dark:text-slate-400 mt-0.5 leading-normal">
              Room {faculty.officeRoom}
            </p>
          )}
        </div>

        {/* 3. Contact Information Rows */}
        <div className="w-full space-y-1.5 sm:space-y-2 mt-auto">
          {/* Email Row */}
          <div className="w-full bg-white/90 dark:bg-slate-900/80 backdrop-blur-xs border border-[#D5E2F5] dark:border-blue-900/60 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-2 shadow-2xs transition-colors">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Mail className="w-3 h-3 stroke-[2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-400 block leading-none">
                  Email
                </span>
                {faculty.email ? (
                  <a
                    href={`mailto:${faculty.email}`}
                    title={faculty.email}
                    className="text-[11px] sm:text-[12px] font-medium text-[#0A2147] dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate block mt-0.5 transition-colors"
                  >
                    {faculty.email}
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400 italic block mt-0.5">
                    Not provided
                  </span>
                )}
              </div>
            </div>

            {faculty.email && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(faculty.email!, 'email')}
                  aria-label="Copy email"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-2xs"
                  title="Copy email"
                >
                  {copiedType === 'email' ? (
                    <Check className="w-3 h-3 text-emerald-600 stroke-[2.2]" />
                  ) : (
                    <Copy className="w-3 h-3 stroke-[1.8]" />
                  )}
                </button>

                {/* Copied Tooltip */}
                {copiedType === 'email' && (
                  <div className="absolute -top-6 right-0 bg-slate-900 text-white text-[9px] font-semibold py-0.5 px-1.5 rounded shadow pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 z-20">
                    Copied
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Phone Row */}
          <div className="w-full bg-white/90 dark:bg-slate-900/80 backdrop-blur-xs border border-[#D5E2F5] dark:border-blue-900/60 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-2 shadow-2xs transition-colors">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Phone className="w-3 h-3 stroke-[2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-400 block leading-none">
                  Phone
                </span>
                {faculty.phone ? (
                  <a
                    href={`tel:${faculty.phone}`}
                    title={faculty.phone}
                    className="text-[11px] sm:text-[12px] font-medium text-[#0A2147] dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate block mt-0.5 transition-colors"
                  >
                    {faculty.phone}
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400 italic block mt-0.5">
                    Not provided
                  </span>
                )}
              </div>
            </div>

            {faculty.phone && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(faculty.phone!, 'phone')}
                  aria-label="Copy phone number"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-2xs"
                  title="Copy phone number"
                >
                  {copiedType === 'phone' ? (
                    <Check className="w-3 h-3 text-emerald-600 stroke-[2.2]" />
                  ) : (
                    <Copy className="w-3 h-3 stroke-[1.8]" />
                  )}
                </button>

                {/* Copied Tooltip */}
                {copiedType === 'phone' && (
                  <div className="absolute -top-6 right-0 bg-slate-900 text-white text-[9px] font-semibold py-0.5 px-1.5 rounded shadow pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 z-20">
                    Copied
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

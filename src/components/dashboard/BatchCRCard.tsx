import React, { useState } from 'react';
import {
  ShieldCheck, UserCheck, Mail, Phone, ExternalLink,
  Sparkles, ChevronRight, User, Copy, Check
} from 'lucide-react';
import { getUserAvatarUrl } from '../../data/avatars';
import { CRProfileModal, CRProfileData } from '../common/CRProfileModal';

interface BatchCRCardProps {
  cr: CRProfileData | null;
  isLoading?: boolean;
}

export const BatchCRCard: React.FC<BatchCRCardProps> = ({ cr, isLoading = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-4 sm:p-4.5 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!cr) {
    return null;
  }

  const avatarUrl = getUserAvatarUrl({
    name: cr.name,
    studentId: cr.studentId,
    profileImage: cr.profileImage,
  });

  return (
    <>
      <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden transition-all">
        {/* Header Bar with subtle styling */}
        <div
          className="relative overflow-hidden px-4 py-3 sm:px-4.5 sm:py-3 border-b border-[#D8E2EE] dark:border-blue-900/30 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
          }}
        >
          <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" strokeWidth={2.4} />
            <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0A2147] dark:text-white tracking-tight leading-snug">
              Class Representative (CR)
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="relative z-10 text-xs font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-colors shrink-0 cursor-pointer"
          >
            <span>View Profile</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
          {/* SIDE 1: Profile Avatar + Name, ID, CR Batch (Stacked upor-nic) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={cr.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-blue-500/20 dark:border-blue-400/20 bg-blue-50 dark:bg-slate-800 object-cover shadow-2xs"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0F172A] flex items-center justify-center text-white text-[9px] font-bold" title="Active CR">
                ✓
              </span>
            </div>

            {/* Name, ID, CR Batch (Stacked upor-nic) */}
            <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
              {/* 1. Name */}
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                  {cr.name}
                </h4>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300/60 dark:border-amber-800/60">
                  CR
                </span>
              </div>

              {/* 2. ID */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  ID:
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                  {cr.studentId}
                </span>
              </div>

              {/* 3. CR Batch */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  CR Batch:
                </span>
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  {cr.batchName}
                </span>
              </div>
            </div>
          </div>

          {/* SIDE 2: Email & Number (Stacked upor-nic) + View Details */}
          <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto md:min-w-[280px] pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
            {/* 1. Email (upor) */}
            <div className="flex items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3 py-2 rounded-xl text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email</span>
                  <a
                    href={`mailto:${cr.email}`}
                    className="font-mono font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate text-xs transition-colors"
                    title={`Email ${cr.email}`}
                  >
                    {cr.email}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(cr.email, 'cr-email')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 ml-1"
                title="Copy Email"
              >
                {copiedField === 'cr-email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 2. Number (nic) */}
            <div className="flex items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3 py-2 rounded-xl text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Number / WhatsApp</span>
                  <a
                    href={`tel:${cr.phone || '01312321255'}`}
                    className="font-mono font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 truncate text-xs transition-colors"
                    title={`Call ${cr.phone || '01312321255'}`}
                  >
                    {cr.phone || '01312321255'}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(cr.phone || '01312321255', 'cr-phone')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 ml-1"
                title="Copy Phone"
              >
                {copiedField === 'cr-phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 3. Action Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>View Full CR Profile</span>
            </button>
          </div>
        </div>
      </div>

      <CRProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cr={cr}
      />
    </>
  );
};

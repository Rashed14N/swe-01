import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import {
  Check,
  Copy,
  Download,
  Loader2,
  Mail,
  Phone,
  RotateCw,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { User } from '../../types';
import { formatStudentId } from '../../utils/studentId';
import { formatSemesterLabel } from '../../utils/semester';
import sweEmblemLogo from '../../assets/images/swe_emblem_logo_1787573363177.jpg';

export interface DigitalStudentIdCardProps {
  user: User | null;
  avatarUrl: string;
  academicStanding?: string;
  sessionName?: string;
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
  externalExportTrigger?: number;
}

export const DigitalStudentIdCard: React.FC<DigitalStudentIdCardProps> = ({
  user,
  avatarUrl,
  academicStanding,
  sessionName = 'Autumn 2026',
  onNotify,
  externalExportTrigger,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cardFace, setCardFace] = useState<'front' | 'back'>('front');
  const [copiedId, setCopiedId] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const formattedId = formatStudentId(user?.studentId) || 'N/A';
  const displayBatch = isAdmin
    ? 'SWE Administration'
    : user?.batchName || 'SWE 9th Batch';
  const displaySemester = isAdmin
    ? 'Central Admin'
    : formatSemesterLabel(user, 'full');
  const displayRole =
    user?.role === 'ADMIN'
      ? 'System Administrator'
      : user?.role === 'CR'
      ? 'Class Representative'
      : 'Undergraduate Student';

  // Generate crisp verification QR code from live user metadata
  useEffect(() => {
    let active = true;
    const qrPayload = [
      'METROPOLITAN UNIVERSITY · DEPT. OF SWE',
      `Name: ${user?.name || 'Student'}`,
      `ID: ${formattedId}`,
      `Batch: ${displayBatch}`,
      `Term: ${displaySemester}`,
      `Role: ${user?.role || 'STUDENT'}`,
    ].join('\n');

    QRCode.toDataURL(qrPayload, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0A1D3D',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [user?.name, formattedId, displayBatch, displaySemester, user?.role]);

  const handleCopyId = async () => {
    if (!formattedId || formattedId === 'N/A') return;
    try {
      await navigator.clipboard.writeText(formattedId);
      setCopiedId(true);
      onNotify?.('success', `Copied Student ID: ${formattedId}`);
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      onNotify?.('error', 'Unable to copy Student ID to clipboard.');
    }
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current || isExporting) return;

    // Ensure front face is visible before exporting if triggered from header
    if (cardFace !== 'front') {
      setCardFace('front');
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    setIsExporting(true);
    try {
      let dataUrl = '';
      try {
        dataUrl = await toPng(cardRef.current, {
          pixelRatio: 2.5,
          cacheBust: true,
          backgroundColor: '#ffffff',
        });
      } catch {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
        });
        dataUrl = canvas.toDataURL('image/png');
      }

      const safeName = (user?.studentId || user?.name || 'student')
        .toString()
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const link = document.createElement('a');
      link.download = `MU_SWE_ID_${safeName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify?.('success', 'Digital Student ID Card downloaded as PNG.');
    } catch (err) {
      console.error('[DigitalStudentIdCard] Export failed:', err);
      onNotify?.('error', 'Could not export ID card image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Allow parent workspace header button to trigger PNG download
  const lastTriggerRef = useRef<number | undefined>(externalExportTrigger);
  useEffect(() => {
    if (
      externalExportTrigger !== undefined &&
      externalExportTrigger !== lastTriggerRef.current
    ) {
      lastTriggerRef.current = externalExportTrigger;
      handleDownloadPng();
    }
  }, [externalExportTrigger]);

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Toolbar Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
            {isAdmin ? 'Digital Admin Credential' : 'Digital Student ID'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official SWE portal verification card
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCardFace((prev) => (prev === 'front' ? 'back' : 'front'))}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
          title={cardFace === 'front' ? 'View Back Details' : 'View Front ID Card'}
        >
          <RotateCw className="w-3.5 h-3.5" />
          {cardFace === 'front' ? 'Back Side' : 'Front Side'}
        </button>
      </div>

      {/* Card Stage */}
      <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-900/40">
        {/* Exportable Physical ID Surface — always high-contrast institutional card */}
        <div
          ref={cardRef}
          className="rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-700/80 bg-white text-slate-900 shadow-xs"
        >
          {/* Institutional Navy Header Band */}
          <div className="bg-[#0A1D3D] text-white px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white p-0.5 shrink-0 overflow-hidden border border-white/20">
                <img
                  src={sweEmblemLogo}
                  alt="MU SWE Emblem"
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-blue-200 leading-tight truncate">
                  Metropolitan University
                </p>
                <p className="text-xs font-semibold text-white leading-tight truncate mt-0.5">
                  Dept. of Software Engineering
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-blue-300">
                {isAdmin ? 'ADMIN ID' : 'STUDENT ID'}
              </span>
              <span className="block text-[11px] font-medium text-white/90 tabular-nums mt-0.5">
                {sessionName}
              </span>
            </div>
          </div>

          {cardFace === 'front' ? (
            /* FRONT FACE */
            <div className="p-4 sm:p-5 space-y-4 bg-white text-slate-900">
              {/* Portrait + Identity Row */}
              <div className="flex items-start gap-3.5">
                <div className="w-[74px] h-[86px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={avatarUrl}
                    alt={user?.name || 'Student Portrait'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                    {displayRole}
                  </p>
                  <h3 className="text-base font-bold text-slate-900 leading-snug mt-0.5 break-words">
                    {user?.name || 'Student Name'}
                  </h3>

                  <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        ID Number
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        {formattedId}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        Batch
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate block">
                        {displayBatch}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Verification Grid + QR */}
              <div className="pt-3.5 border-t border-slate-100 flex items-end justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <div>
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Current Level
                    </span>
                    <span className="text-xs font-semibold text-slate-800 block truncate">
                      {displaySemester}
                    </span>
                  </div>

                  {!isAdmin && academicStanding && (
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        Academic Standing
                      </span>
                      <span className="text-[11px] font-medium text-slate-700 block truncate">
                        {academicStanding}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Verified Portal Member</span>
                  </div>
                </div>

                {/* Live Verification QR */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-[74px] h-[74px] p-1 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Student Verification QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 rounded animate-pulse" />
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1 tracking-wider uppercase">
                    Scan Verify
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* BACK FACE */
            <div className="p-4 sm:p-5 space-y-3.5 bg-white text-slate-900">
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Registered Email
                    </span>
                    <span className="font-medium text-slate-800 break-all">
                      {user?.email || 'Not provided'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Contact Number
                    </span>
                    <span className="font-medium text-slate-800 tabular-nums">
                      {user?.phone || 'Not provided'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Campus & Department
                    </span>
                    <span className="font-medium text-slate-700 leading-relaxed block">
                      Department of Software Engineering, Metropolitan University, Bateshwar, Sylhet-3104
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Portal Status: <strong className="text-emerald-700">{user?.status || 'ACTIVE'}</strong></span>
                <span className="font-mono tabular-nums">ID {formattedId}</span>
              </div>
            </div>
          )}

          {/* Crisp Institutional Footer Strip */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="font-medium">swe-mu academic portal</span>
            <span className="font-mono tabular-nums">B.Sc. in Software Engineering</span>
          </div>
        </div>
      </div>

      {/* Card Action Bar */}
      <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isExporting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Exporting PNG...
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Download ID (PNG)
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCopyId}
          disabled={!formattedId || formattedId === 'N/A'}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {copiedId ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy ID
            </>
          )}
        </button>
      </div>
    </div>
  );
};

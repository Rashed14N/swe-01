import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Smartphone,
  Copy,
  Check,
  Send,
  Share2,
  CheckCheck,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  sendOpenWaMessageFromBrowser,
  getOpenWaActiveSession,
  autoFlushPendingOpenWaQueue,
} from '../../services/openWaClient';

export interface WhatsAppAnnouncementPreviewProps {
  courseTitle?: string;
  courseCode?: string;
  examType: string;
  examDate: string;
  examTime?: string;
  room?: string;
  title?: string;
  description?: string;
  batchName?: string;
  publisherName?: string;
  onSend?: () => void;
  isSending?: boolean;
}

export const WhatsAppAnnouncementPreview: React.FC<WhatsAppAnnouncementPreviewProps> = ({
  courseTitle = 'Computer Architecture',
  courseCode = 'SWE-211',
  examType = 'Class Test / Midterm',
  examDate = '2026-11-08',
  examTime,
  room,
  title,
  description,
  batchName = 'SWE 9th Batch',
  publisherName = 'Class Representative (CR)',
  onSend,
  isSending = false,
}) => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();

  const [copied, setCopied] = useState(false);
  const [testPhone, setTestPhone] = useState(
    user?.phone && user.phone !== '+8801700000000' ? user.phone : '01765481645'
  );
  const [isTesting, setIsTesting] = useState(false);
  const [openWaConfig, setOpenWaConfig] = useState<{ gatewayUrl: string; apiKey: string } | null>(null);
  const [localSessionStatus, setLocalSessionStatus] = useState<string>('Checking OpenWA...');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [lastDirectUrl, setLastDirectUrl] = useState<string | null>(null);

  const formattedDate = (() => {
    if (!examDate) return 'Date TBA';
    try {
      const d = new Date(examDate);
      if (isNaN(d.getTime())) return examDate;
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return examDate;
    }
  })();

  const messageLines = [
    '📢 *SWE ACADEMIC EXAM ALERT* 📢',
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `👋 Hello, *Rashedul Hasan*!`,
    '',
    `A new exam has been scheduled for your enrolled course:`,
    '',
    `📌 *Exam:* ${examType} - ${title || 'Cache Memory & Pipeline Architecture'}`,
    `📚 *Course:* *${courseTitle}* (${courseCode || 'SWE-211'})`,
    `📅 *Date:* *${formattedDate}*`,
    `⏰ *Time:* ${examTime || '10:30 AM - 12:00 PM'}`,
    `🏛️ *Room / Venue:* ${room || 'Room 502, Academic Building'}`,
    `🎓 *Batch:* ${batchName}`,
    `👤 *Scheduled By:* ${publisherName}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];

  if (description && description.trim()) {
    messageLines.push('📝 *Syllabus & Instructions:*');
    messageLines.push(`_${description.trim()}_`);
    messageLines.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  messageLines.push('🌐 *View Full Schedule & Routine on SWE Portal:*');
  messageLines.push('👉 https://portal.swe.edu.bd/exams');

  const fullMessageText = messageLines.join('\n');
  const groupShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessageText)}`;

  useEffect(() => {
    // Load OpenWA config and check local browser connection to localhost:2785
    fetch('/api/whatsapp/openwa-config')
      .then(res => res.json())
      .then(async cfg => {
        if (cfg?.gatewayUrl) {
          setOpenWaConfig({ gatewayUrl: cfg.gatewayUrl, apiKey: cfg.apiKey || '' });
          const sessionCheck = await getOpenWaActiveSession(cfg.gatewayUrl, cfg.apiKey || '');
          if (sessionCheck.reachable) {
            setLocalSessionStatus(`Connected (Session: ${sessionCheck.sessionId || 'active'})`);
            // Flush any pending messages (such as 01765481645 CA exam alert)
            autoFlushPendingOpenWaQueue();
          } else {
            setLocalSessionStatus(`Configured (${cfg.gatewayUrl})`);
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/whatsapp/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullMessageText);
    setCopied(true);
    addToast('success', 'WhatsApp message text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      addToast('error', 'Please enter a test phone number (e.g. 01765481645)');
      return;
    }
    setIsTesting(true);
    try {
      // 1. Trigger Backend OpenWA dispatch
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: testPhone,
          courseCode: courseCode || 'SWE-211',
          courseTitle: courseTitle || 'Computer Architecture (CA)',
          examType: examType || 'Class Test / Midterm',
          date: examDate,
          title: title || 'Cache Memory & Pipeline Architecture',
          description:
            description ||
            'Chapter 4 & 5: Pipelining Hazards and 4-Way Set Associative Cache Memory Problems.',
        }),
      });

      const data = await res.json();
      if (data?.shareUrl) setLastDirectUrl(data.shareUrl);

      // 2. If backend couldn't reach localhost:2785 (because backend is in Cloud Run while localhost:2785 is on user's PC),
      // dispatch directly from the user's browser to http://localhost:2785!
      if (!data?.sentLive) {
        const browserResult = await sendOpenWaMessageFromBrowser({
          phone: testPhone,
          messageText: data?.messageText || fullMessageText,
          gatewayUrl: data?.gatewayUrl || openWaConfig?.gatewayUrl || 'http://localhost:2785',
          apiKey: data?.apiKey || openWaConfig?.apiKey,
        });

        if (browserResult.ok) {
          addToast(
            'success',
            `✅ Delivered to ${testPhone} via your local OpenWA Gateway (Session: ${browserResult.sessionId})!`
          );
          fetchLogs();
          setIsTesting(false);
          return;
        }
      }

      if (res.ok && data.success) {
        addToast('success', data.message || `WhatsApp alert dispatched for ${testPhone}!`);
        fetchLogs();
      } else {
        addToast('error', data.error || 'Failed to dispatch test WhatsApp');
      }
    } catch {
      addToast('error', 'Error sending test WhatsApp');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. OpenWA Gateway Status Banner */}
      <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <span>OpenWA Gateway Integrated</span>
              <span className="font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 text-emerald-700">
                {openWaConfig?.gatewayUrl || 'http://localhost:2785'}
              </span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {localSessionStatus}
            </span>
          </div>
          <p className="text-emerald-700 dark:text-emerald-300/80 mt-1 leading-relaxed">
            আপনার দেওয়া <strong>OpenWA Gateway (`http://localhost:2785`)</strong> এবং <strong>`X-API-Key` (`owa_k1_...`)</strong> যুক্ত করা হয়েছে। কোনো পরীক্ষা পোস্ট করলেই সরাসরি আপনার OpenWA সেশনের মাধ্যমে এনরোল্ড সব স্টুডেন্টের নম্বরে মেসেজ চলে যাবে।
          </p>
        </div>
      </div>

      {/* 2. Test WhatsApp Dispatch Tool */}
      <div className="p-3.5 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            Send Test CA (SWE-211) Exam Alert via OpenWA
          </span>
          <span className="text-[10px] text-emerald-700 font-bold font-mono">8801765481645@c.us</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Enter Phone (e.g. 01765481645)"
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            className="flex-1 min-w-[180px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isTesting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Sending via OpenWA...' : 'Send via OpenWA Now'}</span>
          </button>

          <a
            href={
              lastDirectUrl ||
              `https://wa.me/88${testPhone.replace(/[^\d]/g, '').replace(/^88/, '')}?text=${encodeURIComponent(fullMessageText)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-[#075E54] hover:bg-[#064e46] text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Direct WhatsApp Link</span>
          </a>
        </div>
      </div>

      {/* 3. WhatsApp Message Preview Frame */}
      <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-md bg-[#ECE5DD] dark:bg-[#0b141a]">
        <div className="bg-[#075E54] dark:bg-[#1f2c34] text-white px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-xs border border-white/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                <span>SWE Department Broadcast</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <div className="text-[10px] text-emerald-100/90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                OpenWA Automated Dispatch • Enrolled Students
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-black/20 text-emerald-100 px-2.5 py-1 rounded-md font-mono">
              OpenWA API
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 max-w-xl mx-auto space-y-3">
          <div className="bg-white dark:bg-[#1f2c34] text-slate-800 dark:text-slate-100 p-4 rounded-xl rounded-tl-none shadow-sm border border-slate-200/80 dark:border-slate-700/80 space-y-2 relative text-xs">
            <div className="inline-block px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold rounded">
              📢 SWE ACADEMIC EXAM ALERT
            </div>

            <p className="text-slate-700 dark:text-slate-200">
              👋 Hello, <strong>Rashedul Hasan</strong>!
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              A new exam has been scheduled for your enrolled course:
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11.5px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold w-24">📌 Exam:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {examType} - {title || 'Cache Memory & Pipeline Architecture'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold w-24">📚 Course:</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  {courseTitle} ({courseCode || 'SWE-211'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold w-24">📅 Date:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formattedDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold w-24">⏰ Time:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {examTime || '10:30 AM - 12:00 PM'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold w-24">🏛️ Venue:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {room || 'Room 502, Academic Building'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold w-24">🎓 Batch:</span>
                <span className="text-slate-700 dark:text-slate-300">{batchName}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-blue-600 dark:text-blue-400 flex items-center justify-between">
              <span>🌐 portal.swe.edu.bd/exams</span>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span>Just now</span>
                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-[#182229] border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <a
              href={groupShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to WhatsApp Group</span>
            </a>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowLogs(!showLogs);
              if (!showLogs) fetchLogs();
            }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-bold cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{showLogs ? 'Hide Delivery Logs' : 'View Delivery Logs'}</span>
          </button>
        </div>
      </div>

      {/* Delivery Logs Drawer */}
      {showLogs && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
            <span>Automated WhatsApp Delivery History</span>
            <span className="text-[10px] text-emerald-600 font-mono">{logs.length} Messages Recorded</span>
          </div>

          {logs.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No WhatsApp notifications dispatched yet.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
              {logs.slice(0, 8).map(log => (
                <div key={log.id} className="pt-1.5 flex items-center justify-between gap-2 text-[11px]">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {log.studentName || 'Student'} ({log.recipientPhone})
                    </span>
                    <span className="text-slate-500 block text-[10px]">
                      {log.courseCode} • {log.examType} • {log.gateway}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {log.status}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {onSend && (
        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            onClick={onSend}
            disabled={isSending}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Auto-Dispatching WhatsApp...' : 'Post Exam & Auto-Send WhatsApp Alerts'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default WhatsAppAnnouncementPreview;

import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  X,
  Zap,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import { reconfigureSupabaseClient } from '../../lib/supabase';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sqlSchema, setSqlSchema] = useState('');
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    message: string;
    tables?: Record<string, { ok: boolean; count?: number; error?: string }>;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load from localStorage or API
    const storedUrl = localStorage.getItem('swe_supabase_url') || '';
    const storedKey = localStorage.getItem('swe_supabase_key') || '';
    if (storedUrl) setUrl(storedUrl);
    if (storedKey) setKey(storedKey);

    // Fetch schema
    fetch('/api/supabase/schema')
      .then(res => res.json())
      .then(data => {
        if (data.sql) setSqlSchema(data.sql);
      })
      .catch(() => {});

    // Run connection test if credentials exist
    if (storedUrl && storedKey) {
      runConnectionTest();
    }
  }, [isOpen]);

  const runConnectionTest = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/supabase/test');
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        connected: false,
        message: err?.message || 'Failed to connect to Supabase server endpoint.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      alert('Please enter both Supabase Project URL and Anon API Key.');
      return;
    }

    if (!url.startsWith('https://')) {
      alert('Supabase URL must start with https:// (e.g. https://your-project.supabase.co)');
      return;
    }

    setLoading(true);
    try {
      // 1. Reconfigure client-side
      reconfigureSupabaseClient(url.trim(), key.trim());

      // 2. Reconfigure server-side
      const res = await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), key: key.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.testResult) {
        setTestResult(data.testResult);
      } else if (!res.ok) {
        setTestResult({
          connected: false,
          message: data.error || 'Failed to connect.',
        });
      }
    } catch (err: any) {
      setTestResult({
        connected: false,
        message: err.message || 'Connection request failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/supabase/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('🎉 Successfully synced all database records to Supabase!');
        runConnectionTest();
      } else {
        alert(`Sync completed with some notes:\n${(data.errors || []).join('\n')}`);
        runConnectionTest();
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleCopySchema = () => {
    if (!sqlSchema) return;
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to remove Supabase credentials and fallback to local DB?')) {
      reconfigureSupabaseClient('', '');
      setUrl('');
      setKey('');
      setTestResult(null);
      fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://placeholder.supabase.co', key: 'placeholder-key' }),
      }).catch(() => {});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#031B3F] to-[#0A3C78] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                Supabase Integration & Database Diagnostic
              </h2>
              <p className="text-xs text-slate-300">
                Connect your cloud Supabase database directly or verify table status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Status Bar */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            testResult?.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : testResult
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              {testResult?.connected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : testResult ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              ) : (
                <Database className="w-6 h-6 text-slate-400 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold">
                  {testResult?.connected
                    ? 'Supabase Connected & Synchronized!'
                    : testResult
                    ? 'Connection Notice / Setup Incomplete'
                    : 'Supabase Status: Not connected or not tested yet'}
                </p>
                <p className="text-[11px] opacity-80">
                  {testResult?.message || 'Enter your Supabase URL & Key below to activate cloud persistence.'}
                </p>
              </div>
            </div>

            {testResult?.connected && (
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync All Data Now'}
              </button>
            )}
          </div>

          {/* Table Diagnostic Results (if tested) */}
          {testResult?.tables && Object.keys(testResult.tables).length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Supabase Tables Status:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(testResult.tables).map(([tableName, status]: [string, any]) => (
                  <div
                    key={tableName}
                    className={`p-2 rounded-lg border text-[11px] flex flex-col justify-between ${
                      status.ok
                        ? 'bg-white border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <span className="font-semibold truncate">{tableName}</span>
                    <span className="text-[10px] font-bold flex items-center gap-1 mt-1">
                      {status.ok ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Ready
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Missing / RLS
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {!testResult.connected && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                  ⚠️ <strong>টেবিল মিসিং বা RLS Error সমাধান:</strong> আপনার Supabase ড্যাশবোর্ডের <strong>SQL Editor</strong>-এ গিয়ে নিচের Schema SQL কপি করে পেস্ট করে <strong>Run</strong> বাটনে চাপুন।
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveAndConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://abcdefghijklmn.supabase.co"
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Find this in Supabase ➔ Project Settings ➔ API ➔ Project URL
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supabase Anon / Publishable API Key
              </label>
              <input
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Find this in Supabase ➔ Project Settings ➔ API ➔ Project API keys (anon / public)
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Zap className="w-4 h-4" />
                {loading ? 'Testing & Connecting...' : 'Connect & Test Database'}
              </button>

              {url && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>

          {/* Copy SQL Schema Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Supabase Database Schema (SQL Script)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Run this in your Supabase SQL Editor to create all required tables & RLS policies automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySchema}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied SQL!' : 'Copy SQL Schema'}
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl text-[11px] text-emerald-400 font-mono overflow-x-auto max-h-32">
              <pre>{sqlSchema ? sqlSchema.substring(0, 450) + '\n\n... [Click Copy SQL Schema above for full script]' : '-- Loading SQL Schema...'}</pre>
            </div>
          </div>

          {/* Quick Steps Guide */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 text-[11px] text-blue-950 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-blue-900">
              <ExternalLink className="w-3.5 h-3.5" /> সহজ ৩-ধাপে Supabase সেটআপ:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700">
              <li>
                <strong>supabase.com</strong>-এ গিয়ে আপনার প্রজেক্টের <strong>Settings ➔ API</strong> থেকে Project URL ও anon key কপি করে উপরের বক্সে পেস্ট করে <strong>"Connect & Test"</strong> চাপুন।
              </li>
              <li>
                উপরের <strong>"Copy SQL Schema"</strong> বাটনে চাপ দিয়ে Supabase ড্যাশবোর্ডের <strong>SQL Editor</strong>-এ গিয়ে পেস্ট করে <strong>Run</strong> বাটনে চাপুন।
              </li>
              <li>
                এরপর <strong>"Sync All Data Now"</strong> বাটনে ক্লিক করলেই আপনার সমস্ত ব্যাচ, রুটিন, নোটিশ ও রিসোর্স Supabase-এ সংরক্ষণ হয়ে যাবে!
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

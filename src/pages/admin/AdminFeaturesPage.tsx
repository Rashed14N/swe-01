import React, { useState, useEffect, useMemo } from 'react';
import {
  Power,
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Calendar,
  BookOpen,
  RotateCcw,
  Clock,
  Megaphone,
  GraduationCap,
  HelpCircle,
  Bell,
  Users,
  Award,
  Sparkles,
  Bug,
  SlidersHorizontal,
  Edit3,
  X,
  Info,
  Filter,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import {
  useFeatureFlags,
  FeatureFlagItem,
  FeatureKey,
  FeatureCategory,
} from '../../context/FeatureFlagContext';
import { adminApiClient } from '../../services/adminApiClient';

const CATEGORY_META: Record<
  FeatureCategory,
  { label: string; badgeClass: string }
> = {
  ACADEMIC: {
    label: 'Academic & Batch',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  },
  TOOLS_AI: {
    label: 'Tools & AI',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
  },
  RESOURCES: {
    label: 'Resources & Dept',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  MANAGEMENT: {
    label: 'CR Management',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
};

function getFeatureIcon(key: FeatureKey) {
  switch (key) {
    case 'routine':
      return Calendar;
    case 'courses':
      return BookOpen;
    case 'retake_courses':
      return RotateCcw;
    case 'exams':
      return Clock;
    case 'announcements':
      return Megaphone;
    case 'question_bank':
      return GraduationCap;
    case 'faq':
      return HelpCircle;
    case 'notices':
      return Bell;
    case 'faculty':
      return Users;
    case 'cgpa':
      return Award;
    case 'chatbot':
      return Sparkles;
    case 'bug_report':
      return Bug;
    case 'cr_routine_requests':
      return SlidersHorizontal;
    default:
      return Power;
  }
}

export const AdminFeaturesPage: React.FC = () => {
  const { addToast } = useNotifications();
  const { setFeaturesDirect } = useFeatureFlags();

  const [features, setFeatures] = useState<FeatureFlagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FeatureCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON' | 'OFF'>('ALL');

  // Edit disabled notice modal
  const [editingMessageFeature, setEditingMessageFeature] = useState<FeatureFlagItem | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [isSavingMessage, setIsSavingMessage] = useState(false);

  const loadFeatures = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const res = await adminApiClient.getFeatureFlags();
      setFeatures(res.items);
      setFeaturesDirect(res.items);
      if (showToast) {
        addToast('success', 'Feature controls synced with server');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load feature controls');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const stats = useMemo(() => {
    const enabled = features.filter((f) => f.enabled).length;
    const disabled = features.length - enabled;
    return { total: features.length, enabled, disabled };
  }, [features]);

  const filteredFeatures = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return features.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (statusFilter === 'ON' && !item.enabled) return false;
      if (statusFilter === 'OFF' && item.enabled) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q)
      );
    });
  }, [features, selectedCategory, statusFilter, searchQuery]);

  const handleToggleFeature = async (feature: FeatureFlagItem) => {
    const nextEnabled = !feature.enabled;
    setTogglingKey(feature.key);

    // Optimistic UI update
    const prevSnapshot = features;
    const optimistic = features.map((f) =>
      f.key === feature.key ? { ...f, enabled: nextEnabled } : f
    );
    setFeatures(optimistic);
    setFeaturesDirect(optimistic);

    try {
      const res = await adminApiClient.updateFeatureFlag(feature.key, {
        enabled: nextEnabled,
      });
      if (res.allFeatures && res.allFeatures.length > 0) {
        setFeatures(res.allFeatures);
        setFeaturesDirect(res.allFeatures);
      }
      addToast(
        nextEnabled ? 'success' : 'info',
        `${feature.name} turned ${nextEnabled ? 'ON' : 'OFF'}`
      );
    } catch (err: any) {
      setFeatures(prevSnapshot);
      setFeaturesDirect(prevSnapshot);
      addToast('error', err.message || `Failed to update ${feature.name}`);
    } finally {
      setTogglingKey(null);
    }
  };

  const handleEnableAll = async () => {
    if (stats.disabled === 0) {
      addToast('info', 'All portal features are already ON');
      return;
    }
    try {
      setIsBulkWorking(true);
      const updated = await adminApiClient.resetFeatureFlags();
      setFeatures(updated);
      setFeaturesDirect(updated);
      addToast('success', 'All portal features have been turned ON');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to enable all features');
    } finally {
      setIsBulkWorking(false);
    }
  };

  const handleOpenMessageModal = (feature: FeatureFlagItem) => {
    setEditingMessageFeature(feature);
    setMessageDraft(feature.disabledMessage || '');
  };

  const handleSaveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessageFeature) return;

    const trimmed = messageDraft.trim();
    if (!trimmed) {
      addToast('error', 'Please enter a notice message for students');
      return;
    }

    try {
      setIsSavingMessage(true);
      const res = await adminApiClient.updateFeatureFlag(editingMessageFeature.key, {
        disabledMessage: trimmed,
      });
      if (res.allFeatures && res.allFeatures.length > 0) {
        setFeatures(res.allFeatures);
        setFeaturesDirect(res.allFeatures);
      } else if (res.item) {
        const next = features.map((f) =>
          f.key === editingMessageFeature.key ? res.item : f
        );
        setFeatures(next);
        setFeaturesDirect(next);
      }
      addToast('success', `Updated maintenance notice for ${editingMessageFeature.name}`);
      setEditingMessageFeature(null);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save disabled message');
    } finally {
      setIsSavingMessage(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
              <Power className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Feature On/Off Controls
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Instant Enforcement
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            Turn individual student and CR portal modules ON or OFF in real time. Disabled features are immediately hidden from student navigation, blocked on direct route visits, and display your custom maintenance notice.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => loadFeatures(true)}
            disabled={isRefreshing}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="Sync Feature Controls"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleEnableAll}
            disabled={isBulkWorking || stats.disabled === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isBulkWorking ? 'Enabling...' : 'Enable All Features'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>Total Modules</span>
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Controllable portal features</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>Active (ON)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.enabled}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Accessible to students & CRs</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>Turned OFF</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.disabled}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Hidden & locked for students</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>Admin Access</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            Protected Preview Mode
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Admins never get locked out</div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          When you turn a feature <strong>OFF</strong>, it disappears from Student &amp; CR navigation and blocks direct URL access with your custom message. In your own Admin sidebar, disabled modules show a red <strong>OFF</strong> badge so you can verify their status at a glance. Turning off the <strong>SWE AI Assistant Chatbot</strong> immediately hides the floating widget and pauses the chatbot API.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search feature name or module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(['ALL', 'ON', 'OFF'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? st === 'OFF'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : st === 'ON'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st === 'ALL'
                  ? `All (${stats.total})`
                  : st === 'ON'
                  ? `Active (${stats.enabled})`
                  : `Turned Off (${stats.disabled})`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full shrink-0 font-medium transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Categories
          </button>
          {(Object.keys(CATEGORY_META) as FeatureCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full shrink-0 font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Controls Grid */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Loading portal feature controls...
          </p>
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-16 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No matching features found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try clearing your search or status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeatures.map((feature) => {
            const Icon = getFeatureIcon(feature.key);
            const catMeta = CATEGORY_META[feature.category];
            const isToggling = togglingKey === feature.key;

            return (
              <div
                key={feature.key}
                className={`rounded-2xl border p-5 transition-all shadow-2xs flex flex-col justify-between gap-4 ${
                  feature.enabled
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                    : 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                        feature.enabled
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                          : 'bg-rose-100/80 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {feature.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catMeta.badgeClass}`}
                        >
                          {catMeta.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  {/* Tactile Toggle Switch */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={feature.enabled}
                      aria-label={`Toggle ${feature.name}`}
                      disabled={isToggling}
                      onClick={() => handleToggleFeature(feature)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60 ${
                        feature.enabled
                          ? 'bg-emerald-500'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          feature.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        feature.enabled
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {feature.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* Disabled notice preview & footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-start justify-between gap-2 text-[11px]">
                    <div className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span className="line-clamp-2">
                        <strong className="text-slate-700 dark:text-slate-300">Off Notice:</strong>{' '}
                        {feature.disabledMessage}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenMessageModal(feature)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono truncate">
                      {feature.routePaths.length > 0
                        ? feature.routePaths.join(', ')
                        : 'Global UI Component'}
                    </span>
                    {feature.updatedAt && (
                      <span className="shrink-0">
                        Updated by {feature.updatedBy || 'Admin'} •{' '}
                        {new Date(feature.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Disabled Message Modal */}
      {editingMessageFeature && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-xl text-blue-700 dark:text-blue-300">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Custom Maintenance Notice
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Shown to students when {editingMessageFeature.name} is turned OFF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMessageFeature(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMessage} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Student Notice Message</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {messageDraft.length}/240
                  </span>
                </label>
                <textarea
                  rows={3}
                  maxLength={240}
                  required
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="e.g. Exam schedule is currently being finalized by the department. Please check back at 6:00 PM."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMessageFeature(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMessage}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingMessage ? 'Saving...' : 'Save Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

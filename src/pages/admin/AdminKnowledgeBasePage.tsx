import React, { useState, useEffect, useMemo } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Filter,
  Tag,
  X,
  FileText,
  Layers,
  ArrowRight,
  Database,
  HelpCircle,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient } from '../../services/adminApiClient';

export interface KnowledgeSnippet {
  id: string;
  category:
    | 'FEES_AND_PAYMENT'
    | 'GRADING_AND_EXAMS'
    | 'SCHOLARSHIP_AND_WAIVER'
    | 'DEGREE_REQUIREMENTS'
    | 'FORUM_AND_ACTIVITIES'
    | 'CAMPUS_AND_CONTACTS'
    | 'GENERAL_POLICY';
  title: string;
  keywords: string[];
  summary: string;
  details: string;
  bulletPoints?: string[];
  actionPath?: string;
  actionLabel?: string;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORY_OPTIONS: Array<{
  value: KnowledgeSnippet['category'];
  label: string;
  color: string;
}> = [
  { value: 'FEES_AND_PAYMENT', label: 'Fees & Payment', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'GRADING_AND_EXAMS', label: 'Grading & Exams', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'SCHOLARSHIP_AND_WAIVER', label: 'Scholarship & Waiver', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'DEGREE_REQUIREMENTS', label: 'Degree Requirements', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'FORUM_AND_ACTIVITIES', label: 'Forum & Activities', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'CAMPUS_AND_CONTACTS', label: 'Campus & Contacts', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'GENERAL_POLICY', label: 'General Policy', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export const AdminKnowledgeBasePage: React.FC = () => {
  const { addToast } = useNotifications();

  const [snippets, setSnippets] = useState<KnowledgeSnippet[]>([]);
  const [stats, setStats] = useState({ total: 0, custom: 0, builtIn: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CUSTOM' | 'BUILTIN'>('ALL');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<KnowledgeSnippet | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<KnowledgeSnippet | null>(null);

  // Interactive Retrieval Tester State
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    title: '',
    category: 'GENERAL_POLICY' as KnowledgeSnippet['category'],
    keywords: '',
    summary: '',
    details: '',
    actionPath: '/faq',
    actionLabel: 'View FAQ',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch snippets
  const fetchKnowledgeBase = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const res = await adminApiClient.getKnowledgeBase();
      setSnippets(res.items || []);
      setStats(res.stats || { total: res.items.length, custom: 0, builtIn: res.items.length });
      if (showToast) {
        addToast('success', 'Knowledge base refreshed successfully');
      }
    } catch (err: any) {
      console.error('Failed to load knowledge base:', err);
      addToast('error', err.message || 'Failed to load knowledge snippets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  // Filtered snippets
  const filteredSnippets = useMemo(() => {
    return snippets.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Type filter
      if (typeFilter === 'CUSTOM' && !item.isCustom) return false;
      if (typeFilter === 'BUILTIN' && item.isCustom) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [snippets, selectedCategory, typeFilter, searchQuery]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingSnippet(null);
    setFormData({
      title: '',
      category: 'GENERAL_POLICY',
      keywords: '',
      summary: '',
      details: '',
      actionPath: '/faq',
      actionLabel: 'View FAQ & Info',
    });
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (snippet: KnowledgeSnippet) => {
    setEditingSnippet(snippet);
    setFormData({
      title: snippet.title,
      category: snippet.category,
      keywords: snippet.keywords.join(', '),
      summary: snippet.summary,
      details: snippet.details,
      actionPath: snippet.actionPath || '/faq',
      actionLabel: snippet.actionLabel || 'View FAQ',
    });
    setIsFormOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addToast('error', 'Please enter a snippet title');
      return;
    }
    if (!formData.summary.trim()) {
      addToast('error', 'Please enter a clear chatbot summary answer');
      return;
    }
    const keywordsList = formData.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywordsList.length === 0) {
      addToast('error', 'Please provide at least one trigger keyword');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        keywords: keywordsList,
        summary: formData.summary.trim(),
        details: formData.details.trim() || formData.summary.trim(),
        actionPath: formData.actionPath.trim() || '/faq',
        actionLabel: formData.actionLabel.trim() || 'View Policy',
      };

      if (editingSnippet) {
        await adminApiClient.updateKnowledgeSnippet(editingSnippet.id, payload);
        addToast('success', 'Knowledge snippet updated successfully');
      } else {
        await adminApiClient.createKnowledgeSnippet(payload);
        addToast('success', 'New knowledge snippet created and loaded into Chatbot');
      }

      setIsFormOpen(false);
      await fetchKnowledgeBase();
    } catch (err: any) {
      console.error('Failed to save knowledge snippet:', err);
      addToast('error', err.message || 'Failed to save snippet');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Snippet
  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await adminApiClient.deleteKnowledgeSnippet(deleteCandidate.id);
      addToast('success', `Deleted "${deleteCandidate.title}"`);
      setDeleteCandidate(null);
      await fetchKnowledgeBase();
    } catch (err: any) {
      console.error('Failed to delete knowledge snippet:', err);
      addToast('error', err.message || 'Failed to delete snippet');
    }
  };

  // Test Query Handler
  const handleRunTestQuery = async (queryToTest?: string) => {
    const q = (queryToTest || testPrompt).trim();
    if (!q) {
      addToast('info', 'Type a question to test chatbot retrieval');
      return;
    }
    try {
      setIsTesting(true);
      const res = await adminApiClient.testKnowledgeQuery(q);
      setTestResult(res);
      if (!isTesterOpen) setIsTesterOpen(true);
    } catch (err: any) {
      console.error('Failed test query:', err);
      addToast('error', err.message || 'Query test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const getCategoryBadge = (category: KnowledgeSnippet['category']) => {
    const matched = CATEGORY_OPTIONS.find((c) => c.value === category);
    return matched || { label: category, color: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 rounded-xl border border-purple-200 text-purple-700">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Chatbot Knowledge Base & FAQ Snippets
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Live Ground Truth
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 max-w-3xl">
            View, add, and manage custom institutional policies, fee structures, bank account details, and FAQs that the SWE AI Assistant uses to answer student inquiries with zero hallucinations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsTesterOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            Test Retrieval
          </button>
          <button
            onClick={() => fetchKnowledgeBase(true)}
            disabled={isRefreshing}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Knowledge Base"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Snippet
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Knowledge Items</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active institutional records</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Custom Admin Snippets</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.custom}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Added via Admin Portal</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Built-in Presets</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">{stats.builtIn}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Default university policies</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Chatbot Integration</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            0-Token NLU & RAG Active
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">English, Bengali & Banglish</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, keyword, or answer content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <span className="text-xs font-medium text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({snippets.length})
            </button>
            <button
              onClick={() => setTypeFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'CUSTOM'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Custom ({stats.custom})
            </button>
            <button
              onClick={() => setTypeFilter('BUILTIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'BUILTIN'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Built-in ({stats.builtIn})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full shrink-0 font-medium transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              onClick={() => setSelectedCategory(cat.value)}
              key={cat.value}
              className={`px-3 py-1 rounded-full shrink-0 font-medium transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabular CRUD List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-xs text-slate-500 font-medium">Loading knowledge snippets...</p>
          </div>
        ) : filteredSnippets.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No knowledge snippets found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || selectedCategory !== 'ALL' || typeFilter !== 'ALL'
                ? 'Try adjusting your search keywords or category filters.'
                : 'Start by creating your first custom knowledge snippet for the chatbot.'}
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Snippet
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-72">Topic / Title</th>
                  <th className="py-3.5 px-4 w-56">Trigger Keywords</th>
                  <th className="py-3.5 px-4">Chatbot Answer (Summary)</th>
                  <th className="py-3.5 px-4 w-36">Action Link</th>
                  <th className="py-3.5 px-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSnippets.map((item) => {
                  const catBadge = getCategoryBadge(item.category);
                  return (
                    <tr key={item.id} className="hover:bg-purple-50/20 transition-colors group">
                      {/* Topic & Category */}
                      <td className="py-3.5 px-4 align-top space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catBadge.color}`}>
                            {catBadge.label}
                          </span>
                          {item.isCustom ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                              Custom
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Built-in
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {item.id}</div>
                      </td>

                      {/* Trigger Keywords */}
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {item.keywords.slice(0, 5).map((kw, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200"
                            >
                              {kw}
                            </span>
                          ))}
                          {item.keywords.length > 5 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[10px] font-medium">
                              +{item.keywords.length - 5} more
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setTestPrompt(item.keywords[0] || item.title);
                            handleRunTestQuery(item.keywords[0] || item.title);
                          }}
                          className="text-[10px] text-purple-600 hover:text-purple-800 font-medium inline-flex items-center gap-1 mt-1"
                        >
                          <Sparkles className="w-3 h-3" /> Test in Chatbot
                        </button>
                      </td>

                      {/* Summary */}
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <p className="text-xs text-slate-700 leading-relaxed font-normal">{item.summary}</p>
                        {item.details && item.details !== item.summary && (
                          <details className="text-[11px] text-slate-500 cursor-pointer pt-0.5">
                            <summary className="hover:text-purple-600">View detailed rules & points</summary>
                            <p className="mt-1 p-2 bg-slate-50 rounded-lg text-slate-600 font-mono whitespace-pre-wrap text-[10px] border border-slate-200">
                              {item.details}
                            </p>
                          </details>
                        )}
                      </td>

                      {/* Action Link */}
                      <td className="py-3.5 px-4 align-top">
                        {item.actionPath ? (
                          <a
                            href={item.actionPath}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200"
                          >
                            <span>{item.actionLabel || 'Link'}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 align-top text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 transition-colors inline-flex items-center"
                          title="Edit snippet"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors inline-flex items-center"
                          title="Delete snippet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Snippet Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 rounded-xl text-purple-700">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingSnippet ? 'Edit Knowledge Snippet' : 'Add New Chatbot Knowledge Snippet'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    The chatbot retrieves this exact factual content to respond to students.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700 flex items-center justify-between">
                    <span>Title / Academic Subject *</span>
                    <span className="text-[10px] text-slate-400">Clear topic description</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Student Bus Schedule & Routes, Special Waiver Policy..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as KnowledgeSnippet['category'] })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 bg-white"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Link & Label */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 flex items-center justify-between">
                    <span>Action Button Route</span>
                    <span className="text-[10px] text-slate-400">Optional URL/Page</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="/faq, /courses, /exams"
                      value={formData.actionPath}
                      onChange={(e) => setFormData({ ...formData, actionPath: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Button Label (e.g. View FAQ)"
                      value={formData.actionLabel}
                      onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900"
                    />
                  </div>
                </div>

                {/* Keywords */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700 flex items-center justify-between">
                    <span>Trigger Keywords & Synonyms * (Comma separated)</span>
                    <span className="text-[10px] text-slate-400">English, Bengali, and Banglish</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bus, transport, route, campus bus, বাস, বাসের সময়, গাড়ি"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900"
                  />
                  {formData.keywords && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {formData.keywords
                        .split(',')
                        .map((k) => k.trim())
                        .filter(Boolean)
                        .map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium text-[10px] border border-purple-200"
                          >
                            #{kw}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* Chatbot Summary Answer */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700 flex items-center justify-between">
                    <span>Chatbot Direct Answer (Summary) *</span>
                    <span className="text-[10px] text-slate-400">1-2 direct factual sentences</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. University student buses operate from Court Point to Bateshwar campus at 8:00 AM, 9:30 AM, and 1:30 PM. Returning buses depart at 2:00 PM and 5:00 PM with free student ID access."
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 leading-relaxed"
                  />
                </div>

                {/* Detailed Rules & Points */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700 flex items-center justify-between">
                    <span>Detailed Policy & Bullet Points</span>
                    <span className="text-[10px] text-slate-400">Optional full guidelines</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Full breakdown, steps, helpline numbers, or bullet points..."
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 font-mono leading-relaxed"
                  />
                </div>
              </div>

              {/* Realtime Chatbot Output Preview */}
              {formData.title && formData.summary && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Student Chatbot Preview Output:
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-purple-200 shadow-2xs space-y-1.5 text-xs">
                    <p className="text-slate-800 leading-relaxed font-normal">
                      Policy regarding <strong className="text-purple-700">{formData.title}</strong>:
                      <br />
                      {formData.summary}
                    </p>
                    {formData.actionPath && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200">
                        🔗 {formData.actionLabel || 'View Policy'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingSnippet ? 'Update Snippet' : 'Save & Publish to Chatbot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Retrieval Tester Modal */}
      {isTesterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Interactive Chatbot Query Tester</h3>
              </div>
              <button
                onClick={() => {
                  setIsTesterOpen(false);
                  setTestResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Simulate any student inquiry in Banglish, English, or Bengali to verify which custom knowledge snippet is matched by the 0-token NLU and RAG pipeline:
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. bank e taka kivabe joma dibo?, waiver koto?, bus kothay?"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunTestQuery()}
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900"
                />
                <button
                  onClick={() => handleRunTestQuery()}
                  disabled={isTesting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Test
                </button>
              </div>

              {testResult && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b pb-1">
                    <span>Retrieval Result for: &quot;{testResult.query}&quot;</span>
                    <span className="text-purple-600">{testResult.matchCount} Match(es) Found</span>
                  </div>

                  {testResult.bestMatch ? (
                    <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-900 text-xs">
                          🎯 Best Match: {testResult.bestMatch.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold">
                          {testResult.bestMatch.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-normal leading-relaxed">
                        {testResult.bestMatch.summary}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span>Matched Keywords:</span>
                        <div className="flex flex-wrap gap-1">
                          {testResult.bestMatch.keywords.slice(0, 4).map((kw: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center space-y-1">
                      <AlertCircle className="w-5 h-5 mx-auto text-amber-600" />
                      <p className="font-semibold text-xs">No specific knowledge snippet matched</p>
                      <p className="text-[11px] text-amber-700">
                        Try adding relevant keywords (in Bengali and English) to one of your snippets.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete Knowledge Snippet?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete <strong>&quot;{deleteCandidate.title}&quot;</strong>? The chatbot will no longer use this as source ground truth.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs"
              >
                Yes, Delete Snippet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

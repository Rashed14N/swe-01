import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle, Search, ChevronDown, ChevronUp, Sparkles,
  BookOpen, GraduationCap, Clock, Award, ShieldCheck,
  CheckCircle2, MessageSquare, ThumbsUp, ArrowRight,
  FileQuestion, Users, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

interface FAQItem {
  id: string;
  category: 'QUESTION_BANK' | 'EXAMS_GRADING' | 'ROUTINE_ACADEMICS' | 'CR_ADMIN' | 'ACCOUNT_POINTS';
  question: string;
  answer: string;
  tags: string[];
  points?: number;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'QUESTION_BANK',
    question: 'How do I upload and share previous year question papers?',
    answer: 'You can contribute question papers directly from the Question Bank page by clicking the "+ Upload Question" button, or from your Profile under "Contribute Question Paper". Simply provide the Course Code (e.g. SWE 311), Course Title, Faculty Name, Semester, Academic Year, and select the Exam Type (Quiz Question, Final Exam Question, Supple Exam Question, or CT Question). You will instantly receive +10 contributor points, plus an additional +25 points once verified by an Admin!',
    tags: ['Upload', 'Question Bank', 'Points', 'Contribution'],
    points: 10,
  },
  {
    id: 'faq-2',
    category: 'QUESTION_BANK',
    question: 'What are the 4 standard Question Types supported in the Question Bank?',
    answer: 'The SWE Academic Portal standardizes 4 distinct exam paper types:\n• Quiz Question: Short quizzes, pop quizzes, and lab quizzes.\n• Final Exam Question: Comprehensive semester-end board examinations.\n• Supple Exam Question: Supplementary/improvement examination papers.\n• CT Question: Class Tests administered by course teachers throughout the term.',
    tags: ['Quiz Question', 'Final Exam Question', 'Supple Exam Question', 'CT Question'],
  },
  {
    id: 'faq-3',
    category: 'QUESTION_BANK',
    question: 'How does the Semester-Smart algorithm work when viewing questions?',
    answer: 'When you open the Question Bank, our semester algorithm automatically matches your student profile\'s current semester and prioritizes those relevant questions at the very top of your feed. If no questions exist for your current semester yet, or when you type a specific search query, the portal automatically expands to display all matching departmental resources.',
    tags: ['Algorithm', 'Semester Priority', 'Search', 'Feed'],
  },
  {
    id: 'faq-4',
    category: 'QUESTION_BANK',
    question: 'How does the Admin Verification process work for uploaded questions?',
    answer: 'When a student uploads a question paper, it enters the Admin Verification Queue with a "PENDING" status. Department Admins and CRs review the document for readability, accurate course code, correct faculty attribution, and exam type consistency. Once approved, the status changes to "VERIFIED", the paper is published globally to all students, and the uploader receives +25 bonus points.',
    tags: ['Verification', 'Admin Review', 'Approval', 'Quality'],
  },
  {
    id: 'faq-5',
    category: 'EXAMS_GRADING',
    question: 'What is the procedure and eligibility for Supplementary (Supple) Exams?',
    answer: 'Supplementary (Supple) examinations are arranged for students seeking grade improvement or clearing backlogs after official semester results. Supple schedules and seat plans are published under Department Notices. Check previous year Supple Exam Question papers in our Question Bank to prepare effectively.',
    tags: ['Supple Exam', 'Eligibility', 'Backlog', 'Improvement'],
  },
  {
    id: 'faq-6',
    category: 'EXAMS_GRADING',
    question: 'Where can I find upcoming Class Tests (CTs), Quizzes, and Exam dates?',
    answer: 'Upcoming exam schedules are pinned in your Student Dashboard under "Upcoming Exams" and in the dedicated "Upcoming Exams" tab on the sidebar. Each exam entry specifies the Course Code, Exam Type, Date, Time, Room Number, and Syllabus description posted by your Class Representative.',
    tags: ['Exam Schedule', 'Class Test', 'Quiz', 'Syllabus'],
  },
  {
    id: 'faq-7',
    category: 'ROUTINE_ACADEMICS',
    question: 'How is the daily class routine updated when classes are rescheduled?',
    answer: 'Class Representatives (CR) update class timings and room shifts directly via the CR Dashboard. Any routine modification immediately updates your Today\'s Schedule card and triggers an instant batch notification banner so you never miss a room or time change.',
    tags: ['Routine', 'Reschedule', 'Class Time', 'Room Shift'],
  },
  {
    id: 'faq-8',
    category: 'ROUTINE_ACADEMICS',
    question: 'How can I view faculty consultation hours and office rooms?',
    answer: 'Navigate to the "Faculty Directory" page in the sidebar. You can view all departmental teachers along with their official designations, contact emails, room numbers, and designated weekly student consultation hours.',
    tags: ['Faculty', 'Consultation', 'Office Room', 'Advising'],
  },
  {
    id: 'faq-9',
    category: 'CR_ADMIN',
    question: 'What are the responsibilities and privileges of a Class Representative (CR)?',
    answer: 'Class Representatives are authorized to publish Batch Announcements, create and update Class Test / Quiz exam schedules, submit class routine adjustment requests, and assist with verifying student uploaded question papers.',
    tags: ['CR Dashboard', 'Batch Rep', 'Announcements', 'Permissions'],
  },
  {
    id: 'faq-10',
    category: 'ACCOUNT_POINTS',
    question: 'How do Contributor Points and Student Leaderboard rankings work?',
    answer: 'Students earn Academic Contributor Points for positive community engagement:\n• +10 Points: Submitting a valid question paper.\n• +25 Points: When your question paper is approved by Admin.\n• +5 Points: When other students upvote or download your verified papers.\nTop contributors are featured on the Department Contributor Board!',
    tags: ['Leaderboard', 'Points', 'Rankings', 'Badges'],
    points: 25,
  },
];

const CATEGORIES = [
  { id: 'ALL', label: 'All Questions', icon: HelpCircle },
  { id: 'QUESTION_BANK', label: 'Question Bank & Uploads', icon: GraduationCap },
  { id: 'EXAMS_GRADING', label: 'Exams & Quizzes', icon: Clock },
  { id: 'ROUTINE_ACADEMICS', label: 'Routine & Academics', icon: BookOpen },
  { id: 'CR_ADMIN', label: 'CR & Admin Roles', icon: ShieldCheck },
  { id: 'ACCOUNT_POINTS', label: 'Points & Rewards', icon: Award },
];

export const FAQPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'faq-1': true,
    'faq-2': true,
  });
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleHelpfulClick = (id: string, isHelpful: boolean) => {
    if (helpfulFeedback[id] !== undefined) return;
    setHelpfulFeedback(prev => ({ ...prev, [id]: isHelpful }));
    addToast('success', isHelpful ? 'Thank you for your feedback!' : 'We will improve this answer.');
  };

  const filteredFAQs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_DATA.filter(item => {
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-linear-to-r from-[#0A2147] via-[#0F326D] to-[#1E3A8A] rounded-2xl p-6 sm:p-8 text-white shadow-md border border-blue-900/40">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-xs">
            <HelpCircle className="w-3.5 h-3.5 text-blue-300" />
            <span>Academic Knowledge Base & Help Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Find instant answers to questions regarding past exam papers, question upload guidelines, exam types (Quiz, Final, Supple, CT), class routines, and contributor reward points.
          </p>

          {/* Search Box inside Header */}
          <div className="pt-2">
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics (e.g. upload question, supple exam, CT, points)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-slate-900 placeholder:text-slate-400 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded-md hover:bg-slate-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ambient Decorative Accents */}
        <div className="absolute right-[-20px] bottom-[-20px] opacity-15 pointer-events-none">
          <FileQuestion className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Action Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/resources/questions')}
          className="bg-white dark:bg-[#0F172A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Question Bank
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Search & download past exam papers</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/routine')}
          className="bg-white dark:bg-[#0F172A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Class Routine
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">View real-time batch weekly timetable</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/faculty')}
          className="bg-white dark:bg-[#0F172A] p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Faculty Directory
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Office hours & teacher consultation info</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFAQs.length === 0 ? (
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching questions found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try searching with different terms like "upload", "exam", "routine", or clear your filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredFAQs.map((faq) => {
            const isExpanded = !!expandedIds[faq.id];
            const hasFeedback = helpfulFeedback[faq.id];

            return (
              <div
                key={faq.id}
                className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all shadow-2xs"
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full px-5 py-4 text-left flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                        {faq.category.replace('_', ' ')}
                      </span>
                      {faq.points && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> +{faq.points} Pts Reward
                        </span>
                      )}
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold text-[#0A2147] dark:text-white leading-snug">
                      {faq.question}
                    </h2>
                  </div>
                  <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 mt-0.5">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-[#FAFCFF]/60 dark:bg-[#0B1120]/40 space-y-3 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed animate-fade-in">
                    <div className="whitespace-pre-line pt-2">
                      {faq.answer}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400">Tags:</span>
                      {faq.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery(tag);
                          }}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Helpful Feedback Box */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Was this answer helpful?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleHelpfulClick(faq.id, true)}
                          disabled={hasFeedback !== undefined}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            hasFeedback === true
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" /> Yes
                        </button>
                        <button
                          onClick={() => handleHelpfulClick(faq.id, false)}
                          disabled={hasFeedback !== undefined}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            hasFeedback === false
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Still Have Questions CTA */}
      <div className="bg-linear-to-r from-slate-900 to-blue-950 rounded-2xl p-6 text-white border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-base font-bold text-white">Still need assistance?</h2>
          <p className="text-xs text-slate-300">
            Reach out to your Class Representative or consult the Department Faculty office.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/announcements')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Announcements
          </button>
          <button
            onClick={() => navigate('/faculty')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Contact Faculty</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

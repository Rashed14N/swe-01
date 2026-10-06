import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

interface FeeRow {
  fee: string;
  amount: string;
}

interface GradeRow {
  marks: string;
  grade: string;
  point: string;
}

interface FAQItem {
  id: string;
  number: number;
  section: 'After Admission' | 'Exams and Grading' | 'Forum Fee';
  question: string;
  answerText?: string;
  bullets?: string[];
  postText?: string;
  feeTable?: FeeRow[];
  gradeTable?: GradeRow[];
  italicNote?: string;
}

const SWE_FAQ_DATA: FAQItem[] = [
  // SECTION 1: After Admission
  {
    id: 'faq-1',
    number: 1,
    section: 'After Admission',
    question: 'What fees do I pay after getting admitted?',
    answerText: 'Here is the breakdown of post-admission fees for the Software Engineering program:',
    feeTable: [
      { fee: 'Admission Fee (one-time)', amount: '20,000' },
      { fee: 'Registration Fee (per term)', amount: '10,000' },
      { fee: 'BNCC & Other Fee (one-time)', amount: '500' },
      { fee: 'Campus Activities (per month)', amount: '2,000' },
      { fee: 'Monthly installment of credit fees', amount: '7,000' },
    ],
    italicNote: 'Note: Fee amounts should be confirmed with the university accounts office as departmental figures and fee schedules may update.',
  },
  {
    id: 'faq-2',
    number: 2,
    section: 'After Admission',
    question: 'How do I pay my tuition?',
    answerText:
      'Tuition is paid in four equal installments in each term, before the deadline. If you pay late, you must pay a late fee. Registration and term fees cannot be refunded.',
  },
  {
    id: 'faq-3',
    number: 3,
    section: 'After Admission',
    question: 'Where do I deposit my payments?',
    answerText:
      'Deposit at NRB Commercial Bank, Metropolitan University Campus Branch, Bateshwar, Sylhet (A/C: 015954000000001). Write your full name, mobile number and student ID on the deposit slip, and keep the slip safe. For questions about fees, contact accounts@metrouni.edu.bd or call 01757535844.',
  },
  {
    id: 'faq-4',
    number: 4,
    section: 'After Admission',
    question: 'Why can my admission be cancelled?',
    answerText: 'The university can cancel your admission if you:',
    bullets: [
      'Do not submit the required documents,',
      'Break the Proctorial Rules,',
      'Stay absent without permission for three terms in a row, or',
      'Do not pay your dues on time.',
    ],
  },
  {
    id: 'faq-5',
    number: 5,
    section: 'After Admission',
    question: 'What if I drop out or do not get promoted?',
    answerText:
      'You must take admission again and pay the readmission fee. Submit a readmission application to the head of your department.',
  },
  {
    id: 'faq-6',
    number: 6,
    section: 'After Admission',
    question: 'Can I transfer credits from another university?',
    answerText:
      'Yes, you can transfer up to 50% of the credits needed for your degree. You must give the university your old syllabus and official transcripts so they can check them.',
  },
  {
    id: 'faq-7',
    number: 7,
    section: 'After Admission',
    question: 'How long is the BSc in Software Engineering?',
    answerText:
      'It takes four years (48 months) and has 160 credits in total. You complete 148 credits of theory and lab courses and a 12-credit internship at a software company.',
  },
  {
    id: 'faq-8',
    number: 8,
    section: 'After Admission',
    question: 'Are there scholarships?',
    answerText: 'The university offers several scholarship opportunities:',
    bullets: [
      'Students with Golden A+ in both SSC and HSC get an 80% tuition waiver.',
      "Students who get A+ in all courses in three terms in a row can apply for the Chairman's Scholarship.",
      "There is also a Vice Chancellor's Scholarship.",
    ],
  },

  // SECTION 2: Exams and Grading
  {
    id: 'faq-9',
    number: 9,
    section: 'Exams and Grading',
    question: 'How does the grading system work?',
    answerText:
      'The university follows the grading scale approved by the University Grants Commission (UGC).',
    gradeTable: [
      { marks: '80 and above', grade: 'A+', point: '4.00' },
      { marks: '75 to less than 80', grade: 'A', point: '3.75' },
      { marks: '70 to less than 75', grade: 'A-', point: '3.50' },
      { marks: '65 to less than 70', grade: 'B+', point: '3.25' },
      { marks: '60 to less than 65', grade: 'B', point: '3.00' },
      { marks: '55 to less than 60', grade: 'B-', point: '2.75' },
      { marks: '50 to less than 55', grade: 'C+', point: '2.50' },
      { marks: '45 to less than 50', grade: 'C', point: '2.25' },
      { marks: '40 to less than 45', grade: 'D', point: '2.00' },
      { marks: 'Less than 40', grade: 'F (Fail)', point: '0.00' },
    ],
    postText: 'If you get an F, the credits do not count and you must retake the course.',
  },
  {
    id: 'faq-10',
    number: 10,
    section: 'Exams and Grading',
    question: 'What do I need to graduate?',
    answerText:
      'You need a GPA of at least 2.0 in all courses and all the required credits. You must also earn at least 50% of your credits at Metropolitan University.',
  },
  {
    id: 'faq-11',
    number: 11,
    section: 'Exams and Grading',
    question: 'What if I miss an exam because of illness or an emergency?',
    answerText:
      'Apply to your department head with proof. If they accept it, you get an "Incomplete (I)" grade. You must take a make-up exam within one month of the next term. If you do not, the I automatically becomes an F.',
  },

  // SECTION 3: Forum Fee
  {
    id: 'faq-12',
    number: 12,
    section: 'Forum Fee',
    question: 'Why do I have to pay 200 taka to the forum?',
    answerText:
      'The 200 taka helps the forum run its activities. The forum organizes programming activities for students and helps them take part in programming competitions and events. The fee pays for organizing these activities and supporting students.',
    italicNote:
      'Please confirm with the forum officers exactly how the money is used, and say in the FAQ whether the fee is one-time or charged every term.',
  },
];

const SECTIONS: Array<'After Admission' | 'Exams and Grading' | 'Forum Fee'> = [
  'After Admission',
  'Exams and Grading',
  'Forum Fee',
];

export const FAQPage: React.FC = () => {
  const navigate = useNavigate();

  // Purge any legacy FAQ storage forever on mount
  useEffect(() => {
    try {
      localStorage.removeItem('portal_faqs');
      localStorage.removeItem('portal_faqs_v2');
      localStorage.removeItem('portal_faqs_v3');
    } catch (e) {
      console.warn('Could not clear legacy FAQs:', e);
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  // Single active expanded FAQ ID: opening one closes all other questions automatically
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  const toggleExpand = (id: string) => {
    // If clicked FAQ is already open, close it; otherwise open it and auto-close others
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  const filteredFAQs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SWE_FAQ_DATA;

    return SWE_FAQ_DATA.filter((item) => {
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchSection = item.section.toLowerCase().includes(q);
      const matchAnswer = item.answerText?.toLowerCase().includes(q);
      const matchPost = item.postText?.toLowerCase().includes(q);
      const matchBullets = item.bullets?.some((b) => b.toLowerCase().includes(q));
      const matchFee = item.feeTable?.some(
        (f) => f.fee.toLowerCase().includes(q) || f.amount.includes(q)
      );
      const matchGrade = item.gradeTable?.some(
        (g) =>
          g.marks.toLowerCase().includes(q) ||
          g.grade.toLowerCase().includes(q) ||
          g.point.includes(q)
      );

      return (
        matchQuestion ||
        matchSection ||
        matchAnswer ||
        matchPost ||
        matchBullets ||
        matchFee ||
        matchGrade
      );
    });
  }, [searchQuery]);

  return (
    <div className="space-y-6 max-w-[1400px] pb-12 animate-fade-in">
      <PageHeader
        title="Software Engineering FAQ"
        description="Official Metropolitan University department guidelines covering post-admission fee structure, tuition installments, grading scales, credit transfers, and academic policies."
        breadcrumb="OFFICIAL ACADEMIC KNOWLEDGE BASE"
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search topics (e.g. fees, tuition, grading, scholarship, forum)..."
      />

      {/* Question Counter Bar */}
      <div className="flex items-center justify-between px-1 text-xs text-[#52657C] dark:text-slate-400">
        <span className="font-semibold">
          Showing {filteredFAQs.length} questions
        </span>
        {openFaqId && (
          <button
            type="button"
            onClick={() => setOpenFaqId(null)}
            className="font-semibold text-[#1D5FD1] hover:underline cursor-pointer"
          >
            Collapse Active Question
          </button>
        )}
      </div>

      {/* FAQ Sections */}
      {filteredFAQs.length === 0 ? (
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-10 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">
            No matching questions found
          </h3>
          <p className="text-xs text-[#52657C] dark:text-slate-400 max-w-sm mx-auto">
            Try searching for other terms such as "admission", "fees", "grading", or "tuition".
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-[#1769E8] hover:bg-[#1158C8] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Reset Search
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((sectionName) => {
            const sectionItems = filteredFAQs.filter(
              (item) => item.section === sectionName
            );
            if (sectionItems.length === 0) return null;

            return (
              <div key={sectionName} className="space-y-3">
                {/* Section Title */}
                <div className="flex items-center gap-2 pb-1.5 border-b border-[#DDE5F0] dark:border-slate-800">
                  <span className="w-2 h-2 rounded-full bg-[#1D5FD1]" />
                  <h2 className="text-sm md:text-base font-extrabold text-[#0A2147] dark:text-white tracking-tight">
                    {sectionName}
                  </h2>
                  <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                    ({sectionItems.length} {sectionItems.length === 1 ? 'question' : 'questions'})
                  </span>
                </div>

                {/* Section Questions Accordion */}
                <div className="space-y-2.5">
                  {sectionItems.map((faq) => {
                    const isExpanded = openFaqId === faq.id;

                    return (
                      <div
                        key={faq.id}
                        className={`bg-white dark:bg-[#0F172A] rounded-xl border transition-all shadow-[0_1px_3px_rgba(15,35,70,0.03)] overflow-hidden ${
                          isExpanded
                            ? 'border-[#2563EB] dark:border-blue-700 ring-1 ring-blue-500/20'
                            : 'border-[#D8E2EE] dark:border-slate-800 hover:border-[#BFD3EA]'
                        }`}
                      >
                        {/* Question Header */}
                        <div
                          onClick={() => toggleExpand(faq.id)}
                          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8FBFF] dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-md bg-[#EFF5FF] dark:bg-blue-950/60 border border-[#D5E2FA] dark:border-blue-900/60 flex items-center justify-center text-[#1D5FD1] dark:text-blue-300 font-bold text-xs shrink-0">
                              {faq.number}
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-[#0A2147] dark:text-white leading-snug">
                              {faq.question}
                            </h3>
                          </div>

                          <div
                            className={`p-1 rounded-md shrink-0 transition-colors ${
                              isExpanded
                                ? 'bg-[#EFF5FF] text-[#1D5FD1] dark:bg-blue-950/60 dark:text-blue-300'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>

                        {/* Animated Answer Body */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key={`content-${faq.id}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 pt-3 border-t border-[#E5EBF3] dark:border-slate-800 bg-[#F9FBFE] dark:bg-[#090F1E]/50 space-y-3.5 text-xs sm:text-[13px] text-[#334155] dark:text-slate-300 leading-relaxed font-normal">
                                {/* Lead Paragraph */}
                                {faq.answerText && (
                                  <p className="font-normal text-[#1E293B] dark:text-slate-200">
                                    {faq.answerText}
                                  </p>
                                )}

                                {/* Question 1: Fee Structure Table */}
                                {faq.feeTable && (
                                  <div className="overflow-x-auto rounded-lg border border-[#D8E2EE] dark:border-slate-800 my-2">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-[#F2F6FB] dark:bg-[#121D30] border-b border-[#DCE6F2] dark:border-slate-800 text-[11px] font-extrabold text-[#0A2147] dark:text-white uppercase tracking-wider">
                                          <th className="py-2.5 px-4">Fee Item</th>
                                          <th className="py-2.5 px-4 text-right">Amount (BDT)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E5EBF3] dark:divide-slate-800 bg-white dark:bg-[#0F172A] font-medium text-xs">
                                        {faq.feeTable.map((row, idx) => (
                                          <tr
                                            key={idx}
                                            className="hover:bg-[#F8FBFF] dark:hover:bg-slate-800/40 transition-colors"
                                          >
                                            <td className="py-2.5 px-4 text-[#1E293B] dark:text-slate-200">
                                              {row.fee}
                                            </td>
                                            <td className="py-2.5 px-4 font-bold text-[#1D5FD1] dark:text-blue-400 text-right">
                                              ৳ {row.amount}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Question 9: Grading Scale Table */}
                                {faq.gradeTable && (
                                  <div className="overflow-x-auto rounded-lg border border-[#D8E2EE] dark:border-slate-800 my-2">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-[#F2F6FB] dark:bg-[#121D30] border-b border-[#DCE6F2] dark:border-slate-800 text-[11px] font-extrabold text-[#0A2147] dark:text-white uppercase tracking-wider">
                                          <th className="py-2.5 px-4">Marks</th>
                                          <th className="py-2.5 px-4 text-center">Letter Grade</th>
                                          <th className="py-2.5 px-4 text-right">Grade Point</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E5EBF3] dark:divide-slate-800 bg-white dark:bg-[#0F172A] font-medium text-xs">
                                        {faq.gradeTable.map((row, idx) => {
                                          const isFail = row.grade.includes('F');
                                          const isTop = row.grade === 'A+';

                                          return (
                                            <tr
                                              key={idx}
                                              className={`transition-colors ${
                                                isFail
                                                  ? 'bg-rose-50/50 dark:bg-rose-950/20'
                                                  : isTop
                                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                                                  : 'hover:bg-[#F8FBFF] dark:hover:bg-slate-800/40'
                                              }`}
                                            >
                                              <td className="py-2.5 px-4 text-[#1E293B] dark:text-slate-200">
                                                {row.marks}
                                              </td>
                                              <td className="py-2.5 px-4 text-center">
                                                <span
                                                  className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-xs ${
                                                    isFail
                                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                      : isTop
                                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                      : 'bg-[#EFF5FF] text-[#1D5FD1] dark:bg-blue-950/60 dark:text-blue-300 border border-[#D5E2FA] dark:border-blue-900/60'
                                                  }`}
                                                >
                                                  {row.grade}
                                                </span>
                                              </td>
                                              <td className="py-2.5 px-4 font-bold text-[#0A2147] dark:text-white text-right">
                                                {row.point}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Bullet Points if available */}
                                {faq.bullets && faq.bullets.length > 0 && (
                                  <ul className="space-y-1.5 pl-4 list-disc marker:text-[#1D5FD1] dark:marker:text-blue-400">
                                    {faq.bullets.map((bullet, idx) => (
                                      <li key={idx} className="text-[#1E293B] dark:text-slate-200">
                                        {bullet}
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {/* Post Text */}
                                {faq.postText && (
                                  <p className="font-semibold text-rose-600 dark:text-rose-400 pt-1">
                                    {faq.postText}
                                  </p>
                                )}

                                {/* Italic Note */}
                                {faq.italicNote && (
                                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 italic">
                                    {faq.italicNote}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact & Support Card */}
      <div className="bg-[#F6F9FD] dark:bg-[#0F172A] rounded-xl p-5 border border-[#DCE5F0] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">Have additional questions?</h3>
          <p className="text-xs text-[#52657C] dark:text-slate-400">
            Contact the Department of Software Engineering office or consult with your Class Representative (CR).
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/faculty')}
          className="px-4 py-2 bg-[#1769E8] hover:bg-[#1158C8] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
        >
          <span>Faculty Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

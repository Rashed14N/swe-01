import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquareText,
  X,
  ArrowUp,
  RotateCcw,
  Maximize2,
  Minimize2,
  ArrowUpRight,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ActionLink {
  label: string;
  path: string;
}

interface InfoRow {
  tag?: string;
  tagTone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  primary: string;
  secondary?: string;
  meta?: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  rows?: InfoRow[];
  actionLinks?: ActionLink[];
}

const STORAGE_KEY = 'swe_portal_chat_v4';
const SESSION_ID_KEY = 'swe_portal_chat_session_id';

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return 'default-session';
  }
}

const TONE_STYLES: Record<string, { pill: string; border: string }> = {
  blue: {
    pill: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
    border: 'border-l-blue-500',
  },
  emerald: {
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
    border: 'border-l-emerald-500',
  },
  amber: {
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
    border: 'border-l-amber-500',
  },
  rose: {
    pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
    border: 'border-l-rose-500',
  },
  purple: {
    pill: 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
    border: 'border-l-purple-500',
  },
  slate: {
    pill: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    border: 'border-l-slate-400',
  },
};

export const AcademicChatbot: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const sessionId = useRef<string>(getOrCreateSessionId());

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeContextLabel, setActiveContextLabel] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Today's routine",
    'kalke lab koytay?',
    'My courses',
    '10th batch routine',
    'Faculty list',
  ]);

  const initialGreeting: ChatMessage = {
    id: 'welcome-msg',
    role: 'assistant',
    content: `Hi **${user?.name?.split(' ')[0] || 'there'}**! Ask me about your class routine, courses, exams, or any batch/faculty info across the department.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actionLinks: [
      { label: 'Routine', path: '/routine' },
      { label: 'Courses', path: '/courses' },
      { label: 'Exams', path: '/exams' },
    ],
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [initialGreeting];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    if (!textOverride) setInput('');
    setIsLoading(true);

    try {
      // Token-optimized history: only last 3 turns, ultra-compact summary (saves ~80% history tokens)
      const historyPayload = updatedHistory
        .filter((m) => m.id !== 'welcome-msg' && !m.id.startsWith('welcome-'))
        .slice(-3)
        .map((m) => {
          const firstRow = m.rows && m.rows.length > 0 ? ` (${m.rows[0].primary})` : '';
          return {
            role: m.role,
            content: (m.content + firstRow).slice(0, 160),
          };
        });

      const res = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        const botMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rows: Array.isArray(data.rows) && data.rows.length > 0 ? data.rows : undefined,
          actionLinks: Array.isArray(data.actionLinks) ? data.actionLinks : undefined,
        };
        setMessages((prev) => [...prev, botMessage]);

        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
        if (data.activeContext) {
          const ctxParts = [data.activeContext.course, data.activeContext.day].filter(Boolean);
          setActiveContextLabel(ctxParts.length > 0 ? ctxParts.join(' • ') : null);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: data?.error || 'Could not process that request right now. Please try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Connection issue. Please check your network and try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    sessionId.current = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId.current);
    sessionStorage.removeItem(STORAGE_KEY);
    setActiveContextLabel(null);
    setMessages([
      {
        ...initialGreeting,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleCopy = (id: string, msg: ChatMessage) => {
    const rowsText = msg.rows
      ? '\n' +
        msg.rows
          .map((r) => `${r.tag ? `[${r.tag}] ` : ''}${r.primary}${r.secondary ? ` — ${r.secondary}` : ''}`)
          .join('\n')
      : '';
    navigator.clipboard?.writeText((msg.content + rowsText).replace(/\*\*/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const renderFormattedContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return (
        <React.Fragment key={lineIdx}>
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIdx} className="font-bold text-slate-900 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return (
                <em key={partIdx} className="italic text-blue-600 dark:text-blue-400 font-medium">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <span key={partIdx}>{part}</span>;
          })}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <>
      {/* Minimal Icon-Only Floating Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="SWE Assistant"
          aria-label="Open SWE Academic Chatbot"
          className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full bg-[#0F172A] dark:bg-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border border-white/15 cursor-pointer"
        >
          <MessageSquareText className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#090F1E]" />
        </button>
      )}

      {/* Clean Modern Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 shadow-[0_16px_48px_rgba(15,23,42,0.22)] rounded-2xl overflow-hidden transition-all duration-200 ${
            isExpanded
              ? 'inset-3 sm:inset-6 md:inset-10'
              : 'bottom-4 right-4 left-4 sm:left-auto sm:w-[390px] h-[540px] max-h-[84vh]'
          }`}
        >
          {/* Minimal Clean Header */}
          <div className="px-4 py-3 bg-white dark:bg-[#0F172A] border-b border-slate-100 dark:border-slate-800/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                    SWE Assistant
                  </h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.batchName || 'SWE Portal'} • Routine, Courses & Exams
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                title="Reset conversation memory"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Compact size' : 'Expand'}
                className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 bg-[#F8FAFC]/60 dark:bg-[#0B1120]">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl text-[12.5px] leading-relaxed ${
                      isUser
                        ? 'bg-[#0F172A] dark:bg-blue-600 text-white px-3.5 py-2 rounded-br-xs shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5 rounded-bl-xs shadow-2xs w-full'
                    }`}
                  >
                    {/* Main Conversational Reply */}
                    <div className={isUser ? 'text-white' : 'text-slate-700 dark:text-slate-200'}>
                      {renderFormattedContent(msg.content)}
                    </div>

                    {/* Clean Minimal Info Rows (No heavy header box) */}
                    {!isUser && msg.rows && msg.rows.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        {msg.rows.map((row, idx) => {
                          const tone = TONE_STYLES[row.tagTone || 'blue'] || TONE_STYLES.blue;
                          return (
                            <div
                              key={idx}
                              className={`border-l-2 ${tone.border} bg-slate-50/90 dark:bg-slate-800/50 rounded-r-xl px-3 py-2 space-y-0.5`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[12px] text-slate-900 dark:text-white leading-snug">
                                  {row.primary}
                                </span>
                                {row.tag && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${tone.pill}`}
                                  >
                                    {row.tag}
                                  </span>
                                )}
                              </div>
                              {row.secondary && (
                                <div className="text-[11.5px] text-slate-600 dark:text-slate-300">
                                  {row.secondary}
                                </div>
                              )}
                              {row.meta && row.meta.length > 0 && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  {row.meta.map((m, mIdx) => (
                                    <span key={mIdx}>{m}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Subtle Inline Navigation Links */}
                    {!isUser && msg.actionLinks && msg.actionLinks.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                        {msg.actionLinks.map((link) => (
                          <button
                            key={link.path + link.label}
                            type="button"
                            onClick={() => {
                              navigate(link.path);
                              if (!isExpanded && window.innerWidth < 640) {
                                setIsOpen(false);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                          >
                            <span>{link.label}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg)}
                          className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 w-fit shadow-2xs">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Contextual Quick Follow-Up Chips */}
          {!isLoading && suggestions.length > 0 && (
            <div className="px-3 py-2 bg-white dark:bg-[#0F172A] border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {suggestions.slice(0, 4).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSendMessage(sug)}
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Sleek Pill Composer Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white dark:bg-[#0F172A] border-t border-slate-100 dark:border-slate-800 shrink-0"
          >
            <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-full pl-3.5 pr-1.5 py-1 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything or follow up (e.g. teacher ke?, room koto?)..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-[12.5px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none py-1"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="w-7 h-7 rounded-full bg-[#0F172A] dark:bg-blue-600 hover:bg-blue-600 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

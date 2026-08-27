import React from 'react';
import { BookOpen, CalendarDays, ArrowUpRight, Terminal } from 'lucide-react';
import { User } from '../../types';

interface PortalHeroCardProps {
  user: User | null;
  onNavigateToResources: () => void;
  onNavigateToRoutine: () => void;
}

export const PortalHeroCard: React.FC<PortalHeroCardProps> = ({
  user,
  onNavigateToResources,
  onNavigateToRoutine,
}) => {
  const nameDisplay = user?.name || 'Student';
  const batchDisplay = user?.batchName || 'SWE 9th Batch';
  const studentIdDisplay = user?.studentId || '21-XXXXX-1';
  const semesterDisplay = user?.currentSemester ? `Semester ${user.currentSemester}` : 'Semester 4';

  return (
    <div
      id="portal-hero-card"
      className="relative overflow-hidden rounded-[18px] sm:rounded-[22px] p-4 sm:p-6 lg:py-7 lg:px-8 xl:px-9 transition-all font-sans"
      style={{
        background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
        border: '1px solid rgba(120, 145, 255, 0.22)',
        boxShadow: '0 8px 28px rgba(45, 70, 150, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Decorative Wave, Dotted Texture & Glow Background Details */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Right-Side Soft Radial Glow */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 82% 34%, rgba(126, 140, 255, 0.18), transparent 48%)',
          }}
        />

        {/* Subtle Dotted Texture near Upper-Middle/Right */}
        <div
          className="absolute top-2 right-[10%] sm:right-[20%] w-36 sm:w-48 h-20 sm:h-28 pointer-events-none opacity-70 sm:opacity-100"
          style={{
            backgroundImage: 'radial-gradient(rgba(101, 120, 255, 0.18) 1.25px, transparent 1.25px)',
            backgroundSize: '13px 13px',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 75%)',
          }}
        />

        {/* Flowing Wave Layers & Bottom-Right Layered Curves */}
        <svg
          className="absolute right-0 bottom-0 w-[420px] sm:w-[560px] lg:w-[640px] h-full max-h-[380px] pointer-events-none opacity-90 sm:opacity-100"
          viewBox="0 0 640 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {/* Layer 1: Soft broad wave */}
          <path
            d="M640 50C510 100 400 65 290 145C180 225 120 285 0 380H640V50Z"
            fill="url(#wave-layer-1)"
          />
          {/* Layer 2: Intermediate translucent wave */}
          <path
            d="M640 130C530 170 420 125 320 205C220 285 150 325 45 380H640V130Z"
            fill="url(#wave-layer-2)"
          />
          {/* Layer 3: Lower subtle wave */}
          <path
            d="M640 210C550 230 440 195 360 265C280 335 220 355 125 380H640V210Z"
            fill="url(#wave-layer-3)"
          />
          {/* Layer 4: Translucent White-Glow Wave Ribbon */}
          <path
            d="M640 275C560 290 480 255 410 305C340 355 280 370 195 380H640V275Z"
            fill="url(#wave-layer-4)"
          />

          {/* Thin Translucent Layered Curved Wave Lines (Bottom-Right) */}
          <path
            d="M640 90C500 130 390 85 280 175C185 253 125 310 15 380"
            stroke="rgba(124, 140, 255, 0.16)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M640 160C525 190 430 155 335 230C240 305 175 343 75 380"
            stroke="rgba(160, 176, 255, 0.22)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M640 230C545 245 465 215 390 275C315 335 250 355 155 380"
            stroke="rgba(255, 255, 255, 0.55)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M640 290C570 300 500 275 440 320C380 365 320 373 235 380"
            stroke="rgba(124, 140, 255, 0.20)"
            strokeWidth="1"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="wave-layer-1" x1="640" y1="50" x2="160" y2="380" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5C6EFF" stopOpacity="0.08" />
              <stop offset="0.6" stopColor="#7C8CFF" stopOpacity="0.05" />
              <stop offset="1" stopColor="#A0B0FF" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="wave-layer-2" x1="640" y1="130" x2="210" y2="380" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C8CFF" stopOpacity="0.10" />
              <stop offset="0.5" stopColor="#A0B0FF" stopOpacity="0.06" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="wave-layer-3" x1="640" y1="210" x2="260" y2="380" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A0B0FF" stopOpacity="0.12" />
              <stop offset="0.7" stopColor="#C4D0FF" stopOpacity="0.08" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="wave-layer-4" x1="640" y1="275" x2="310" y2="380" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="0.5" stopColor="#E4E9FF" stopOpacity="0.20" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Content: Responsive Two-Column Composition */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 lg:gap-8 xl:gap-10">
        {/* Left Side: Title & Action Cards */}
        <div className="w-full flex-1 flex flex-col justify-between lg:max-w-[620px]">
          {/* Portal Title & Accent Lines */}
          <div>
            {/* Top Blue Accent Line */}
            <div
              className="mb-2 sm:mb-3 h-[3px] sm:h-[3.5px] w-10 sm:w-14 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #2348F5 0%, #4D50F5 100%)',
              }}
            />

            <h1 className="font-extrabold tracking-tight leading-[1.1] select-none text-[26px] min-[360px]:text-[28px] min-[420px]:text-[32px] sm:text-[38px] lg:text-[42px] xl:text-[46px]">
              <span className="block text-[#071B52]">Software</span>
              <span
                className="block bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #2348F5 0%, #4D50F5 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Engineering Portal
              </span>
            </h1>

            {/* Bottom Blue Accent Line */}
            <div
              className="mt-2 sm:mt-3 h-[3px] sm:h-[3.5px] w-10 sm:w-14 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #2348F5 0%, #4D50F5 100%)',
              }}
            />
          </div>

          {/* Action Cards: Exactly 2 Actions (Resources, Full Routine) */}
          <div className="mt-4.5 sm:mt-6 lg:mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 items-stretch">
            {/* 1. Resources (Primary Action) */}
            <div
              id="hero-action-resources"
              onClick={onNavigateToResources}
              className="group cursor-pointer rounded-[13px] sm:rounded-[14px] p-3 sm:py-3.5 sm:px-4 min-h-[74px] sm:min-h-[86px] flex items-center justify-between transition-all duration-[180ms] hover:-translate-y-[2px] active:scale-[0.99] select-none relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #3155F5 0%, #1748EE 100%)',
                boxShadow: '0 6px 18px rgba(23, 72, 238, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              }}
            >
              {/* Subtle wave highlight inside card */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />

              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 relative z-10">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 text-white transition-transform duration-200 group-hover:scale-105">
                  <BookOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14.5px] sm:text-[16px] font-bold text-white tracking-tight leading-snug">
                    Resources
                  </h4>
                  <p className="text-[11.5px] sm:text-[12.5px] text-blue-100/90 font-medium tracking-tight mt-0.5 truncate">
                    Notes, PDFs & more
                  </p>
                </div>
              </div>

              {/* Compact Arrow Button */}
              <div className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 rounded-[8px] sm:rounded-[9px] bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center shrink-0 text-white transition-all duration-[180ms] group-hover:translate-x-[2px] ml-2 relative z-10">
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
            </div>

            {/* 2. Full Routine (Secondary Action) */}
            <div
              id="hero-action-routine"
              onClick={onNavigateToRoutine}
              className="group cursor-pointer rounded-[13px] sm:rounded-[14px] p-3 sm:py-3.5 sm:px-4 min-h-[74px] sm:min-h-[86px] flex items-center justify-between transition-all duration-[180ms] hover:-translate-y-[2px] active:scale-[0.99] select-none border"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.82)',
                borderColor: 'rgba(135, 155, 225, 0.32)',
                boxShadow: '0 4px 14px rgba(40, 70, 150, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{
                    backgroundColor: '#EAEAFF',
                    color: '#2552F3',
                    border: '1px solid #D8DEFA',
                  }}
                >
                  <CalendarDays className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14.5px] sm:text-[16px] font-bold text-[#071B52] tracking-tight leading-snug">
                    Full Routine
                  </h4>
                  <p className="text-[11.5px] sm:text-[12.5px] text-[#556987] font-medium tracking-tight mt-0.5 truncate">
                    View your full routine
                  </p>
                </div>
              </div>

              {/* Compact Arrow Button */}
              <div
                className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 rounded-[8px] sm:rounded-[9px] flex items-center justify-center shrink-0 transition-all duration-[180ms] group-hover:translate-x-[2px] ml-2 border"
                style={{
                  backgroundColor: '#EFF4FF',
                  borderColor: '#D4DCF5',
                  color: '#071B52',
                }}
              >
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Modern Software Engineering Terminal Interface (Hidden on Mobile/Tablet for Clean UX, Visible on Desktop) */}
        <div className="hidden lg:flex w-full lg:w-[42%] max-w-[390px] xl:max-w-[420px] mx-auto lg:mx-0 items-center justify-center pt-0">
          <div className="w-full relative select-none transition-transform duration-300 hover:scale-[1.01]">
            {/* Ambient Back Glow */}
            <div className="absolute -inset-2 sm:-inset-3 bg-gradient-to-tr from-blue-500/20 via-indigo-500/15 to-purple-500/10 blur-lg sm:blur-xl rounded-2xl pointer-events-none" />

            {/* Terminal Card Window */}
            <div className="relative rounded-[14px] sm:rounded-[16px] bg-[#0A101E]/95 backdrop-blur-md shadow-xl sm:shadow-2xl border border-slate-700/60 overflow-hidden ring-1 ring-white/10 z-10 font-mono text-[10px] min-[360px]:text-[10.5px] sm:text-[11px] leading-relaxed">
              {/* Terminal Header Bar */}
              <div className="bg-[#060A14] px-3 py-2 sm:px-3.5 sm:py-2.5 border-b border-slate-800/80 flex items-center justify-between">
                {/* Traffic Light Window Buttons */}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#FF5F56]" />
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#FFBD2E]" />
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#27C93F]" />
                </div>

                {/* Terminal Title & Icon */}
                <div className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-slate-300 font-sans font-medium">
                  <Terminal className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#38BDF8]" />
                  <span>swe-terminal</span>
                  <span className="text-slate-500">~</span>
                </div>

                {/* Shell type badge */}
                <span className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 text-[9px] sm:text-[9.5px] text-slate-400 font-sans font-medium">
                  zsh
                </span>
              </div>

              {/* Terminal Body */}
              <div className="p-3 sm:p-4 space-y-1 sm:space-y-1.5 overflow-hidden select-none">
                {/* Prompt 1 */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <span className="text-emerald-400 font-semibold">➜</span>
                  <span className="text-sky-300">~</span>
                  <span className="text-slate-400">$</span>
                  <span className="text-slate-100 font-medium">swe auth --current-user</span>
                </div>

                {/* System Response / JSON Block */}
                <div className="pt-0.5 space-y-0.5 pl-2 border-l-2 border-slate-800 text-slate-300">
                  <div className="text-slate-400">{'{'}</div>
                  <div className="pl-2.5 sm:pl-3 truncate">
                    <span className="text-sky-300">"name"</span>: <span className="text-amber-300">"{nameDisplay}"</span>,
                  </div>
                  <div className="pl-2.5 sm:pl-3 truncate">
                    <span className="text-sky-300">"batch"</span>: <span className="text-emerald-300">"{batchDisplay}"</span>,
                  </div>
                  <div className="pl-2.5 sm:pl-3 truncate">
                    <span className="text-sky-300">"studentId"</span>: <span className="text-amber-300">"{studentIdDisplay}"</span>,
                  </div>
                  <div className="pl-2.5 sm:pl-3 truncate">
                    <span className="text-sky-300">"semester"</span>: <span className="text-indigo-300">"{semesterDisplay}"</span>,
                  </div>
                  <div className="pl-2.5 sm:pl-3 truncate">
                    <span className="text-sky-300">"status"</span>: <span className="text-emerald-400">"ONLINE_VERIFIED"</span>
                  </div>
                  <div className="text-slate-400">{'}'}</div>
                </div>

                {/* Active Prompt Line with blinking cursor */}
                <div className="flex items-center gap-1 sm:gap-1.5 pt-0.5 sm:pt-1 text-slate-200">
                  <span className="text-emerald-400 font-semibold">➜</span>
                  <span className="text-sky-300">~</span>
                  <span className="text-slate-400">$</span>
                  <span className="inline-block w-1.5 sm:w-2 h-3 sm:h-3.5 bg-sky-400 animate-pulse ml-0.5" />
                </div>
              </div>

              {/* Terminal Status / Footer Bar */}
              <div className="bg-[#060A14] px-3 py-1.5 sm:px-3.5 sm:py-1.5 border-t border-slate-800/80 flex items-center justify-between text-[8.5px] sm:text-[9.5px] text-slate-400 font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-semibold">Session Connected</span>
                </div>
                <span className="text-slate-500 font-mono">utf-8 • node 20.x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



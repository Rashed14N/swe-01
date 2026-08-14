import React, { useState, useEffect } from 'react';
import { Award, Trophy, Star, FileText, CheckCircle, TrendingUp, ShieldCheck } from 'lucide-react';
import { Contributor } from '../../types';

export const ContributorLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/resources/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard(data.leaderboard || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const getRankBadge = (rank: number, badge: string) => {
    if (rank === 1) {
      return (
        <span className="px-2.5 py-1 bg-amber-500 text-white font-black text-[10px] rounded-full shadow-2xs flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-100" /> #1 Top Contributor
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="px-2.5 py-1 bg-slate-300 text-slate-900 font-bold text-[10px] rounded-full flex items-center gap-1">
          🥇 Gold Contributor
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="px-2.5 py-1 bg-amber-700 text-white font-bold text-[10px] rounded-full flex items-center gap-1">
          🥈 Silver Contributor
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-full">
        🥉 Bronze Contributor
      </span>
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4" /> Gamified Academic Portal
          </div>
          <h2 className="text-lg font-black text-slate-900">Best Student Contributors Leaderboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Earn points by uploading question banks, notes & lab resources (+10 pts per upload, +25 pts on admin verification).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 shrink-0">
          <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
          <span>Point Rules: Upload +10 pts | Verified +25 pts</span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading contributor rankings...</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {leaderboard.slice(0, 6).map((contributor, idx) => (
            <div
              key={contributor.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                contributor.rank === 1
                  ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-300 shadow-xs'
                  : contributor.rank === 2
                  ? 'bg-gradient-to-br from-slate-200/20 via-slate-100/10 to-white border-slate-300'
                  : contributor.rank === 3
                  ? 'bg-gradient-to-br from-amber-900/5 to-white border-amber-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono font-black text-slate-400 text-xs">#{contributor.rank}</span>
                  {getRankBadge(contributor.rank, contributor.badge)}
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={contributor.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                    alt={contributor.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/60 shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{contributor.name}</h3>
                    <span className="text-[10px] font-mono text-slate-500 block">{contributor.studentId}</span>
                    <span className="text-[10px] font-bold text-blue-600 block">{contributor.batchName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-600">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-slate-800">{contributor.approvedCount}</span>
                  <span className="text-slate-400 text-[10px]">verified</span>
                </div>

                <div className="flex items-center gap-1 text-amber-700 font-extrabold bg-amber-100/80 px-2.5 py-1 rounded-lg">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  <span>{contributor.points} pts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

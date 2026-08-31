import React, { useState, useMemo } from 'react';
import { X, Check, UserCircle, Search } from 'lucide-react';
import { PRESET_AVATARS, DEFAULT_AVATAR_URL } from '../../data/avatars';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string;
  userName: string;
  studentId: string;
  onSelectAvatar: (avatarUrl: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  userName,
  studentId,
  onSelectAvatar,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'animals' | 'nature' | 'creatures' | 'items'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatarUrl || DEFAULT_AVATAR_URL);

  const filteredAvatars = useMemo(() => {
    return PRESET_AVATARS.filter((avatar) => {
      const matchesCat = selectedCategory === 'all' || avatar.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' || 
        avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        avatar.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelectAvatar(previewUrl);
    onClose();
  };

  const selectedAvatarObj = PRESET_AVATARS.find(a => a.url === previewUrl || a.id === previewUrl);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div 
        className="bg-white dark:bg-[#0F172A] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-2xs">
              <UserCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Choose Profile Avatar
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold">
                  38 Presets
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select your official character avatar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Preview Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border-b border-blue-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 p-1 border-2 border-blue-500 shadow-md shrink-0">
              <img
                src={previewUrl}
                alt="Avatar Preview"
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                Selected Profile Avatar
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {selectedAvatarObj?.name || 'Selected Avatar'}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedAvatarObj?.fileName || 'preset.svg'}
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All (38)' },
              { id: 'animals', label: 'Animals' },
              { id: 'nature', label: 'Nature' },
              { id: 'creatures', label: 'Creatures' },
              { id: 'items', label: 'Items & Tools' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative shrink-0 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search avatars..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Avatar Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-80">
          {filteredAvatars.map((avatar) => {
            const isSelected = previewUrl === avatar.url || previewUrl === avatar.id;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setPreviewUrl(avatar.url)}
                className={`group relative p-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  isSelected
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 ring-2 ring-blue-500/20 shadow-md scale-[1.03]'
                    : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/90'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/60 p-1 flex items-center justify-center shadow-2xs">
                  <img
                    src={avatar.url}
                    alt={avatar.name}
                    className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full px-1">
                  {avatar.name}
                </span>

                {isSelected && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}

          {filteredAvatars.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400">
              <p className="text-sm font-medium">No avatar matches &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="mt-2 text-xs text-blue-600 hover:underline font-bold"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {filteredAvatars.length} / {PRESET_AVATARS.length} Avatars available
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Save Avatar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

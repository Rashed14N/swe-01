import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, Plus, Edit, Trash2, List, LayoutGrid } from 'lucide-react';
import { RoutineSlot } from '../../types';

interface VisualRoutineGridProps {
  routines: RoutineSlot[];
  canEdit?: boolean;
  onAddSlot?: (day?: string) => void;
  onEditSlot?: (slot: RoutineSlot) => void;
  onDeleteSlot?: (slotId: string) => void;
}

const DAYS: ('SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY')[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
];

const DAY_CONFIG: Record<string, { short: string; label: string; dateStr: string }> = {
  SUNDAY: { short: 'SUN', label: 'Sunday', dateStr: '18 May' },
  MONDAY: { short: 'MON', label: 'Monday', dateStr: '19 May' },
  TUESDAY: { short: 'TUE', label: 'Tuesday', dateStr: '20 May' },
  WEDNESDAY: { short: 'WED', label: 'Wednesday', dateStr: '21 May' },
  THURSDAY: { short: 'THU', label: 'Thursday', dateStr: '22 May' },
};

export const VisualRoutineGrid: React.FC<VisualRoutineGridProps> = ({
  routines,
  canEdit = false,
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
}) => {
  const [viewMode, setViewMode] = useState<'SCHEDULE' | 'WEEKLY_GRID'>('SCHEDULE');
  const [selectedDay, setSelectedDay] = useState<string>('SUNDAY');

  const selectedDaySlots = routines
    .filter((r) => r.day === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-5">
      {/* View Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F6F9FD] p-3 rounded-xl border border-[#DCE5F0] shadow-[0_1px_2px_rgba(15,35,70,0.04)]">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#D8E2EE]">
          <button
            onClick={() => setViewMode('SCHEDULE')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 ${
              viewMode === 'SCHEDULE'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Day Schedule View
          </button>
          <button
            onClick={() => setViewMode('WEEKLY_GRID')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 ${
              viewMode === 'WEEKLY_GRID'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Full Weekly Matrix
          </button>
        </div>

        {canEdit && onAddSlot && (
          <button
            onClick={() => onAddSlot(selectedDay)}
            className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-lg active:scale-[0.98] transition-all duration-150 flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Class Slot
          </button>
        )}
      </div>

      {/* SCHEDULE DAY VIEW (Default) */}
      {viewMode === 'SCHEDULE' && (
        <div className="space-y-4 animate-panel-entry">
          {/* Day Selector Buttons */}
          <div className="flex sm:grid sm:grid-cols-5 gap-1.5 sm:gap-2 bg-[#F6F9FD] p-2 rounded-xl border border-[#DCE5F0] shadow-[0_1px_2px_rgba(15,35,70,0.04)] overflow-x-auto no-scrollbar">
            {DAYS.map((day) => {
              const config = DAY_CONFIG[day];
              const isSelected = selectedDay === day;
              const count = routines.filter((r) => r.day === day).length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`p-2.5 sm:p-3 rounded-lg text-center transition-all duration-150 ease-out active:scale-[0.98] shrink-0 min-w-[76px] sm:min-w-0 flex-1 ${
                    isSelected
                      ? 'bg-[#2563EB] text-white shadow-md font-bold'
                      : 'bg-white hover:bg-[#F6FAFF] text-[#10213B] border border-[#D8E2EE]'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs font-black tracking-wider block uppercase">
                    {config.short}
                  </span>
                  <span
                    className={`text-[10px] sm:text-[11px] block mt-0.5 ${
                      isSelected ? 'text-blue-100 font-medium' : 'text-slate-500'
                    }`}
                  >
                    {config.dateStr}
                  </span>
                  <span
                    className={`inline-block mt-1 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#F6F9FD] text-slate-600 border border-[#D8E2EE]'
                    }`}
                  >
                    {count} {count === 1 ? 'cls' : 'classes'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Schedule Container (Desktop Table + Mobile Cards) */}
          <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
            <div className="p-4 bg-[#F5F8FF] border-b border-[#DCE6F2] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {DAY_CONFIG[selectedDay].label} Timetable
                </h3>
                <span className="text-sm font-extrabold text-[#0A2147] mt-0.5 block">
                  {selectedDaySlots.length} Classes Scheduled
                </span>
              </div>
              {canEdit && onAddSlot && (
                <button
                  onClick={() => onAddSlot(selectedDay)}
                  className="px-3 py-1 bg-blue-50 text-[#2563EB] hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-md transition-colors"
                >
                  + Add
                </button>
              )}
            </div>

            {/* Mobile Card List View (block md:hidden) */}
            <div className="block md:hidden divide-y divide-[#E5EBF3] p-3 space-y-3">
              {selectedDaySlots.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  No classes scheduled for {DAY_CONFIG[selectedDay].label}.
                </div>
              ) : (
                selectedDaySlots.map((slot) => (
                  <div key={slot.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-[#2563EB] font-bold border border-blue-200 text-[11px] rounded font-mono">
                        {slot.courseCode}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A2147] bg-[#F6F9FD] px-2.5 py-1 rounded-md border border-[#D8E2EE]">
                        <Clock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                        <span>{slot.startTime} – {slot.endTime}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#10213B]">
                        {slot.courseTitle}
                        {slot.courseShortName && (
                          <span className="ml-2 px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded">
                            {slot.courseShortName}
                          </span>
                        )}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5EBF3]">
                      <div className="flex items-center gap-1 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">{slot.teacherName}</span>
                      </div>

                      <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        {slot.room}
                      </span>
                    </div>

                    {canEdit && (
                      <div className="flex items-center justify-end gap-2 pt-2">
                        {onEditSlot && (
                          <button
                            onClick={() => onEditSlot(slot)}
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded border border-blue-200"
                          >
                            Edit
                          </button>
                        )}
                        {onDeleteSlot && (
                          <button
                            onClick={() => onDeleteSlot(slot.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 rounded border border-rose-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2F6FB] border-b border-[#DCE6F2] text-[11px] font-bold text-[#0A2147] uppercase tracking-wider">
                    <th className="px-5 py-3.5 w-36">TIME</th>
                    <th className="px-5 py-3.5">COURSE</th>
                    <th className="px-5 py-3.5 w-28">CODE</th>
                    <th className="px-5 py-3.5">TEACHER</th>
                    <th className="px-5 py-3.5 w-28">ROOM</th>
                    {canEdit && <th className="px-5 py-3.5 text-right w-24">ACTIONS</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EBF3] text-xs font-medium text-slate-800">
                  {selectedDaySlots.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 6 : 5} className="px-5 py-12 text-center text-slate-400 italic">
                        No classes scheduled for {DAY_CONFIG[selectedDay].label}.
                      </td>
                    </tr>
                  ) : (
                    selectedDaySlots.map((slot) => (
                      <tr key={slot.id} className="bg-white hover:bg-[#F6FAFF] transition-colors h-14">
                        <td className="px-5 py-3.5 font-bold text-[#0A2147] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                            <span>{slot.startTime} – {slot.endTime}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-[#10213B]">
                          {slot.courseTitle}
                          {slot.courseShortName && (
                            <span className="ml-2 px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded">
                              {slot.courseShortName}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-[#2563EB] font-bold border border-blue-200 text-xs rounded">
                            {slot.courseCode}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold">{slot.teacherName}</span>
                            {slot.teacherShortName && (
                              <span className="text-[10px] text-slate-400 font-bold">({slot.teacherShortName})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            {slot.room}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onEditSlot && (
                                <button
                                  onClick={() => onEditSlot(slot)}
                                  className="p-1 hover:bg-blue-50 text-blue-600 rounded border border-slate-200 transition-colors"
                                  title="Edit slot"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteSlot && (
                                <button
                                  onClick={() => onDeleteSlot(slot.id)}
                                  className="p-1 hover:bg-rose-50 text-rose-600 rounded border border-slate-200 transition-colors"
                                  title="Delete slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FULL WEEKLY MATRIX VIEW */}
      {viewMode === 'WEEKLY_GRID' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAYS.map((day) => {
            const daySlots = routines
              .filter((r) => r.day === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={day}
                className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden flex flex-col"
              >
                <div className="bg-[#0A192F] text-white px-3 py-2.5 flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider">
                    {DAY_CONFIG[day].short} ({DAY_CONFIG[day].dateStr})
                  </span>
                  <span className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded font-mono font-bold">
                    {daySlots.length}
                  </span>
                </div>

                <div className="p-2.5 space-y-2 flex-1 min-h-[300px] bg-[#F6F9FD]">
                  {daySlots.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-4 text-center text-slate-400 text-xs italic">
                      No classes
                    </div>
                  ) : (
                    daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-3 bg-white rounded-lg border border-[#D8E2EE] shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-200">
                            {slot.courseCode}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600">
                            {slot.startTime}–{slot.endTime}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[#10213B] leading-tight">
                          {slot.courseTitle}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-600">
                          <span className="truncate">{slot.teacherName}</span>
                          <span className="font-bold text-amber-800 shrink-0">{slot.room}</span>
                        </div>
                        {canEdit && (
                          <div className="pt-1 border-t border-slate-100 flex items-center justify-end gap-1">
                            {onEditSlot && (
                              <button
                                onClick={() => onEditSlot(slot)}
                                className="p-1 hover:bg-blue-50 text-blue-600 rounded"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            )}
                            {onDeleteSlot && (
                              <button
                                onClick={() => onDeleteSlot(slot.id)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

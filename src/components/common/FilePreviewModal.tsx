import React from 'react';
import { Download, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Resource } from '../../types';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  onDownload: (id: string) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  resource,
  onDownload,
}) => {
  if (!resource) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resource.title}
      subtitle={`${resource.courseCode} • ${resource.type} • Uploaded by ${resource.uploaderName}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Academic Details Banner */}
        <div className="bg-[#F7FAFC] p-4 rounded-xl border border-[#CBD8E8] grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Course Code</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono text-[11px] inline-block mt-0.5">
              {resource.courseCode}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Batch</span>
            <span className="font-extrabold text-slate-800 mt-0.5 block">
              {resource.targetBatch || resource.uploaderBatchName || 'SWE 9th Batch'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Uploaded By</span>
            <span className="font-extrabold text-slate-800 mt-0.5 block">
              by {resource.uploaderName}
            </span>
          </div>
          <div className="col-span-2 md:col-span-2">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Faculty Member</span>
            <span className="font-extrabold text-slate-900 mt-0.5 block">
              👨‍🏫 {resource.facultyName || 'Dr. Tanvir Rahman'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Status</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-extrabold mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
          </div>
        </div>

        {resource.description && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Description
            </h4>
            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {resource.description}
            </p>
          </div>
        )}

        {/* Interactive Viewer Box */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 text-white min-h-[250px] flex flex-col items-center justify-center p-8 text-center">
          <div className="p-4 bg-slate-800 rounded-2xl mb-4 text-blue-400">
            <FileText className="w-12 h-12" />
          </div>
          <h4 className="text-base font-semibold">{resource.fileName}</h4>
          <p className="text-xs text-slate-400 mt-1">
            {resource.fileSize} • {resource.fileType}
          </p>
          <p className="text-xs text-slate-300 mt-3 max-w-md">
            Document preview is generated for university verification. Click below to download the official verified document file.
          </p>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Downloads: <span className="font-semibold text-slate-800">{resource.downloadCount}</span>
          </div>

          <div className="flex gap-2">
            <a
              href={resource.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
            </a>
            <button
              onClick={() => {
                onDownload(resource.id);
                window.open(resource.fileUrl, '_blank');
              }}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D5FD1] text-white text-xs font-semibold rounded-lg shadow-xs active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download File
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

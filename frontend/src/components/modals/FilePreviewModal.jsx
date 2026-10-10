import React, { useEffect, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, FileText, File } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../../store/useUIStore';

export default function FilePreviewModal() {
  const { previewItem, setPreviewItem } = useUIStore();
  const [zoom, setZoom] = useState(1);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (!previewItem) {
      setZoom(1);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Handle PDF object URL creation if needed
    const ext = previewItem.name?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' && previewItem.file) {
      const url = URL.createObjectURL(previewItem.file);
      setPdfUrl(url);
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewItem, setPreviewItem]);

  if (!previewItem) return null;

  const ext = previewItem.name?.split('.').pop()?.toLowerCase() || '';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) || (previewItem.type && previewItem.type.startsWith('image/'));
  const isPDF = ext === 'pdf';
  const isWord = ['doc', 'docx'].includes(ext);

  const handleDownload = () => {
    let url = previewItem.previewUrl || pdfUrl;
    if (!url) {
      if (previewItem.file) {
        url = URL.createObjectURL(previewItem.file);
      } else {
        // Mock blob download for historic attachments
        const blob = new Blob([`Mock file content for ${previewItem.name}`], { type: 'text/plain' });
        url = URL.createObjectURL(blob);
      }
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = previewItem.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setPreviewItem(null);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99998] flex items-center justify-center p-4 backdrop-blur-[12px] bg-black/65 transition-all duration-200"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-[#1E1E1E] rounded-[24px] shadow-[0_20px_80px_rgba(0,0,0,0.35)] border border-[#E0E0E0] dark:border-[#2A2A2A] overflow-hidden flex flex-col z-[99999]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E]">
            <div className="flex items-center gap-3 min-w-0">
              {isImage ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
              ) : isPDF ? (
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
              ) : isWord ? (
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-500 flex items-center justify-center shrink-0">
                  <File size={16} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-black dark:text-white truncate">{previewItem.name}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {previewItem.size ? formatFileSize(previewItem.size) : 'Ready to download'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isImage && (
                <div className="flex items-center gap-1 border-r border-[#E0E0E0] dark:border-[#2A2A2A] pr-3 mr-1">
                  <button
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                    className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-mono w-10 text-center text-gray-500">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                    className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
              )}
              
              <button
                onClick={handleDownload}
                className="p-2 text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Download"
              >
                <Download size={18} />
              </button>
              
              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-[#F7F7F7] dark:bg-[#121212] flex items-center justify-center p-6 min-h-0">
            {isImage ? (
              <div 
                className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar"
                style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
              >
                <img
                  src={previewItem.previewUrl || (previewItem.file ? URL.createObjectURL(previewItem.file) : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80')}
                  alt={previewItem.name}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>
            ) : isPDF ? (
              pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  className="w-full h-full border-none rounded-xl bg-white"
                />
              ) : (
                <div className="w-full h-full bg-white dark:bg-[#1E1E1E] rounded-2xl flex flex-col items-center justify-center p-8 border border-[#E0E0E0] dark:border-[#2A2A2A] text-center max-w-md mx-auto my-auto shadow-sm">
                  <FileText size={48} className="text-red-500 mb-4" />
                  <h4 className="text-base font-bold mb-2">PDF Document Ready</h4>
                  <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                    This document is stored in your history. You can download and view it locally.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Download size={14} />
                    Download PDF File
                  </button>
                </div>
              )
            ) : (
              // Default document download/preview view
              <div className="w-full h-full bg-white dark:bg-[#1E1E1E] rounded-2xl flex flex-col items-center justify-center p-8 border border-[#E0E0E0] dark:border-[#2A2A2A] text-center max-w-md mx-auto my-auto shadow-sm">
                {isWord ? (
                  <FileText size={48} className="text-blue-500 mb-4" />
                ) : (
                  <File size={48} className="text-gray-400 mb-4" />
                )}
                <h4 className="text-base font-bold mb-2">{previewItem.name}</h4>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  This document type is supported for download and local viewing.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Download size={14} />
                  Download File
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

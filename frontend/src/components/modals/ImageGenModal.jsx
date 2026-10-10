import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Maximize2, Copy, RotateCw, FolderOpen, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../../store/useUIStore';
import useFilesStore from '../../store/useFilesStore';
import { HirenextLogo } from '../Logo';

const generateCanvasImage = (prompt) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Generate colors based on prompt hash
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      hash = prompt.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 140) % 360;

    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, `hsl(${hue1}, 80%, 12%)`);
    grad.addColorStop(0.5, `hsl(${(hue1 + hue2)/2}, 65%, 8%)`);
    grad.addColorStop(1, `hsl(${hue2}, 80%, 10%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Draw tech grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 64;
    for (let x = 0; x < 1024; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke();
    }
    for (let y = 0; y < 1024; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
    }

    // Glow shape
    ctx.shadowBlur = 120;
    ctx.shadowColor = `hsl(${hue1}, 80%, 55%)`;
    ctx.fillStyle = `rgba(255, 255, 255, 0.02)`;
    ctx.beginPath();
    ctx.arc(512, 512, 320, 0, Math.PI * 2);
    ctx.fill();

    // Geometric pattern lines
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 255, 255, 0.12)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 512);
    ctx.bezierCurveTo(350, 150, 674, 874, 924, 512);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, 0.08)`;
    ctx.beginPath();
    ctx.moveTo(100, 580);
    ctx.bezierCurveTo(350, 874, 674, 150, 924, 580);
    ctx.stroke();

    // Glowing nodes
    ctx.fillStyle = `hsl(${hue1}, 90%, 65%)`;
    ctx.shadowBlur = 30;
    ctx.shadowColor = `hsl(${hue1}, 90%, 65%)`;
    ctx.beginPath(); ctx.arc(512, 512, 14, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = `hsl(${hue2}, 90%, 65%)`;
    ctx.shadowColor = `hsl(${hue2}, 90%, 65%)`;
    ctx.beginPath(); ctx.arc(320, 390, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(704, 630, 10, 0, Math.PI * 2); ctx.fill();

    // Text layouts
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    
    let cleanPrompt = prompt.replace(/\[Attached file:[^\]]+\]/gi, '').trim();
    if (cleanPrompt.length > 50) cleanPrompt = cleanPrompt.substring(0, 47) + '...';
    ctx.fillText(cleanPrompt.toUpperCase(), 512, 830);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('HIRENEXTAI // IMAGE GENERATION ENGINE V1', 512, 890);

    resolve(canvas.toDataURL('image/png'));
  });
};

const ImageGenModal = () => {
  const { imageGenOpen, setImageGenOpen, imageGenPrompt, imageGenStatus, setImageGenStatus, imageGenUrl, setImageGenUrl, showToast } = useUIStore();
  const { addFile } = useFilesStore();
  
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (imageGenOpen && imageGenStatus === 'generating') {
      setSaved(false);
      setCopied(false);
      
      const timer = setTimeout(async () => {
        const url = await generateCanvasImage(imageGenPrompt);
        setImageGenUrl(url);
        setImageGenStatus('completed');
        
        // Auto save to files
        addFile({
          title: `Generated Design — ${imageGenPrompt.substring(0, 30)}${imageGenPrompt.length > 30 ? '...' : ''}`,
          folderId: 'images',
          content: url, // Store the Base64 URL as content so it can be previewed/downloaded!
          mimeType: 'image/png',
        });
      }, 3500); // 3.5s simulation of beautiful image gen
      return () => clearTimeout(timer);
    }
  }, [imageGenOpen, imageGenStatus, imageGenPrompt]);

  const handleDownload = () => {
    if (!imageGenUrl) return;
    const a = document.createElement('a');
    a.href = imageGenUrl;
    a.download = `hirenextai_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Image downloaded successfully! ✓');
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(imageGenPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Prompt copied to clipboard! ✓');
  };

  const handleRegenerate = () => {
    setImageGenStatus('generating');
    setImageGenUrl('');
  };

  const handleSaveToFiles = () => {
    if (saved) return;
    addFile({
      title: `Bespoke Design — ${imageGenPrompt.substring(0, 30)}${imageGenPrompt.length > 30 ? '...' : ''}`,
      folderId: 'images',
      content: imageGenUrl,
      mimeType: 'image/png',
    });
    setSaved(true);
    showToast('Saved to My Files under Images! ✓');
  };

  if (!imageGenOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/80 backdrop-blur-md"
          onClick={() => imageGenOpen && imageGenStatus !== 'generating' && setImageGenOpen(false)}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="relative z-10 w-full max-w-2xl bg-white border border-[#E0E0E0] rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col items-center"
        >
          {/* Close button */}
          {imageGenStatus !== 'generating' && (
            <button
              onClick={() => setImageGenOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          )}

          {imageGenStatus === 'generating' ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-20 h-20 mb-8 text-black animate-pulse">
                <HirenextLogo animated={true} />
              </div>
              <h3 className="text-xl font-bold text-black mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 animate-spin" />
                Generating Image...
              </h3>
              <p className="text-gray-500 text-sm max-w-sm">
                HirenextAI Creative Engine is building your modern custom asset design. This takes just a moment.
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <h3 className="text-lg font-bold text-black mb-1 self-start pr-12 truncate">
                {imageGenPrompt.replace(/\[Attached file:[^\]]+\]/gi, '').trim()}
              </h3>
              <p className="text-xs text-gray-400 mb-6 self-start">Created with HirenextAI Creative Engine V1</p>

              {/* Preview Box */}
              <div className="relative w-full aspect-square md:h-[360px] md:w-[360px] rounded-xl overflow-hidden border border-[#E0E0E0] bg-gray-50 mb-6 group shadow-sm">
                <img
                  src={imageGenUrl}
                  alt="Generated design"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
                
                {/* Floating overlay actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => setFullscreen(true)}
                    className="p-3 bg-white text-black rounded-full hover:scale-105 transition-transform"
                    title="Fullscreen"
                  >
                    <Maximize2 size={18} />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-3 bg-white text-black rounded-full hover:scale-105 transition-transform"
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-[500px]">
                <button
                  onClick={handleDownload}
                  className="h-11 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-black/90 active:scale-98 transition-all"
                >
                  <Download size={15} /> Download
                </button>
                <button
                  onClick={handleCopyPrompt}
                  className="h-11 rounded-xl border border-[#E0E0E0] bg-white text-black font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-50 active:scale-98 transition-all"
                >
                  {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                  Copy Prompt
                </button>
                <button
                  onClick={handleRegenerate}
                  className="h-11 rounded-xl border border-[#E0E0E0] bg-white text-black font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-50 active:scale-98 transition-all"
                >
                  <RotateCw size={15} /> Recreate
                </button>
                <button
                  onClick={handleSaveToFiles}
                  disabled={saved}
                  className="h-11 rounded-xl border border-[#E0E0E0] bg-white text-black font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-50 disabled:opacity-55 active:scale-98 transition-all"
                >
                  <FolderOpen size={15} /> {saved ? 'Saved ✓' : 'Save File'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Fullscreen Overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[3200] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-6 right-6 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X size={24} />
          </button>
          <img
            src={imageGenUrl}
            alt="Fullscreen preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg border border-white/10"
          />
        </div>
      )}
    </AnimatePresence>
  );
};

export default ImageGenModal;

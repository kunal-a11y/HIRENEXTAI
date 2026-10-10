import { useEffect, useState } from 'react';
import ChatLayout from '../components/layout/ChatLayout';
import { useTranslation } from '../hooks/useTranslation';
import useFilesStore, { FILE_FOLDERS } from '../store/useFilesStore';
import { Folder, FileText, Download, Eye, ChevronRight, X, Trash2, Edit3, Image } from 'lucide-react';

const FilePreviewBox = ({ file }) => {
  const isImage = file.mimeType === 'image/png' || file.content?.startsWith('data:image/');
  if (isImage) {
    return (
      <div className="w-full h-32 rounded-lg overflow-hidden border border-[#E0E0E0] bg-gray-50 flex items-center justify-center shrink-0">
        <img src={file.content} alt={file.title} className="w-full h-full object-cover" />
      </div>
    );
  }
  
  return (
    <div className="w-full h-32 rounded-lg border border-[#E0E0E0] bg-[#FAFAFA] p-3.5 flex flex-col justify-between shrink-0 relative overflow-hidden select-none">
      <div className="space-y-2">
        <div className="h-1.5 w-1/3 bg-gray-300 rounded-full" />
        <div className="h-1.5 w-3/4 bg-gray-200 rounded-full" />
        <div className="h-1.5 w-1/2 bg-gray-200 rounded-full" />
        <div className="h-1.5 w-2/3 bg-gray-200 rounded-full" />
      </div>
      <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
        <FileText size={10} />
        <span>Document Asset</span>
      </div>
    </div>
  );
};

const FilesPage = () => {
  const { t } = useTranslation();
  const { files, hydrate, getByFolder, deleteFile, renameFile } = useFilesStore();
  const [activeFolder, setActiveFolder] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const folderFiles = activeFolder ? getByFolder(activeFolder) : [];

  const handleDownload = (file) => {
    const isImage = file.mimeType === 'image/png' || file.content?.startsWith('data:image/');
    if (isImage) {
      const a = document.createElement('a');
      a.href = file.content;
      a.download = `${file.title.replace(/[^\w\s-]/g, '')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const blob = new Blob([file.content || ''], { type: file.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.title.replace(/[^\w\s-]/g, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRename = (file) => {
    const newTitle = prompt('Rename this file:', file.title);
    if (newTitle && newTitle.trim()) {
      renameFile(file.id, newTitle.trim());
    }
  };

  const handleDelete = (file) => {
    if (confirm(`Are you sure you want to delete "${file.title}"?`)) {
      deleteFile(file.id);
    }
  };

  return (
    <ChatLayout>
      <div className="flex-1 flex h-full min-h-0 bg-background animate-fade-in">
        {/* Folder Sidebar */}
        <aside className="w-[260px] shrink-0 border-r border-[#E0E0E0] p-5 overflow-y-auto custom-scrollbar bg-white">
          <h1 className="text-xl font-black text-black mb-1 px-2">My Vault</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-2 mb-6">AI Career Archives</p>
          <nav className="space-y-1">
            {FILE_FOLDERS.map((folder) => {
              const count = getByFolder(folder.id).length;
              const active = activeFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveFolder(folder.id)}
                  className={` w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-[13px] font-semibold transition-all ${active ? 'bg-[#F7F7F7] text-black border border-[#E0E0E0] shadow-sm' : 'text-gray-500 hover:bg-[#F9F9F9] hover:text-black'} `}
                >
                  <span className="text-lg">{folder.icon}</span>
                  <span className="flex-1 truncate">{folder.label}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${active ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Files Content Panel */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-[#FAFAFA]">
          {!activeFolder ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E0E0E0] flex items-center justify-center mb-4 shadow-sm">
                <Folder size={26} className="text-black" />
              </div>
              <p className="text-black font-bold mb-1">Select a Folder</p>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Vault folders organize generated cover letters, resume reports, and design outputs generated during chats.
              </p>
            </div>
          ) : folderFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E0E0E0] flex items-center justify-center mb-4 shadow-sm">
                <FileText size={26} className="text-gray-300" />
              </div>
              <p className="text-[#666666] font-bold">Folder is Empty</p>
              <p className="text-xs text-gray-400 mt-1">Ask the AI assistant to write or generate files in chat.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black text-black uppercase tracking-wider">
                  {FILE_FOLDERS.find((f) => f.id === activeFolder)?.label}
                </h2>
                <span className="text-xs text-gray-400 font-bold">{folderFiles.length} files found</span>
              </div>
              
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
                {folderFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 rounded-2xl border border-[#E0E0E0] bg-white hover:border-black/20 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Stylized File Preview */}
                      <FilePreviewBox file={file} />

                      {/* Header Title */}
                      <h3 className="text-sm font-bold text-black truncate mt-4" title={file.title}>
                        {file.title}
                      </h3>
                      
                      {/* Date */}
                      <p className="text-[10px] text-gray-400 font-semibold mt-1">
                        {new Date(file.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      
                      {/* Category Badge */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-50 border border-gray-150 text-gray-500">
                          {FILE_FOLDERS.find((f) => f.id === file.folderId)?.label}
                        </span>
                      </div>
                    </div>

                    {/* Action Panel Footer */}
                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="p-2 rounded-lg border border-[#E0E0E0] text-gray-600 hover:text-black hover:bg-[#F9F9F9] transition-all"
                          title="Preview"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="p-2 rounded-lg border border-[#E0E0E0] text-gray-600 hover:text-black hover:bg-[#F9F9F9] transition-all"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRename(file)}
                          className="p-2 rounded-lg border border-transparent text-gray-400 hover:text-black hover:bg-[#F9F9F9] transition-all"
                          title="Rename"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(file)}
                          className="p-2 rounded-lg border border-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Preview Modal overlay */}
      {previewFile && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setPreviewFile(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[#E0E0E0] bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0]">
              <h3 className="text-black font-bold truncate pr-4">{previewFile.title}</h3>
              <button type="button" onClick={() => setPreviewFile(null)} className="text-gray-500 hover:text-black">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#FAFAFA]">
              {previewFile.mimeType === 'image/png' || previewFile.content?.startsWith('data:image/') ? (
                <div className="flex items-center justify-center">
                  <img src={previewFile.content} alt={previewFile.title} className="max-w-full max-h-[60vh] object-contain rounded-lg border border-[#E0E0E0]" />
                </div>
              ) : (
                <pre className="text-[13px] text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-white border border-[#E0E0E0] rounded-xl p-5 shadow-sm">
                  {previewFile.content || '(Empty file)'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </ChatLayout>
  );
};

export default FilesPage;

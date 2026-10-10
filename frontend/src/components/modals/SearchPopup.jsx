import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, X, Clock } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useChatStore from '../../store/useChatStore';
import { useNavigate } from 'react-router-dom';

const SearchPopup = () => {
  const { searchPopupOpen, setSearchPopupOpen } = useUIStore();
  const { chats, setCurrentChat } = useChatStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const getHumanFriendlyDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options).toLowerCase();
  };

  // Filter chats based on query (title, message content, and human-formatted date string)
  const results = query.trim() ? chats.filter(chat => {
    const titleMatch = chat.title.toLowerCase().includes(query.toLowerCase());
    const messageMatch = chat.messages.some(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
    const dateMatch = getHumanFriendlyDate(chat.createdAt).includes(query.toLowerCase());
    return titleMatch || messageMatch || dateMatch;
  }) : chats;

  useEffect(() => {
    if (searchPopupOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
  }, [searchPopupOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!searchPopupOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setSearchPopupOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchPopupOpen, results, selectedIndex]);

  const handleSelect = (chat) => {
    setCurrentChat(chat.id);
    setSearchPopupOpen(false);
    if (!['/demo', '/preview'].includes(window.location.pathname)) navigate('/chat/' + chat.id);
    setQuery('');
  };

  const getMessagePreview = (chat) => {
    if (!query.trim()) return chat.messages[chat.messages.length - 1]?.content || '';

    const matchingMsg = chat.messages.find(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );

    return matchingMsg ? matchingMsg.content : chat.messages[chat.messages.length - 1]?.content || '';
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!searchPopupOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-white/60 backdrop-blur-[2px] animate-fade-in"
        onClick={() => setSearchPopupOpen(false)}
      />

      <div className="relative w-full max-w-[600px] mx-4 bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center px-4 py-4 border-b border-white/8 gap-3">
          <Search size={18} className="text-[#555555]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search chats and messages..."
            className="flex-1 bg-transparent border-none outline-none text-black text-[15px] placeholder:text-black/20"
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F7F7F7] text-[#888888] border border-[#E0E0E0] font-mono">ESC</span>
            <button
              onClick={() => setSearchPopupOpen(false)}
              className="p-1 text-[#555555] hover:text-black transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto custom-scrollbar py-2">
          {results.length > 0 ? (
            <>
              {!query && (
                <div className="px-4 py-2 text-[11px] font-medium text-[#888888] tracking-widest uppercase">
                  Recent Conversations
                </div>
              )}
              {results.map((chat, index) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelect(chat)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={` w-full flex flex-col gap-1 px-4 py-3 transition-colors text-left ${index === selectedIndex ? 'bg-white border-l-2 border-black' : 'hover:bg-white/50 border-l-2 border-transparent'} `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-black font-medium text-[14px] min-w-0 flex-1">
                      <MessageSquare size={14} className="text-[#555555] shrink-0" />
                      <span className="truncate">{chat.title}</span>
                      {chat.archived && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-normal shrink-0">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#888888] whitespace-nowrap">
                      <Clock size={10} />
                      {formatTime(chat.createdAt)}
                    </div>
                  </div>
                  <div className="text-[12px] text-[#777777] truncate pl-6">
                    {getMessagePreview(chat)}
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="px-6 py-12 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#F7F7F7] flex items-center justify-center text-black/20">
                <Search size={24} />
              </div>
              <div className="text-[#555555] text-sm">
                No chats found for "<span className="text-[#555555]">{query}</span>"
              </div>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 bg-[#F7F7F7] border-t border-[#E0E0E0] flex items-center gap-4 text-[11px] text-[#888888]">
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 rounded bg-[#F7F7F7] border border-[#E0E0E0] font-mono">↑↓</span>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 rounded bg-[#F7F7F7] border border-[#E0E0E0] font-mono">ENTER</span>
              <span>Open</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPopup;

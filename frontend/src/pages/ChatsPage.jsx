import React, { useState } from 'react';
import ChatLayout from '../components/layout/ChatLayout';
import { MessageSquare, Plus, Search, Clock, Pin } from 'lucide-react';
import useChatStore from '../store/useChatStore';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';

const ChatsPage = () => {
  const { t } = useTranslation();
  const { chats, setCurrentChat, startNewChat } = useChatStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const visibleChats = chats.filter(c => !c.archived);

  const filteredChats = visibleChats.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.messages.some(m => m.content.toLowerCase().includes(query.toLowerCase()))
  );

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

  const getLabel = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60 / 60 / 24); // days

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return 'Past week';
    if (diff < 30) return 'Past month';
    return 'Older';
  };

  // Grouping
  const grouped = filteredChats.reduce((acc, chat) => {
    const label = chat.pinned ? 'Pinned' : getLabel(chat.createdAt);
    if (!acc[label]) acc[label] = [];
    acc[label].push(chat);
    return acc;
  }, {});

  const groupOrder = ['Pinned', 'Today', 'Yesterday', 'Past week', 'Past month', 'Older'];

  const handleChatClick = (id) => {
    setCurrentChat(id);
    navigate('/chat/' + id);
  };

  const handleNewChat = () => {
    startNewChat();
    navigate('/chat', { state: { newChat: true } });
  };

  return (
    <ChatLayout>
      <div className="flex-1 flex flex-col h-full bg-background animate-fade-in overflow-y-auto custom-scrollbar px-6 py-10 md:px-20 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-black">{t('chats')}</h1>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] text-black font-semibold rounded-lg hover:bg-[#F2F2F2] hover:text-black transition-colors"
          >
            <Plus size={18} />
            {t('newChat')}
          </button>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555]" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl px-12 py-3.5 text-black focus:outline-none focus:border-[#C4C4C4] transition-colors"
          />
        </div>

        <div className="space-y-8">
          {groupOrder.map((label) => (
            grouped[label] && grouped[label].length > 0 && (
              <div key={label}>
                <h3 className={`text-[12px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2 ${label === 'Pinned' ? 'text-black' : 'text-[#888888]'}`}>
                  {label === 'Pinned' && <Pin size={12} className="fill-white" />}
                  {label}
                </h3>
                <div className="grid grid-cols-1 gap-1">
                  {grouped[label].map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleChatClick(chat.id)}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-[#F2F2F2] hover:text-black transition-colors group text-left border border-transparent hover:border-[#E0E0E0]"
                    >
                      <div className="p-2 bg-[#F7F7F7] rounded-lg text-[#555555] group-hover:text-black transition-colors">
                        <MessageSquare size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="text-[15px] font-medium text-black group-hover:text-black transition-colors truncate">
                            {chat.title}
                          </div>
                          <div className="text-[12px] text-[#555555] flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime(chat.createdAt)}
                          </div>
                        </div>
                        <div className="text-[12px] text-[#555555] mt-1 truncate">
                          {chat.messages[chat.messages.length - 1]?.content || 'No messages'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}

          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F7F7F7] flex items-center justify-center text-black/10 mb-4">
                <MessageSquare size={32} />
              </div>
              <p className="text-[#555555]">
                {query ? `No results found for "${query}"` : 'No chats yet. Start a new conversation!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </ChatLayout>
  );
};

export default ChatsPage;

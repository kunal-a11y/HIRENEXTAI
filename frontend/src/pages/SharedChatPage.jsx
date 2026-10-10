import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageSquare, Calendar, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../lib/api';
import { Logo, HirenextLogo } from '../components/Logo';
import Mascot from '../components/chat/Mascot';

export default function SharedChatPage() {
  const { shareId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatData, setChatData] = useState(null);

  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/chat/share/${shareId}`);
        setChatData(res.data);
      } catch (err) {
        console.error('Error fetching shared chat:', err);
        setError(
          err.response?.data?.message ||
          'Failed to load shared conversation. It may have expired or does not exist.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSharedChat();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4 overflow-visible">
          <div className="hirenext-logo-container text-black dark:text-white">
            <HirenextLogo animated={true} />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-center shadow-lg">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Unable to load chat</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">{error}</p>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Go to HirenextAI Chat
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const { title, messages, createdAt } = chatData || {};
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown Date';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo showText={true} size="xs" className="text-[var(--text-primary)]" />
          <span className="h-4 w-px bg-[var(--border-color)]" />
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
            Shared Chat
          </span>
        </div>
        <Link
          to="/chat"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-xs font-semibold transition-colors"
        >
          <span>Use HirenextAI</span>
          <Sparkles size={13} className="text-[#FFC933] fill-[#FFC933]" />
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:px-6">
        {/* Title Section */}
        <div className="border-b border-[var(--border-color)] pb-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mb-3">
            {title || 'Untitled Conversation'}
          </h1>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
            <Calendar size={13} />
            <span>Shared on {formattedDate}</span>
          </div>
        </div>

        {/* Message Log */}
        <div className="space-y-8">
          {messages && messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm border ${
                    isUser
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white rounded-tr-sm'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-sm'
                  }`}
                >
                  {!isUser && (
                    <div className="hirenext-logo-container mb-3 text-black dark:text-white">
                      <HirenextLogo animated={false} />
                    </div>
                  )}
                  {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                  ) : (
                    <div className="ai-markdown prose prose-sm max-w-none text-sm dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] py-12 px-6 text-center mt-auto">
        <div className="max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-center">
            <MessageSquare size={18} className="text-[var(--text-primary)]" />
          </div>
          <h4 className="text-base font-bold">Start your own conversation</h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            HirenextAI is a premium AI career coach designed to help freshers and students build ATS-friendly resumes, optimize applications, and ace interviews.
          </p>
          <Link
            to="/register"
            className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            Create Free Account
            <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </div>
  );
}

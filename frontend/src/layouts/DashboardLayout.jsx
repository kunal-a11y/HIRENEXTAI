import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, MessageSquare, ClipboardList, Mic, FolderOpen, Download, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';
import useUserStore from '../store/useUserStore';
import { getPlanDisplay } from '../lib/planUtils';

const DashboardLayout = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useUserStore();

  const navItems = [
    { name: 'Search', translationKey: 'Search', path: '/dashboard/search', icon: Search },
    { name: 'Chats', translationKey: 'Chats', path: '/dashboard/chat', icon: MessageSquare },
    { name: 'Applications', translationKey: 'Applications', path: '/dashboard/applications', icon: ClipboardList },
    { name: 'Interview', translationKey: 'Interview', path: '/dashboard/interview', icon: Mic },
    { name: 'Files', translationKey: 'Files', path: '/dashboard/files', icon: FolderOpen },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">

      {/* LEFT SIDEBAR */}
      <div
        className={`${isCollapsed ? 'w-[60px]' : 'w-[260px]'} bg-sidebar border-r border-[#E0E0E0] flex flex-col justify-between hidden md:flex shrink-0 transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full overflow-hidden">

          {/* Top Header */}
          <div className={`pt-4 pb-2 flex items-center shrink-0 ${isCollapsed ? 'px-2 justify-center' : 'px-4 justify-between'}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[15px] tracking-tight">HirenextAI</span>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-black hover:text-black hover:bg-[#F2F2F2] hover:text-black rounded-md transition-colors"
            >
              {isCollapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-3 py-2 shrink-0">
            <Link
              to="/dashboard/chat"
              className={`w-full flex items-center bg-[#F7F7F7] hover:bg-[#F2F2F2] hover:text-black border border-[#E0E0E0] rounded-lg transition-colors font-medium ${isCollapsed ? 'justify-center py-2 px-0' : 'gap-2 px-3 py-2 text-sm'}`}
            >
              <Plus size={16} strokeWidth={2} />
              {!isCollapsed && <span>{t('New Chat')}</span>}
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="px-3 mt-2 shrink-0">
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center rounded-lg transition-colors ${isActive ? 'bg-[#F7F7F7] text-black font-medium' : 'text-black hover:text-black hover:bg-[#F2F2F2] hover:text-black'} ${isCollapsed ? 'justify-center py-2 px-0' : 'gap-3 px-3 py-2 text-sm'}`}
                    title={isCollapsed ? t(item.translationKey) : undefined}
                  >
                    <item.icon size={16} strokeWidth={1.5} />
                    {!isCollapsed && <span>{t(item.translationKey)}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Recents */}
          {!isCollapsed && (
            <div className="px-3 mt-6 flex-1 overflow-y-auto">
              <p className="text-[11px] font-medium text-[#666666] uppercase tracking-widest px-3 mb-2">Recents</p>
              <div className="space-y-0.5">
                {[
                  "Senior React Developer roles",
                  "Resume review for Frontend",
                  "Mock interview prep",
                  "Salary negotiation advice",
                  "Remote jobs in Europe"
                ].map((title, idx) => (
                  <div key={idx} className="px-3 py-1.5 rounded-lg text-black hover:text-black hover:bg-[#F2F2F2] hover:text-black cursor-pointer text-[13px] truncate transition-colors">
                    {title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom User Profile */}
        <div className="p-3 shrink-0">
          <div className={`flex items-center rounded-xl hover:bg-[#F2F2F2] hover:text-black transition-colors cursor-pointer group ${isCollapsed ? 'justify-center p-2' : 'justify-between p-2'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center text-xs font-medium shrink-0 text-black border border-[#E0E0E0]">
                JD
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-[13px] font-medium text-black truncate group-hover:text-black">John Doe</p>
                  <p className="text-[11px] text-[#666666]">{getPlanDisplay(user.plan)}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 text-black hover:text-black rounded-md hover:bg-[#F2F2F2] hover:text-black transition-colors">
                  <Download size={14} strokeWidth={2} />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); setIsSettingsOpen(true); }}
                  className="p-1.5 text-black hover:text-black rounded-md hover:bg-[#F2F2F2] hover:text-black transition-colors"
                >
                  <Settings size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
          {isCollapsed && (
             <div className="mt-2 flex flex-col items-center gap-1">
               <button
                  onClick={(e) => { e.preventDefault(); setIsSettingsOpen(true); }}
                  className="p-1.5 text-black hover:text-black rounded-md hover:bg-[#F2F2F2] hover:text-black transition-colors"
                  title="Settings"
                >
                  <Settings size={14} strokeWidth={2} />
                </button>
             </div>
          )}
        </div>
      </div>

      {/* RIGHT CHAT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
        <Outlet />
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default DashboardLayout;

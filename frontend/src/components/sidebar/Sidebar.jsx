import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Plus, 
  Search, 
  MessageSquare, 
  Briefcase, 
  Mic, 
  FileText, 
  Settings,
  X,
  Pin,
  Shield
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useUIStore from '../../store/useUIStore';
import useUserStore from '../../store/useUserStore';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import { useTranslation } from '../../hooks/useTranslation';
import { getPlanDisplay, normalizePlan } from '../../lib/planUtils';
import { Logo, HirenextLogo } from '../Logo';



const Sidebar = ({ isDemoMode: propDemoMode }) => {
  const isDemoMode = window.location.pathname === '/demo' || 
                     window.location.pathname === '/preview';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    setSearchPopupOpen, 
    setSettingsModalOpen,
    setPricingModalOpen,
  } = useUIStore();
  
  const { user } = useUserStore();
  const { isDemoMode: isDemoModeStore } = useAuthStore();
  const { chats, deleteChat, setCurrentChat, startNewChat, currentChatId } = useChatStore();

  const isDemo = propDemoMode || isDemoModeStore;
  const showDemoBadge = location.pathname === '/preview' || location.pathname === '/demo' || isDemo;

  const visibleChats = chats.filter(c => !c.archived);
  const pinnedChats = visibleChats.filter(c => c.pinned);
  const regularChats = visibleChats.filter(c => !c.pinned);
  const sortedChats = [...pinnedChats, ...regularChats];

  const navItems = [
    { icon: Search, label: t('search'), onClick: () => setSearchPopupOpen(true) },
    { icon: MessageSquare, label: t('chats'), path: '/chats' },
    { icon: Briefcase, label: t('applications'), path: '/applications' },
    { icon: Mic, label: t('interview'), path: '/interview' },
    { icon: FileText, label: t('files'), path: '/files' },
  ];

  const handleNavClick = (item) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleNewChat = () => {
    startNewChat();
    navigate(isDemoMode ? '/demo' : '/chat', { state: { newChat: true } });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <aside className={`h-full flex flex-col overflow-hidden bg-[#F7F7F7] border-r border-[#E0E0E0] transition-all duration-300 ${sidebarCollapsed ? 'w-[60px]' : 'w-[260px]'}`}>
      {/* Top Section */}
      <div className="flex-grow flex flex-col overflow-hidden min-h-0">
        {/* Top Bar */}
        <div className={`py-4 flex ${sidebarCollapsed ? 'px-1.5 justify-center items-center' : 'px-4'}`}>
          {sidebarCollapsed ? (
            <button 
              onClick={() => setSidebarCollapsed(false)}
              className="hover:scale-105 transition-transform duration-200 opacity-100"
              title="Open Sidebar"
            >
              <div className="w-12 h-12 block flex-shrink-0 text-black">
                <HirenextLogo animated={false} />
              </div>
            </button>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 block flex-shrink-0 text-black">
                    <HirenextLogo animated={false} />
                  </div>
                  <span className="text-[15px] font-semibold text-[#111111] leading-none">HirenextAI</span>
                </div>
                <button 
                  onClick={() => setSidebarCollapsed(true)}
                  className="text-[#555555] hover:text-[#111111] transition-colors opacity-100"
                  title="Close Sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-2 space-y-1">
          {!sidebarCollapsed ? (
            <button 
              onClick={handleNewChat}
              className="w-full mb-2 flex items-center justify-center gap-2 bg-black text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-neutral-800 hover:shadow-[0_0_20px_rgba(0,0,0,0.15)] transition-all duration-300"
            >
              <Plus size={16} />
              <span>{t('newChat')}</span>
            </button>
          ) : (
            <button 
              onClick={handleNewChat}
              className="w-full mb-2 flex items-center justify-center text-black bg-black/5 p-2 rounded-lg hover:bg-black/10 transition-colors"
              title={t('newChat')}
            >
              <Plus size={16} />
            </button>
          )}

          {navItems.map((item, index) => {
            const isLockedItem = item.path === '/applications' || item.path === '/interview' || item.path === '/files';
            return (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                data-demo-lock={isLockedItem ? "true" : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                  ${sidebarCollapsed ? 'justify-center' : ''}
                  ${isActive(item.path)
                    ? 'bg-black/5 border-l-2 border-black text-[#111111]'
                    : 'hover:bg-black/[0.03] border-l-2 border-transparent'}
                `}
                title={sidebarCollapsed ? item.label : ''}
              >
                <item.icon size={16} className={`opacity-100 ${isActive(item.path) ? 'text-black' : 'text-[#555555]'}`} />
                {!sidebarCollapsed && <span className={`text-sm ${isActive(item.path) ? 'text-black font-semibold' : 'text-[#555555]'}`}>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Recents */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto mt-6 custom-sidebar-scrollbar">
            <div className="px-4 mb-2 text-[11px] font-semibold text-[#111111]/30 tracking-widest uppercase">
              {t('recents')}
            </div>
            <div className="px-2 space-y-0.5">
              {sortedChats.map((chat) => (
                <div 
                  key={chat.id}
                  className={`
                    group flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors
                    ${currentChatId === chat.id ? 'bg-black/5' : 'hover:bg-black/[0.03]'}
                  `}
                  onClick={() => { if (!isDemoMode) navigate('/chat/' + chat.id); setCurrentChat(chat.id); }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <span className={`text-[13px] truncate ${currentChatId === chat.id ? 'text-[#111111] font-semibold' : 'text-[#555555]'}`}>
                      {chat.title}
                    </span>
                    {chat.pinned && <Pin size={12} className="text-black/40 fill-black/40 shrink-0 opacity-100" />}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    className="opacity-0 group-hover:opacity-100 text-[#555555] hover:text-[#111111] transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Profile — always pinned to bottom */}
      <div className="flex-shrink-0 border-t border-[#E0E0E0] p-3 mt-auto bg-[#F7F7F7]">
        {!sidebarCollapsed && !isDemo && user && (user?.role === 'admin' || user?.role === 'owner') && (
          <div className="px-2 mb-2">
            <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-xs text-[#555555] hover:text-black">
              <Shield className="w-3.5 h-3.5 opacity-100" />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
        <div 
          onClick={() => setSettingsModalOpen(true)}
          className={`flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-black/5 cursor-pointer ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          {/* Avatar circle */}
          <div className="w-8 h-8 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
            {String(user?.name || user?.firstName || 'G').charAt(0).toUpperCase()}
          </div>
          
          {!sidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#000000] truncate">
                  {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Guest'}
                </p>
                <p className="text-xs text-[#555555] truncate">
                  {user?.email || 'guest@hirenextai.com'}
                </p>
              </div>
              
              <Settings 
                onClick={(e) => {
                  e.stopPropagation();
                  setSettingsModalOpen(true);
                }}
                data-demo-lock="true"
                className="w-4 h-4 text-black/30 hover:text-black shrink-0 cursor-pointer transition-colors opacity-100"
              />
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;


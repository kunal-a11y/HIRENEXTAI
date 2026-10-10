import React, { useEffect } from 'react';
import Sidebar from '../sidebar/Sidebar';
import useUIStore from '../../store/useUIStore';
import useUserStore from '../../store/useUserStore';

const ChatLayout = ({ children, className = 'h-screen' }) => {
  const { 
    sidebarCollapsed, 
    isMobile, 
    setIsMobile, 
    mobileSidebarOpen, 
    setMobileSidebarOpen 
  } = useUIStore();
  
  const { settings } = useUserStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // RTL Support
    if (settings.interfaceLanguage === 'Arabic') {
      document.body.dir = 'rtl';
    } else {
      document.body.dir = 'ltr';
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile, settings.interfaceLanguage]);

  return (
    <div className={`chat-shell flex w-full bg-background overflow-hidden ${className}`}>
      {/* Mobile Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-white/60 z-40 transition-opacity animate-fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={` fixed md:relative z-[100] h-full transition-all duration-300 ease-in-out ${isMobile ? (mobileSidebarOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full w-0') : (sidebarCollapsed ? 'w-[60px]' : 'w-[260px]') } `}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};

export default ChatLayout;

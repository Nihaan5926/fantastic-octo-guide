import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSettingsStore } from '../../store/settingsStore';

export default function AppShell() {
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const [sidebarOpen, setSidebarOpen] = React.useState(!sidebarCollapsed && window.innerWidth >= 768);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(!sidebarCollapsed);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [sidebarCollapsed]);

  const handleToggle = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    if (!isMobile) setSidebarCollapsed(!next);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {isMobile ? (
        <>
          <div className={`fixed inset-y-0 left-0 z-40 w-60 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Sidebar isOpen={true} onToggle={handleToggle} />
          </div>
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={handleToggle} />
          )}
        </>
      ) : (
        <Sidebar isOpen={sidebarOpen} onToggle={handleToggle} />
      )}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onToggleSidebar={handleToggle} />
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-bg-primary">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

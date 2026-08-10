import React from 'react';
import { NavTab } from '../types';
import { useAuth } from '../auth/AuthContext';

interface SideNavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isAdminExpanded, setIsAdminExpanded] = React.useState(true);
  const { user, logout } = useAuth();

  const mainItems: Array<{ id: NavTab; label: string; icon: string }> = [
    { id: 'workspace', label: 'Workspace', icon: 'dashboard' },
  ];

  const adminItems: Array<{ id: NavTab; label: string; icon: string }> = [
    { id: 'raci', label: 'Ma trận RCSI (RACI)', icon: 'format_list_bulleted' },
    { id: 'org-chart', label: 'Sơ đồ Tổ chức', icon: 'corporate_fare' },
    { id: 'maintenance-dashboard', label: 'Bảng Bảo trì & Cảnh báo', icon: 'engineering' },
  ];

  const isAdminTabActive = adminItems.some((i) => i.id === currentTab) || currentTab === 'maintenance-config';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-on-surface/50 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 flex flex-col p-4 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            V
          </div>
          <div className="overflow-hidden">
            <h1 className="text-xl font-bold tracking-tight text-slate-800 truncate">
              Velocity
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
              Workflow Engine
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar">
          {/* Main User Workspace Nav */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Người dùng
            </span>
            {mainItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 w-full font-bold text-sm ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="my-2 border-t border-slate-100" />

          {/* Admin Section Grouped */}
          <div>
            <button
              onClick={() => setIsAdminExpanded(!isAdminExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-slate-700 font-bold text-[10px] uppercase tracking-wider transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-slate-400">
                  admin_panel_settings
                </span>
                <span>Quản trị Admin</span>
              </div>
              <span className="material-symbols-outlined text-sm">
                {isAdminExpanded ? 'expand_more' : 'chevron_right'}
              </span>
            </button>

            {isAdminExpanded && (
              <div className="mt-1 space-y-1 pl-2 border-l-2 border-slate-100 ml-3">
                {adminItems.map((item) => {
                  const isActive = currentTab === item.id || (item.id === 'maintenance-dashboard' && currentTab === 'maintenance-config');
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors w-full font-semibold text-xs ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-base ${
                          isActive ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Usage Card & Profile */}
        <div className="mt-auto pt-3 border-t border-slate-200 flex flex-col gap-3">
          <div className="bg-slate-900 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">System Capacity</p>
            <div className="flex justify-between text-white text-xs font-semibold mb-1">
              <span>84% Active</span>
              <span className="text-blue-400 font-bold">Optimal</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '84%' }}></div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.avatarInitials || user?.fullName?.slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className="flex flex-col overflow-hidden leading-tight flex-1">
              <span className="text-xs font-semibold text-slate-800 truncate">
                {user?.fullName ?? 'Unknown user'}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {user?.email}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

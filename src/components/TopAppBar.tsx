import React from 'react';
import { NotificationBell } from './NotificationBell';

interface TopAppBarProps {
  title: string | React.ReactNode;
  badge?: string;
  searchPlaceholder?: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  actionButtons?: React.ReactNode;
  onMenuToggle?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  badge,
  searchPlaceholder = 'Search...',
  searchQuery = '',
  onSearchChange,
  actionButtons,
  onMenuToggle,
}) => {
  return (
    <header className="bg-white fixed top-0 right-0 left-0 md:left-64 h-16 border-b border-slate-200 flex justify-between items-center px-4 md:px-8 z-30 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="p-2 md:hidden text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          title="Open Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {typeof title === 'string' ? (
          <h2 className="text-base md:text-lg font-bold text-slate-800 truncate tracking-tight">
            {title}
          </h2>
        ) : (
          title
        )}

        {badge && (
          <>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block shrink-0 mx-1" />
            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-blue-200 shrink-0">
              {badge}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {onSearchChange && (
          <div className="relative rounded-lg hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-40 md:w-56 focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        )}

        <div className="flex items-center gap-1 text-slate-400">
          <NotificationBell />
          <button
            aria-label="Help"
            className="p-2 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50 hidden xs:block"
            title="Help"
          >
            <span className="material-symbols-outlined text-xl">help_outline</span>
          </button>
        </div>

        {actionButtons}

        <div className="flex items-center gap-2 cursor-pointer ml-1">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3Ux63iFHFF9SyKm3yQzegZDC0oLCdP3fXa9rYb2X_YlSfR1PA_mMWLkQyxEk2LqdQd5k1ANShO_3nn79CLf_J_xjB2wTtmb5L92lOTv1DeCVNRARffovfe-KrHMON87Dih9VywyF5ZXH7BKkcd-ZBNayERv3z1lCTsQEN80dYr4-A_vaxJWjKSO_Eaahio58DIk5H06S0V4AdC-DuX68Qp2e4TcKOfSjqr-UjcHeXq8snmpqmbvVUYw"
            alt="Administrator Profile"
            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
          />
        </div>
      </div>
    </header>
  );
};

'use client';

import { Activity, ChevronRight, LayoutDashboard, LogOut, Menu, ScrollText, ShieldCheck, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { navigationConfig } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';
import { BrandMark } from './brand-mark';

const icons = {
  dashboard: LayoutDashboard,
  users: Users,
  roles: ShieldCheck,
  audit: ScrollText,
};

function matchesNavigationItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = useMemo(
    () => navigationConfig.filter((item) => hasPermission(user, item.viewPermission)),
    [user],
  );
  const activeItem = navigationConfig.find((item) => matchesNavigationItem(pathname, item.href));
  const pageAllowed = !activeItem || hasPermission(user, activeItem.viewPermission);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && user && !pageAllowed) {
      router.replace('/forbidden');
    }
  }, [pageAllowed, router, status, user]);

  if (status === 'loading' || !user || !pageAllowed) {
    return (
      <main className="loading-screen">
        <BrandMark />
        <div className="loading-line" />
        <p>{status === 'loading' ? 'Đang khôi phục phiên làm việc an toàn…' : 'Đang kiểm tra quyền truy cập…'}</p>
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="app-frame">
      {mobileOpen && <button type="button" className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <BrandMark />
          <button type="button" className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu">
            <X size={19} />
          </button>
        </div>
        <div className="plant-pill">
          <Activity size={16} />
          <div>
            <span>Nhà máy</span>
            <strong>Thủy điện ĐăkRơSa 1</strong>
          </div>
          <i title="Hệ thống trực tuyến" />
        </div>
        <nav aria-label="Điều hướng chính">
          <span className="nav-label">Không gian vận hành</span>
          {visibleItems.map((item) => {
            const Icon = icons[item.icon];
            const active = matchesNavigationItem(pathname, item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`nav-item ${active ? 'nav-item-active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {active && <ChevronRight size={16} />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.displayName}</strong>
              <small>@{user.username}</small>
            </div>
          </div>
          <button type="button" className="logout-button" onClick={handleLogout}>
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button type="button" className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Mở menu">
            <Menu size={21} />
          </button>
          <div>
            <span>Trung tâm vận hành</span>
            <strong>{activeItem?.label ?? 'ĐăkRơSa'}</strong>
          </div>
          <div className="live-indicator"><i /> Hệ thống trực tuyến</div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

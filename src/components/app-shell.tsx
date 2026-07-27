'use client';

import { Activity, BriefcaseBusiness, ChevronDown, ChevronRight, LayoutDashboard, LogOut, Menu, RadioTower, ScrollText, ShieldCheck, Users, X } from 'lucide-react';
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
  eoffice: BriefcaseBusiness,
  operations: RadioTower,
};

function matchesNavigationItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function matchesItemOrChild(pathname: string, item: (typeof navigationConfig)[number]) {
  return matchesNavigationItem(pathname, item.href) || item.children?.some((child) => matchesNavigationItem(pathname, child.href));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<ReadonlySet<string>>(() => new Set());

  const visibleItems = useMemo(
    () => navigationConfig.filter((item) => hasPermission(user, item.viewPermission)),
    [user],
  );
  const activeItem = navigationConfig.find((item) => matchesItemOrChild(pathname, item));
  const activeChild = activeItem?.children?.find((child) => matchesNavigationItem(pathname, child.href));
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
            const active = matchesItemOrChild(pathname, item);
            const expanded = expandedItems.has(item.id) || active;
            const toggleExpanded = () => {
              setExpandedItems((current) => {
                const next = new Set(current);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              });
            };
            return (
              <div className="nav-group" key={item.id}>
                <div className={`nav-item ${active ? 'nav-item-active' : ''}`}>
                  <Link href={item.href} onClick={() => setMobileOpen(false)}>
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </Link>
                  {item.children ? (
                    <button type="button" className="nav-expand-button" onClick={toggleExpanded} aria-label={`Mở danh sách ${item.label}`} aria-expanded={expanded}>
                      <ChevronDown size={16} className={expanded ? 'nav-chevron-open' : ''} />
                    </button>
                  ) : active ? <ChevronRight size={16} /> : null}
                </div>
                {item.children && expanded && (
                  <div className="nav-children">
                    {item.children.map((child) => {
                      const childActive = matchesNavigationItem(pathname, child.href);
                      return <Link key={child.id} href={child.href} className={`nav-child ${childActive ? 'nav-child-active' : ''}`} onClick={() => setMobileOpen(false)}>{child.label}</Link>;
                    })}
                  </div>
                )}
              </div>
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
            <strong>{activeChild?.label ?? activeItem?.label ?? 'ĐăkRơSa'}</strong>
          </div>
          <div className="live-indicator"><i /> Hệ thống trực tuyến</div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

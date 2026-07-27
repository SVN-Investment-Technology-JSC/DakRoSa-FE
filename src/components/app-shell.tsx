'use client';

import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  Files,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  ScrollText,
  Settings2,
  ShieldCheck,
  Network,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { redirect, usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  NavigationIcon,
  NavigationItem,
  navigationConfig,
  tenantPath,
} from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { BrandMark } from './brand-mark';

const icons: Record<NavigationIcon, React.ComponentType<{ size?: number }>> = {
  dashboard: LayoutDashboard,
  'work-items': ListTodo,
  submissions: Files,
  signatures: FileCheck2,
  users: Users,
  roles: ShieldCheck,
  audit: ScrollText,
  settings: Settings2,
  organization: Network,
};

const groupLabels: Record<NavigationItem['group'], string> = {
  workspace: 'Không gian làm việc',
  office: 'Văn phòng điện tử',
  administration: 'Quản trị doanh nghiệp',
};

function matchesNavigationItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tenantSlugFromPath(pathname: string): string | null {
  return pathname.match(/^\/t\/([^/]+)/)?.[1] ?? null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, status, switchTenant, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const routeTenantSlug = tenantSlugFromPath(pathname);

  const visibleItems = useMemo(
    () =>
      navigationConfig.filter(
        (item) =>
          hasPermission(user, item.viewPermission) &&
          (!item.module || user?.activeTenant.enabledModules.includes(item.module)),
      ),
    [user],
  );
  const activeItem = navigationConfig.find((item) => {
    const tenantHref = user
      ? tenantPath(user.activeTenant.slug, item.href)
      : item.href;
    return (
      matchesNavigationItem(pathname, tenantHref) ||
      matchesNavigationItem(pathname, item.href)
    );
  });
  const pageAllowed =
    !activeItem ||
    (hasPermission(user, activeItem.viewPermission) &&
      (!activeItem.module ||
        user?.activeTenant.enabledModules.includes(activeItem.module)));
  const tenantMismatch =
    Boolean(routeTenantSlug) &&
    Boolean(user) &&
    routeTenantSlug !== user?.activeTenant.slug;
  const tenantAccessDenied =
    Boolean(routeTenantSlug) &&
    Boolean(user) &&
    !user?.tenants.some((tenant) => tenant.slug === routeTenantSlug);

  useEffect(() => {
    if (
      !user ||
      !routeTenantSlug ||
      !tenantMismatch ||
      tenantAccessDenied
    )
      return;
    void switchTenant(routeTenantSlug).catch(() => {
      setSwitchError('Không thể chuyển không gian doanh nghiệp.');
    });
  }, [
    routeTenantSlug,
    switchTenant,
    tenantAccessDenied,
    tenantMismatch,
    user,
  ]);

  if (status === 'unauthenticated') redirect('/login');
  if (
    status === 'authenticated' &&
    user &&
    (!pageAllowed || tenantAccessDenied)
  ) {
    redirect('/forbidden');
  }

  if (
    status === 'loading' ||
    !user ||
    !pageAllowed ||
    (tenantMismatch && !switchError)
  ) {
    return (
      <main className="grid min-h-svh place-content-center justify-items-center gap-5 bg-[#F7FAF4] px-6 text-[#59615A]">
        <BrandMark className="w-[280px]" priority />
        <div className="h-1 w-44 overflow-hidden rounded-full bg-[#DCE6DA]">
          <span className="block h-full w-2/3 animate-pulse rounded-full bg-[#386948]" />
        </div>
        <p className="text-sm font-bold">
          {tenantMismatch
            ? 'Đang chuyển không gian doanh nghiệp…'
            : 'Đang khôi phục phiên làm việc an toàn…'}
        </p>
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  const handleTenantChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const slug = event.target.value;
    if (slug === user.activeTenant.slug) return;
    setSwitchError('');
    try {
      const nextUser = await switchTenant(slug);
      router.push(tenantPath(nextUser.activeTenant.slug, '/dashboard'));
    } catch {
      setSwitchError('Không thể chuyển không gian doanh nghiệp.');
    }
  };

  const groupedItems = (
    ['workspace', 'office', 'administration'] as const
  ).map((group) => ({
    group,
    items: visibleItems.filter((item) => item.group === group),
  }));

  return (
    <div className="min-h-svh bg-[#F7FAF4] text-[#2C342E]">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#17251C]/45 backdrop-blur-sm lg:hidden"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-white/10 bg-[#386948] px-4 py-4 text-white shadow-[14px_0_40px_rgba(35,63,44,0.12)] transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2">
          <BrandMark className="min-w-0 flex-1" priority />
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mt-4">
          <Building2
            size={17}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#B9EFC5]"
          />
          <select
            aria-label="Chọn doanh nghiệp"
            value={user.activeTenant.slug}
            onChange={handleTenantChange}
            className="h-12 w-full appearance-none rounded-xl border border-white/12 bg-white/8 pr-9 pl-10 text-sm font-bold text-white outline-none transition focus:border-[#B9EFC5]/70 focus:ring-3 focus:ring-[#B9EFC5]/15"
          >
            {user.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.slug} className="text-black">
                {tenant.shortName}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white/55"
          />
        </div>
        {switchError && (
          <p className="mt-2 rounded-lg bg-[#A83836]/25 px-3 py-2 text-xs text-red-100">
            {switchError}
          </p>
        )}

        <nav
          aria-label="Điều hướng chính"
          className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1"
        >
          {groupedItems.map(({ group, items }) =>
            items.length ? (
              <div key={group} className="mb-5">
                <span className="mb-2 block px-3 text-[12px] font-black tracking-[0.12em] text-white/48 uppercase">
                  {groupLabels[group]}
                </span>
                <div className="grid gap-1">
                  {items.map((item) => {
                    const Icon = icons[item.icon];
                    const href = tenantPath(
                      user.activeTenant.slug,
                      item.href,
                    );
                    const active = matchesNavigationItem(pathname, href);
                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className={cn(
                          'group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-white/72 transition',
                          active
                            ? 'bg-[#E8F3E8] text-[#2B5D3C] shadow-sm ring-1 ring-[#B9EFC5]/70'
                            : 'hover:bg-white/10 hover:text-white',
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon size={18} />
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {active && <ChevronRight size={16} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </nav>

        {user.isPlatformAdmin && (
          <Link
            href="/platform/tenants"
            className="mb-4 flex min-h-11 items-center gap-3 rounded-lg border border-white/15 bg-white/8 px-3 text-sm font-bold text-white/85 transition hover:bg-white/14"
            onClick={() => setMobileOpen(false)}
          >
            <Building2 size={18} />
            <span>Quản trị nền tảng</span>
          </Link>
        )}

        <div className="border-t border-white/12 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-black/8 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#B9EFC5] text-sm font-black text-[#2B5D3C]">
              {user.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm">
                {user.displayName}
              </strong>
              <span className="block truncate text-xs text-white/55">
                @{user.username}
              </span>
            </div>
            <button
              type="button"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-white/58 hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
              aria-label="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-svh lg:pl-[272px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#DDE5DC] bg-white/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-lg border border-[#DDE5DC] bg-white text-[#59615A] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={21} />
          </button>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold tracking-[0.08em] text-[#758077] uppercase">
              {user.activeTenant.shortName}
            </span>
            <strong className="block truncate text-sm text-[#2C342E]">
              {activeItem?.label ?? 'Không gian doanh nghiệp'}
            </strong>
          </div>
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-xl border border-[#DDE5DC] bg-white text-[#59615A] hover:bg-[#F0F5EE]"
            aria-label="Thông báo"
          >
            <Bell size={19} />
          </button>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

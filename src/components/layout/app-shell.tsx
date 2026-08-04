/* eslint-disable */
'use client';

import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  Files,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Network,
  Package,
  RadioTower,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { redirect, usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  NavigationIcon,
  NavigationItem,
  PERMISSIONS,
  navigationConfig,
  tenantPath,
} from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
<<<<<<< HEAD:src/components/layout/app-shell.tsx
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/auth/brand-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationCenter } from './notification-center';
=======
import { BrandMark } from './brand-mark';
import { NotificationBell } from './notification-bell';
>>>>>>> f2a2edf (feat(workflow): add workflow mini-map, notification bell, and workflow template page):src/components/app-shell.tsx

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
  eoffice: BriefcaseBusiness,
  operations: RadioTower,
  equipment: Settings2,
  inventory: Package,
  work_order: ClipboardList,
  maintenance: CalendarClock,
};

const groupLabels: Record<NonNullable<NavigationItem['group']>, string> = {
  workspace: 'Không gian làm việc',
  office: 'Văn phòng điện tử',
  administration: 'Quản trị doanh nghiệp',
};

function matchesNavigationItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getHref(href: string, tenantAware?: boolean, tenantSlug?: string | null) {
  return tenantAware && tenantSlug ? tenantPath(tenantSlug, href) : href;
}

function matchesItemOrChild(pathname: string, item: (typeof navigationConfig)[number], tenantSlug?: string | null) {
  const itemHref = getHref(item.href, item.tenantAware, tenantSlug);
  if (matchesNavigationItem(pathname, itemHref)) return true;
  return item.children?.some((child) => {
    const childHref = getHref(child.href, child.tenantAware, tenantSlug);
    return matchesNavigationItem(pathname, childHref);
  }) ?? false;
}

function tenantSlugFromPath(pathname: string): string | null {
  return pathname.match(/^\/t\/([^/]+)/)?.[1] ?? null;
}

function TenantContentSkeleton() {
  return (
    <section
      className="grid gap-6"
      role="status"
      aria-label="Đang tải dữ liệu doanh nghiệp"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-7 w-52 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="hidden h-10 w-32 sm:block" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
      <span className="sr-only">Đang chuyển không gian doanh nghiệp…</span>
    </section>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, status, switchTenant, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<ReadonlySet<string>>(() => new Set());
  const [switchError, setSwitchError] = useState('');
  const [pendingTenantSlug, setPendingTenantSlug] = useState<string | null>(null);
  const routeTenantSlug = tenantSlugFromPath(pathname);
  const isModuleEnabled = (module?: string) =>
    !module ||
    user?.isPlatformAdmin ||
    Boolean(user?.activeTenant.enabledModules.includes(module));

  const visibleItems = useMemo(
    () =>
      navigationConfig.flatMap((item) => {
        if (!hasPermission(user, item.viewPermission) || !isModuleEnabled(item.module)) {
          return [];
        }
        const children = item.children?.filter((child) =>
          isModuleEnabled(child.module),
        );
        if (item.children && !children?.length) return [];
        return [{ ...item, children }];
      }),
    [user],
  );

  const activeItem = navigationConfig.find((item) => matchesItemOrChild(pathname, item, user?.activeTenant.slug));
  const activeChild = activeItem?.children
    ? [...activeItem.children]
        .sort((a, b) => b.href.length - a.href.length)
        .find((child) =>
          matchesNavigationItem(
            pathname,
            getHref(child.href, child.tenantAware, user?.activeTenant.slug),
          ),
        )
    : undefined;
  const pageAllowed =
    !activeItem ||
    (hasPermission(user, activeItem.viewPermission) &&
      isModuleEnabled(activeItem.module) &&
      (activeChild
        ? isModuleEnabled(activeChild.module)
        : !activeItem.children ||
          activeItem.children.some((child) => isModuleEnabled(child.module))));
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
      tenantAccessDenied ||
      pendingTenantSlug
    )
      return;
    setPendingTenantSlug(routeTenantSlug);
    setSwitchError('');
    void switchTenant(routeTenantSlug).catch(() => {
      setSwitchError('Không thể chuyển không gian doanh nghiệp.');
      setPendingTenantSlug(null);
    });
  }, [
    pendingTenantSlug,
    routeTenantSlug,
    switchTenant,
    tenantAccessDenied,
    tenantMismatch,
    user,
  ]);

  useEffect(() => {
    if (
      pendingTenantSlug &&
      routeTenantSlug === pendingTenantSlug &&
      user?.activeTenant.slug === pendingTenantSlug
    ) {
      setPendingTenantSlug(null);
    }
  }, [pendingTenantSlug, routeTenantSlug, user?.activeTenant.slug]);

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
    !pageAllowed
  ) {
    return (
      <main className="grid min-h-svh place-content-center justify-items-center gap-5 bg-[#F7FAF4] px-6 text-[#59615A]">
        <BrandMark className="w-[280px]" priority />
        <div className="h-1 w-44 overflow-hidden rounded-full bg-[#DCE6DA]">
          <span className="block h-full w-2/3 animate-pulse rounded-full bg-[#386948]" />
        </div>
        <p className="text-sm font-bold">Đang khôi phục phiên làm việc an toàn…</p>
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  const handleTenantChange = async (slug: string) => {
    if (slug === user.activeTenant.slug || pendingTenantSlug) return;
    setSwitchError('');
    setPendingTenantSlug(slug);
    try {
      const nextUser = await switchTenant(slug);
      router.replace(tenantPath(nextUser.activeTenant.slug, '/dashboard'));
    } catch {
      setSwitchError('Không thể chuyển không gian doanh nghiệp.');
      setPendingTenantSlug(null);
    }
  };

  const groupedItems = (
    ['workspace', 'office', 'administration'] as const
  ).map((group) => ({
    group,
    items: visibleItems.filter((item) => item.group === group),
  }));

  const ungroupedItems = visibleItems.filter((item) => !item.group);
  const isTenantSwitching =
    Boolean(pendingTenantSlug) || (tenantMismatch && !switchError);
  const brandStyle = user.isPlatformAdmin
    ? undefined
    : ({
      '--primary': user.activeTenant.primaryColor,
      '--secondary-foreground': user.activeTenant.primaryColor,
      '--ring': user.activeTenant.primaryColor,
    } as React.CSSProperties);

  return (
    <div className="min-h-svh bg-[#F7FAF4] text-[#2C342E]" style={brandStyle}>
      {mobileOpen && (
        <Button
          type="button"
          variant="ghost"
          className="fixed inset-0 z-40 bg-[#17251C]/45 backdrop-blur-sm lg:hidden"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-white/10 bg-primary px-4 py-4 text-white shadow-[14px_0_40px_rgba(35,63,44,0.12)] transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2">
          <BrandMark
            className="min-w-0 flex-1"
            priority
            logoUrl={user.isPlatformAdmin ? '/logo-blue.png' : user.activeTenant.logoUrl}
            fallbackText={user.activeTenant.shortName}
            alt={user.isPlatformAdmin ? 'Nhận diện nền tảng' : user.activeTenant.name}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="relative mt-4">
          <Building2
            size={17}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/70"
          />
          <Select
            disabled={isTenantSwitching}
            value={pendingTenantSlug ?? user.activeTenant.slug}
            onValueChange={(slug) => void handleTenantChange(slug)}
          >
            <SelectTrigger aria-label="Chọn doanh nghiệp" className="h-12 w-full border-white/12 bg-white/8 pl-10 text-sm font-bold text-white focus:ring-white/20 [&_svg]:text-white/55"><SelectValue /></SelectTrigger>
            <SelectContent position="popper">{user.tenants.map((tenant) => <SelectItem key={tenant.id} value={tenant.slug}>{tenant.shortName}</SelectItem>)}</SelectContent>
          </Select>
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
                    const href = getHref(item.href, item.tenantAware, user.activeTenant.slug);
                    const active = matchesItemOrChild(pathname, item, user.activeTenant.slug);
                    const expanded = expandedItems.has(item.id) || active;
                    const toggleExpanded = (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpandedItems((current) => {
                        const next = new Set(current);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    };

                    return (
                      <div key={item.id} className="grid gap-1">
                        <Link
                          href={href}
                          className={cn(
                            'group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-white/72 transition',
                            active
                              ? 'bg-white text-primary shadow-sm ring-1 ring-white/70'
                              : 'hover:bg-white/10 hover:text-white',
                          )}
                          onClick={() => setMobileOpen(false)}
                        >
                          <Icon size={18} />
                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>
                          {item.children ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={toggleExpanded}
                              className="p-1 rounded hover:bg-black/10"
                              aria-label={`Mở danh sách ${item.label}`}
                              aria-expanded={expanded}
                            >
                              <ChevronDown size={16} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </Button>
                          ) : active ? (
                            <ChevronRight size={16} />
                          ) : null}
                        </Link>
                        {item.children && expanded && (
                          <div className="ml-6 pl-3 border-l border-white/20 grid gap-1">
                            {item.children.map((child) => {
                              const childHref = getHref(child.href, child.tenantAware, user.activeTenant.slug);
                              const childActive = matchesNavigationItem(pathname, childHref);
                              return (
                                <Link
                                  key={child.id}
                                  href={childHref}
                                  className={cn(
                                    'block py-1.5 px-2 rounded-lg text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white',
                                    childActive && 'bg-white/20 text-white font-bold',
                                  )}
                                  onClick={() => setMobileOpen(false)}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}

          {ungroupedItems.length > 0 && (
            <div className="mb-5">
              <span className="mb-2 block px-3 text-[12px] font-black tracking-[0.12em] text-white/48 uppercase">
                Phân hệ mở rộng
              </span>
              <div className="grid gap-1">
                {ungroupedItems.map((item) => {
                  const Icon = icons[item.icon];
                  const active = matchesItemOrChild(pathname, item, user.activeTenant.slug);
                  const expanded = expandedItems.has(item.id) || active;
                  const toggleExpanded = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpandedItems((current) => {
                      const next = new Set(current);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  };

                  return (
                    <div key={item.id} className="grid gap-1">
                      <Link
                        href={getHref(item.href, item.tenantAware, user.activeTenant.slug)}
                        className={cn(
                          'group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-white/72 transition',
                          active
                            ? 'bg-white text-primary shadow-sm ring-1 ring-white/70'
                            : 'hover:bg-white/10 hover:text-white',
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon size={18} />
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {item.children ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={toggleExpanded}
                            className="p-1 rounded hover:bg-black/10"
                            aria-label={`Mở danh sách ${item.label}`}
                            aria-expanded={expanded}
                          >
                            <ChevronDown size={16} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                          </Button>
                        ) : active ? (
                          <ChevronRight size={16} />
                        ) : null}
                      </Link>
                      {item.children && expanded && (
                        <div className="ml-6 pl-3 border-l border-white/20 grid gap-1">
                          {item.children.map((child) => {
                            const childHref = getHref(child.href, child.tenantAware, user.activeTenant.slug);
                            const childActive = matchesNavigationItem(pathname, childHref);
                            return (
                              <Link
                                key={child.id}
                                href={childHref}
                                className={cn(
                                  'block py-1.5 px-2 rounded-lg text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white',
                                  childActive && 'bg-white/20 text-white font-bold',
                                )}
                                onClick={() => setMobileOpen(false)}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-primary">
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-white/58 hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
              aria-label="Đăng xuất"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-h-svh lg:pl-[272px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#DDE5DC] bg-white/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="grid size-10 place-items-center rounded-lg border border-[#DDE5DC] bg-white text-[#59615A] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={21} />
          </Button>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold tracking-[0.08em] text-[#758077] uppercase">
              {user.activeTenant.shortName}
            </span>
            <strong className="block truncate text-sm text-[#2C342E]">
              {activeChild?.label ?? activeItem?.label ?? 'Không gian doanh nghiệp'}
            </strong>
          </div>
<<<<<<< HEAD:src/components/layout/app-shell.tsx
          {hasPermission(user, PERMISSIONS.NOTIFICATIONS_VIEW) ? (
            <NotificationCenter tenantSlug={user.activeTenant.slug} />
          ) : null}
=======
          <NotificationBell />
>>>>>>> f2a2edf (feat(workflow): add workflow mini-map, notification bell, and workflow template page):src/components/app-shell.tsx
        </header>
        <main
          className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          aria-busy={isTenantSwitching}
        >
          {isTenantSwitching ? <TenantContentSkeleton /> : children}
        </main>
      </div>
    </div>
  );
}

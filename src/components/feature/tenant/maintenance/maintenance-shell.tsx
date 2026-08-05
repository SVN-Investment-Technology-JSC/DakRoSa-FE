'use client';

import {
  CalendarDays,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Route,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', label: 'Tổng quan', href: '', icon: LayoutDashboard },
  { id: 'calendar', label: 'Lịch', href: '/calendar', icon: CalendarDays },
  { id: 'schedules', label: 'Kế hoạch', href: '/schedules', icon: SlidersHorizontal },
  { id: 'job-plans', label: 'Mẫu công việc', href: '/job-plans', icon: ListChecks },
  { id: 'workflows', label: 'Quy trình', href: '/workflows', icon: Route },
] as const;

export function MaintenanceShell({
  tenantSlug,
  title,
  description,
  actions,
  children,
}: {
  tenantSlug: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const base = `/t/${tenantSlug}/maintenance`;

  return (
    <div className="grid gap-6">
      <header className="overflow-hidden rounded-3xl border border-[#DCE6DB] bg-[linear-gradient(135deg,#123E2D_0%,#1B5A40_58%,#347A55_100%)] text-white shadow-[0_18px_55px_rgba(20,67,47,0.16)]">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/12 shadow-inner">
              <Gauge size={23} />
            </span>
            <div>
              <span className="text-xs font-black tracking-[0.14em] text-emerald-100/80 uppercase">
                Maintenance control center
              </span>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
                {description}
              </p>
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
        <nav
          className="flex overflow-x-auto border-t border-white/10 bg-black/8 px-3 sm:px-5"
          aria-label="Điều hướng bảo trì"
        >
          {sections.map((section) => {
            const href = `${base}${section.href}`;
            const active =
              section.href === ''
                ? pathname === base
                : pathname === href || pathname.startsWith(`${href}/`);
            const Icon = section.icon;
            return (
              <Link
                key={section.id}
                href={href}
                className={cn(
                  'relative flex min-h-13 shrink-0 items-center gap-2 px-3 text-sm font-bold text-white/60 transition hover:text-white sm:px-4',
                  active && 'text-white',
                )}
              >
                <Icon size={16} />
                {section.label}
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-300" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}

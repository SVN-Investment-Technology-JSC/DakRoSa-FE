'use client';

import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { firstPermittedPath } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';

export function GuestGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(firstPermittedPath(user));
    }
  }, [router, status, user]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <main className="grid min-h-svh place-content-center justify-items-center gap-5 bg-[radial-gradient(circle_at_50%_35%,#f4fbfa,#eef4f5)] text-slate-600" aria-live="polite">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-teal-600 shadow-lg shadow-teal-950/5">
          <LoaderCircle className="animate-spin" size={28} />
        </span>
        <p className="text-base font-semibold">
          {status === 'authenticated' ? 'Đang chuyển đến trang tổng quan…' : 'Đang khôi phục phiên làm việc an toàn…'}
        </p>
      </main>
    );
  }

  return children;
}

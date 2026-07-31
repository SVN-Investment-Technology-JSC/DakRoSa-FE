'use client';

import { ArrowLeft, ShieldX } from 'lucide-react';
import Link from 'next/link';
import { firstPermittedPath } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';

export function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <section className="panel empty-state" style={{ minHeight: '70vh' }}>
      <ShieldX size={48} />
      <strong>Bạn chưa được cấp quyền truy cập</strong>
      <p>Phiên đăng nhập vẫn được giữ nguyên. Hãy liên hệ quản trị viên nếu bạn cần quyền cho phân hệ này.</p>
      <Link className="button button-secondary" href={firstPermittedPath(user)} style={{ marginTop: 18 }}>
        <ArrowLeft size={16} /> Về trang được phép
      </Link>
    </section>
  );
}

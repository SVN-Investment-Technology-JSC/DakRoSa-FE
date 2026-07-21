import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ĐăkRơSa Operations', template: '%s | ĐăkRơSa' },
  description: 'Nền tảng quản lý dữ liệu và quy trình vận hành Nhà máy Thủy điện ĐăkRơSa.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}


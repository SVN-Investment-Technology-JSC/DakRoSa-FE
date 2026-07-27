import type { Metadata } from 'next';
import '@fontsource-variable/nunito-sans';
import '@fontsource-variable/literata';
import { AuthProvider } from '@/providers/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nền tảng Quản trị Doanh nghiệp',
    template: '%s | Nền tảng Quản trị Doanh nghiệp',
  },
  description:
    'Nền tảng quản trị doanh nghiệp đa đơn vị, sẵn sàng mở rộng cho các nhà máy.',
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

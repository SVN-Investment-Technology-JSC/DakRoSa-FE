import type { Metadata } from 'next';
import {
  Building2,
  FileCheck2,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { BrandMark } from '@/components/brand-mark';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập nền tảng quản trị doanh nghiệp.',
};

const capabilities = [
  {
    icon: Workflow,
    label: 'Quy trình rõ ràng',
    description: 'Hồ sơ, phê duyệt và lịch sử xử lý trên một luồng thống nhất.',
  },
  {
    icon: Building2,
    label: 'Đa doanh nghiệp',
    description: 'Dữ liệu và quyền được tách theo từng doanh nghiệp, nhà máy.',
  },
  {
    icon: ShieldCheck,
    label: 'Kiểm soát truy cập',
    description: 'Vai trò động và kiểm tra quyền tại máy chủ.',
  },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-[#F7FAF4] lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,.95fr)]">
      <section className="relative hidden overflow-hidden bg-[#386948] px-10 py-8 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(185,239,197,0.18),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.04),transparent_58%)]" />
        <div className="pointer-events-none absolute -right-36 -bottom-40 size-[30rem] rounded-full border-[60px] border-white/[0.035]" />
        <BrandMark className="relative z-10 w-[290px]" priority />
        <div className="relative z-10 my-auto max-w-2xl py-12">
          <span className="mb-4 block text-xs font-black tracking-[0.15em] text-[#B9EFC5] uppercase">
            Nền tảng quản trị doanh nghiệp
          </span>
          <h1 className="font-display text-[clamp(2.65rem,4.7vw,4.75rem)] leading-[1.06] font-bold tracking-[-0.045em] text-balance">
            Một không gian thống nhất cho con người và quy trình.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/72">
            Kiến trúc dùng chung cho nhiều doanh nghiệp, đồng thời giữ dữ liệu,
            vai trò và cấu hình của từng nhà máy độc lập.
          </p>
          <div className="mt-9 grid gap-3 xl:grid-cols-3">
            {capabilities.map(({ icon: Icon, label, description }) => (
              <article
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
              >
                <span className="mb-4 grid size-9 place-items-center rounded-lg bg-[#B9EFC5] text-[#2B5D3C]">
                  <Icon size={18} />
                </span>
                <h2 className="text-sm font-black">{label}</h2>
                <p className="mt-1.5 text-xs leading-5 text-white/60">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
        <footer className="relative z-10 flex items-center gap-2 text-xs font-bold text-white/45">
          <FileCheck2 size={15} /> Phiên truy cập được giám sát và ghi nhận
        </footer>
      </section>

      <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-10 sm:px-10 lg:px-12">
        <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-[#DDEEDD] blur-3xl" />
        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-7 flex justify-center lg:hidden">
            <BrandMark className="w-[290px]" priority />
          </div>
          <LoginForm />
          <p className="mt-5 text-center text-xs leading-5 font-semibold text-[#758077]">
            Không chia sẻ thông tin đăng nhập. Liên hệ quản trị viên nếu cần
            cấp hoặc khôi phục tài khoản.
          </p>
        </div>
      </section>
    </main>
  );
}

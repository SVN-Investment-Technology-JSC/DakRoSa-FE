import type { Metadata } from 'next';
import { Activity, Database, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { BrandMark } from '@/components/brand-mark';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập Cổng vận hành Nhà máy Thủy điện ĐăkRơSa.',
};

const features = [
  { icon: Database, label: 'Dữ liệu tập trung', description: 'Một nguồn dữ liệu dùng chung cho toàn nhà máy.' },
  { icon: Activity, label: 'Vận hành trực quan', description: 'Theo dõi trạng thái và quy trình rõ ràng.' },
  { icon: ShieldCheck, label: 'Truy cập an toàn', description: 'Kiểm soát chi tiết theo từng permission.' },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-slate-50 lg:grid-cols-[minmax(0,1.08fr)_minmax(34rem,.92fr)]">
      <section className="relative hidden min-h-svh overflow-hidden bg-[#071820] px-12 py-10 text-white lg:flex lg:flex-col xl:px-20 xl:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_14%,rgba(45,212,191,0.24),transparent_28%),radial-gradient(circle_at_8%_92%,rgba(14,116,144,0.23),transparent_30%),linear-gradient(145deg,#0b2b36_0%,#071820_72%)]" />
        <div className="pointer-events-none absolute -right-56 top-24 size-[34rem] rounded-full border border-teal-300/10 shadow-[0_0_0_5rem_rgba(45,212,191,0.025),0_0_0_10rem_rgba(45,212,191,0.018)]" />
        <div className="pointer-events-none absolute -bottom-36 -left-36 size-72 rounded-full border border-cyan-200/10" />

        <header className="relative z-10 flex items-center justify-between gap-6">
          <BrandMark />
          <span className="rounded-full border border-teal-200/15 bg-white/5 px-4 py-2 text-sm font-bold tracking-[0.16em] text-teal-100 uppercase backdrop-blur-sm">
            Core Portal · Giai đoạn 01
          </span>
        </header>

        <div className="relative z-10 my-auto max-w-4xl py-14">
          <span className="mb-5 block text-base font-extrabold tracking-[0.18em] text-teal-300 uppercase">
            Nền tảng vận hành hợp nhất
          </span>
          <h1 className="max-w-4xl text-[clamp(3.5rem,5.5vw,6rem)] leading-[0.98] font-black tracking-[-0.055em] text-balance">
            Dữ liệu tập trung.
            <span className="mt-2 block text-teal-300">Quyết định tức thời.</span>
          </h1>
          <p className="mt-8 max-w-3xl text-xl leading-9 font-medium text-slate-300">
            Không gian số dành cho đội ngũ ĐăkRơSa, kết nối dữ liệu, con người và quy trình vận hành trong một trải nghiệm rõ ràng, an toàn và sẵn sàng mở rộng.
          </p>

          <div className="mt-10 grid gap-4 xl:grid-cols-3">
            {features.map(({ icon: Icon, label, description }) => (
              <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm transition-colors hover:bg-white/[0.085]">
                <span className="mb-5 grid size-12 place-items-center rounded-xl bg-teal-300/12 text-teal-300">
                  <Icon size={23} />
                </span>
                <h2 className="text-lg font-extrabold text-white">{label}</h2>
                <p className="mt-2 text-base leading-7 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>

        <footer className="relative z-10 flex items-center justify-between gap-6 text-sm font-bold tracking-[0.1em] text-slate-500 uppercase">
          <span>ĐăkRơSa Hydro Operations</span>
          <span>Secure · Centralized · Scalable</span>
        </footer>
      </section>

      <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
        <div className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 -left-24 size-96 rounded-full bg-cyan-100/55 blur-3xl" />

        <div className="relative z-10 w-full max-w-xl">
          <div className="mb-10 flex justify-center lg:hidden [&_small]:!text-slate-500 [&_strong]:!text-slate-900">
            <BrandMark />
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-sm leading-6 font-medium text-slate-500">
            Cổng nội bộ Nhà máy Thủy điện ĐăkRơSa · Phiên truy cập được giám sát và ghi nhận theo chính sách bảo mật.
          </p>
        </div>
      </section>
    </main>
  );
}

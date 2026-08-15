'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, CircleAlert, LoaderCircle, ShieldCheck, UserRound } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/services/service-error';
import { useAuth } from '@/providers/auth-provider';

export interface LoginAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  description: string;
}

export const LOGIN_ACCOUNTS: LoginAccount[] = [
  {
    email: 'admin@company.vn',
    password: 'admin123',
    name: 'Quản trị viên (Admin)',
    role: 'admin',
    description: 'Tài khoản admin nhanh — toàn quyền (workflow.design + task.approve + org.manage)',
  },
  {
    email: 'vp.eng@company.vn',
    password: 'Password123!',
    name: 'Nguyễn Văn Tuấn',
    role: 'approver, workflow_designer',
    description: 'Trưởng Khối Kỹ thuật — có quyền thiết kế workflow/RACI',
  },
  {
    email: 'lead.dev@company.vn',
    password: 'Password123!',
    name: 'Trần Văn Hoàng',
    role: 'approver',
    description: 'Trưởng Ban Phát triển Phần mềm',
  },
  {
    email: 'staff.dev@company.vn',
    password: 'Password123!',
    name: 'Lê Văn Nam',
    role: 'approver',
    description: 'Trưởng Ban Hạ tầng & Vận hành',
  },
  {
    email: 'officer@company.vn',
    password: 'Password123!',
    name: 'Phạm Thị Hà',
    role: 'approver',
    description: 'Nhân viên Tổ QA',
  },
  {
    email: 'auditor@company.vn',
    password: 'Password123!',
    name: 'Đỗ Minh Khang',
    role: 'approver, admin',
    description: 'Trưởng Tổ Hạ tầng Mạng — có toàn quyền',
  },
  {
    email: 'truong.co.dien@company.vn',
    password: 'Password123!',
    name: 'Ngô Thanh Sơn',
    role: 'approver, workflow_designer',
    description: 'Trưởng Ban Cơ điện — nhận thông báo bảo trì của cả nhánh Cơ điện',
  },
  {
    email: 'truong.van.hanh@company.vn',
    password: 'Password123!',
    name: 'Đặng Hải Yến',
    role: 'approver',
    description: 'Trưởng Tổ Cơ khí — có 2 nhân viên, dùng để thử phân rã E(x)',
  },
  {
    email: 'ky.thuat1@company.vn',
    password: 'Password123!',
    name: 'Vũ Thị Mai',
    role: 'approver',
    description: 'Nhân viên Tổ Cơ khí — người nhận công việc con',
  },
  {
    email: 'ky.thuat2@company.vn',
    password: 'Password123!',
    name: 'Hoàng Đức Anh',
    role: 'approver',
    description: 'Nhân viên Tổ Cơ khí — người nhận công việc con',
  },
  {
    email: 'dien.nuoc@company.vn',
    password: 'Password123!',
    name: 'Bùi Quốc Việt',
    role: 'approver',
    description: 'Nhân viên Tổ Điện & Nước — tổ này cố tình không có trưởng',
  },
];

export function LoginForm() {
  const { login } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState(LOGIN_ACCOUNTS[0].email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedAccount = LOGIN_ACCOUNTS.find((acc) => acc.email === selectedEmail) ?? LOGIN_ACCOUNTS[0];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccount) return;
    setSubmitting(true);
    setError('');

    try {
      await login(selectedAccount.email, selectedAccount.password);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể kết nối đến hệ thống.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border-[#DDE5DC] bg-white/95 shadow-[0_24px_64px_rgba(44,68,49,0.12)] backdrop-blur-xl">
      <CardHeader className="gap-2.5 px-6 pt-7 sm:px-8 sm:pt-8">
        <span className="w-fit rounded-full bg-[#E8F3E8] px-3 py-1.5 text-xs font-extrabold tracking-[0.1em] text-[#386948] uppercase">
          Chào mừng trở lại
        </span>
        <CardTitle>
          <h1 className="font-display text-3xl leading-tight font-bold tracking-[-0.03em] text-[#2C342E] sm:text-4xl">Đăng nhập hệ thống</h1>
        </CardTitle>
        <CardDescription className="text-sm leading-6">
          Chọn người dùng từ danh sách phân quyền để truy cập không gian doanh nghiệp.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pt-7 pb-7 sm:px-8 sm:pb-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <CircleAlert className="mt-0.5 size-5" />
              <AlertDescription className="text-sm font-semibold">{error}</AlertDescription>
            </Alert>
          )}

          {/* Duy nhất 1 trường sổ xuống chọn Người dùng */}
          <div className="space-y-2.5">
            <Label htmlFor="user-select" className="text-xs font-bold uppercase tracking-wider text-[#2C342E]">
              Chọn người muốn đăng nhập
            </Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-slate-400" />
              <select
                id="user-select"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-[#DDE5DC] bg-[#FAFCF8] pr-10 pl-12 text-sm font-semibold text-slate-800 shadow-xs transition-colors focus:border-[#386948] focus:bg-white focus:outline-hidden focus:ring-[3px] focus:ring-[#386948]/20 cursor-pointer"
                required
              >
                {LOGIN_ACCOUNTS.map((acc) => (
                  <option key={acc.email} value={acc.email}>
                    {acc.name} — {acc.description.split('—')[0].trim()} ({acc.email})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="size-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Chi tiết tài khoản đã chọn */}
          {selectedAccount && (
            <div className="rounded-xl border border-[#DDE5DC] bg-[#F7FAF4] p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#59615A] font-medium">Họ và tên:</span>
                <span className="font-bold text-[#2C342E] text-sm">{selectedAccount.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#59615A] font-medium">Email:</span>
                <span className="font-mono text-slate-700">{selectedAccount.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#59615A] font-medium">Vai trò:</span>
                <span className="rounded bg-[#E8F3E8] px-2.5 py-0.5 font-bold font-mono text-[11px] text-[#386948]">
                  {selectedAccount.role}
                </span>
              </div>
              <div className="pt-1.5 border-t border-[#DDE5DC]/70">
                <span className="text-[#59615A] block mb-1 font-medium">Chức vụ & Quyền hạn:</span>
                <p className="text-[#2C342E] font-medium leading-relaxed bg-white/90 p-2.5 rounded-lg border border-[#E5EDE4]">
                  {selectedAccount.description}
                </p>
              </div>
            </div>
          )}

          <Button className="h-12 w-full text-base font-bold bg-[#163B66] hover:bg-[#122f52] text-white cursor-pointer" type="submit" disabled={submitting}>
            {submitting ? (
              <><LoaderCircle className="size-5 animate-spin" /> Đang xác thực…</>
            ) : (
              <>Đăng nhập với tư cách {selectedAccount.name} <ArrowRight className="size-5" /></>
            )}
          </Button>
        </form>

        <div className="mt-6 flex gap-3 rounded-xl border border-[#DDE5DC] bg-[#F7FAF4] p-4 text-sm leading-6 text-[#59615A]">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#386948]" />
          <span>Phiên đăng nhập được bảo vệ bằng cookie HttpOnly và quyền truy cập được kiểm tra lại tại máy chủ.</span>
        </div>
      </CardContent>
    </Card>
  );
}



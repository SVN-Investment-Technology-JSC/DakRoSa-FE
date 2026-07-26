'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export function LoginForm() {
  const { login } = useAuth();
  const usernameRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login(username.trim(), password);
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
          Sử dụng tài khoản do quản trị viên cấp để truy cập không gian doanh nghiệp.
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

          <div className="space-y-2.5">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                ref={usernameRef}
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="h-12 bg-[#FAFCF8] pr-4 pl-12 text-sm"
                minLength={3}
                required
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                className="h-12 bg-[#FAFCF8] pr-14 pl-12 text-sm"
                minLength={8}
                required
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-[#758077] transition-colors hover:bg-[#F0F5EE] hover:text-[#386948] focus-visible:ring-2 focus-visible:ring-[#386948]/30 focus-visible:outline-none"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button className="h-12 w-full text-base" type="submit" disabled={submitting}>
            {submitting ? (
              <><LoaderCircle className="size-5 animate-spin" /> Đang xác thực…</>
            ) : (
              <>Đăng nhập an toàn <ArrowRight className="size-5" /></>
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

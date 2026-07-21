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
    <Card className="gap-0 overflow-hidden border-white/80 bg-white/95 shadow-[0_30px_80px_rgba(15,50,60,0.14)] backdrop-blur-xl">
      <CardHeader className="gap-3 px-6 pt-7 sm:px-9 sm:pt-9">
        <span className="w-fit rounded-full bg-teal-50 px-3.5 py-2 text-sm font-extrabold tracking-[0.12em] text-teal-700 uppercase">
          Chào mừng trở lại
        </span>
        <CardTitle>
          <h1 className="text-4xl leading-tight font-black tracking-[-0.04em] text-slate-900 sm:text-5xl">Đăng nhập hệ thống</h1>
        </CardTitle>
        <CardDescription className="text-lg leading-8">
          Sử dụng tài khoản do quản trị viên cấp để truy cập không gian vận hành.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pt-8 pb-7 sm:px-9 sm:pb-9">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <CircleAlert className="mt-0.5 size-5" />
              <AlertDescription className="text-base font-semibold">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2.5">
            <Label className="text-lg" htmlFor="username">Tên đăng nhập</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                ref={usernameRef}
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="h-14 bg-slate-50/70 pr-4 pl-12 text-lg placeholder:text-base"
                minLength={3}
                required
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-lg" htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                className="h-14 bg-slate-50/70 pr-14 pl-12 text-lg placeholder:text-base"
                minLength={8}
                required
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500/35 focus-visible:outline-none"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button className="h-14 w-full text-lg" type="submit" disabled={submitting}>
            {submitting ? (
              <><LoaderCircle className="size-5 animate-spin" /> Đang xác thực…</>
            ) : (
              <>Đăng nhập an toàn <ArrowRight className="size-5" /></>
            )}
          </Button>
        </form>

        <div className="mt-7 flex gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-base leading-7 text-slate-600">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-700" />
          <span>Phiên đăng nhập được bảo vệ bằng cookie HttpOnly và quyền truy cập được kiểm tra lại tại máy chủ.</span>
        </div>
      </CardContent>
    </Card>
  );
}

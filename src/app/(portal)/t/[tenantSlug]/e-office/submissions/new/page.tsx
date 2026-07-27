'use client';

import { ArrowLeft, FilePlus2, LoaderCircle, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, ApiError } from '@/lib/api';
import { tenantPath } from '@/lib/navigation';
import { Submission } from '@/types/e-office';

export default function NewSubmissionPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const dueAt = String(data.get('dueAt') ?? '');
    try {
      const submission = await apiRequest<Submission>(
        '/e-office/submissions',
        {
          method: 'POST',
          body: JSON.stringify({
            title: String(data.get('title') ?? ''),
            summary: String(data.get('summary') ?? ''),
            documentType: String(data.get('documentType') ?? ''),
            priority: String(data.get('priority') ?? 'normal'),
            ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
          }),
        },
      );
      router.push(
        tenantPath(
          tenantSlug,
          `/e-office/submissions/${submission.id}`,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể tạo hồ sơ.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="E-Office · Soạn thảo"
        title="Tạo hồ sơ trình ký"
        description="Nhập thông tin nghiệp vụ cơ bản. Hồ sơ được lưu ở trạng thái nháp trước khi chọn người duyệt."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link
              href={tenantPath(
                tenantSlug,
                '/e-office/submissions',
              )}
            >
              <ArrowLeft size={17} /> Quay lại
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <Card className="gap-0 rounded-xl border-[#DDE5DC]">
          <CardHeader className="border-b border-[#E4EAE2] px-5 py-4">
            <h2 className="font-display text-lg font-bold">
              Thông tin hồ sơ
            </h2>
            <p className="text-sm text-[#667067]">
              Các trường có dấu * là bắt buộc.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 px-5 py-5">
            {error && (
              <div className="rounded-xl border border-[#E7B5B3] bg-[#FCECEB] px-4 py-3 text-sm font-bold text-[#A83836]">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">Tiêu đề hồ sơ *</Label>
              <Input
                id="title"
                name="title"
                minLength={5}
                maxLength={220}
                placeholder="Ví dụ: Đề nghị phê duyệt kế hoạch bảo trì..."
                required
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="documentType">Loại văn bản *</Label>
                <NativeSelect
                  id="documentType"
                  name="documentType"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Chọn loại văn bản
                  </option>
                  <option value="Tờ trình">Tờ trình</option>
                  <option value="Đề nghị">Đề nghị</option>
                  <option value="Kế hoạch">Kế hoạch</option>
                  <option value="Biên bản">Biên bản</option>
                  <option value="Văn bản khác">Văn bản khác</option>
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Mức độ ưu tiên</Label>
                <NativeSelect
                  id="priority"
                  name="priority"
                  defaultValue="normal"
                >
                  <option value="normal">Bình thường</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn</option>
                </NativeSelect>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueAt">Hạn xử lý dự kiến</Label>
              <Input id="dueAt" name="dueAt" type="datetime-local" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="summary">Nội dung tóm tắt</Label>
              <Textarea
                id="summary"
                name="summary"
                maxLength={4000}
                placeholder="Mô tả mục tiêu, căn cứ và nội dung cần phê duyệt."
                className="min-h-40"
              />
            </div>
            <div className="flex justify-end border-t border-[#E8EDE6] pt-5">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <LoaderCircle className="animate-spin" size={17} /> Đang lưu…
                  </>
                ) : (
                  <>
                    <Save size={17} /> Lưu bản nháp
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit gap-0 rounded-xl border-[#DDE5DC] bg-[#F0F5EE] shadow-none">
          <CardContent className="px-5 py-5">
            <span className="mb-4 grid size-11 place-items-center rounded-xl bg-white text-[#386948] shadow-sm">
              <FilePlus2 size={21} />
            </span>
            <h2 className="font-display text-lg font-bold">
              Sau khi lưu bản nháp
            </h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-[#59615A]">
              <li>1. Kiểm tra lại nội dung hồ sơ.</li>
              <li>2. Chọn người duyệt thuộc doanh nghiệp.</li>
              <li>3. Gửi hồ sơ vào luồng phê duyệt.</li>
              <li>4. Tạo yêu cầu ký số sau khi được duyệt.</li>
            </ol>
          </CardContent>
        </Card>
      </form>
    </>
  );
}

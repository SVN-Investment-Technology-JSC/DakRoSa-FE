'use client';

import {
  ArrowLeft,
  Check,
  FileCheck2,
  LoaderCircle,
  RotateCcw,
  Send,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  SubmissionPriorityBadge,
  SubmissionStatusBadge,
  statusLabels,
} from '@/components/e-office/submission-badges';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatDateTime } from '@/lib/format';
import { PERMISSIONS, tenantPath } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/services/service-error';
import { eOfficeService } from '@/services/e-office.service';
import { signaturesService } from '@/services/signatures.service';
import type {
  Reviewer,
  Submission,
  SubmissionAction,
} from '@/types/e-office';

const actionLabels: Record<string, string> = {
  create: 'Tạo hồ sơ',
  submit: 'Gửi phê duyệt',
  approve: 'Phê duyệt',
  return: 'Trả lại',
  cancel: 'Hủy hồ sơ',
};

export function SubmissionDetailPage({ tenantSlug, submissionId: id }: { tenantSlug: string; submissionId: string }) {
  const { user } = useAuth();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchDetail = useCallback(
    () =>
      Promise.all([
        eOfficeService.getSubmission(id),
        hasPermission(user, PERMISSIONS.SUBMISSIONS_SUBMIT)
          ? eOfficeService.getReviewers()
          : Promise.resolve([]),
      ]),
    [id, user],
  );

  const applyDetail = useCallback(
    (detail: Submission, reviewerList: Reviewer[]) => {
      setSubmission(detail);
      setReviewers(reviewerList);
      setReviewerId(
        detail.currentAssigneeId ?? reviewerList[0]?.id ?? '',
      );
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const [detail, reviewerList] = await fetchDetail();
      applyDetail(detail, reviewerList);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể tải chi tiết hồ sơ.',
      );
    } finally {
      setLoading(false);
    }
  }, [applyDetail, fetchDetail]);

  useEffect(() => {
    let active = true;
    void fetchDetail()
      .then(([detail, reviewerList]) => {
        if (active) applyDetail(detail, reviewerList);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : 'Không thể tải chi tiết hồ sơ.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyDetail, fetchDetail]);

  const runAction = async (
    action: string,
    request: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setPendingAction(action);
    setError('');
    setMessage('');
    try {
      await request();
      setNote('');
      setMessage(successMessage);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể thực hiện thao tác.',
      );
    } finally {
      setPendingAction('');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-5">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[480px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="rounded-xl border border-[#E7B5B3] bg-[#FCECEB] p-5 text-sm font-bold text-[#A83836]">
        {error || 'Không tìm thấy hồ sơ.'}
      </div>
    );
  }

  const editableByCurrentUser =
    submission.requesterId === user?.id &&
    ['draft', 'returned'].includes(submission.status);
  const reviewableByCurrentUser =
    submission.status === 'in_review' &&
    (submission.currentAssigneeId === user?.id ||
      user?.roleCodes.includes('admin')) &&
    hasPermission(user, PERMISSIONS.SUBMISSIONS_REVIEW);

  return (
    <>
      <PageHeading
        eyebrow={`${submission.documentType} · ${submission.code}`}
        title={submission.title}
        description={`Tạo bởi ${submission.requester.displayName} · Cập nhật ${formatDateTime(submission.updatedAt)}`}
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link
              href={tenantPath(
                tenantSlug,
                '/e-office/submissions',
              )}
            >
              <ArrowLeft size={17} /> Danh sách
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-[#E7B5B3] bg-[#FCECEB] px-4 py-3 text-sm font-bold text-[#A83836]">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-xl border border-[#B9EFC5] bg-[#EAF7EC] px-4 py-3 text-sm font-bold text-[#2B6A3F]">
          {message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Card className="gap-0 rounded-xl border-[#DDE5DC]">
            <CardHeader className="flex grid-cols-none flex-row flex-wrap items-center gap-2 border-b border-[#E4EAE2] px-5 py-4">
              <SubmissionStatusBadge status={submission.status} />
              <SubmissionPriorityBadge priority={submission.priority} />
              <span className="ml-auto text-xs font-bold text-[#758077]">
                Phiên bản luồng {submission.workflowVersion}
              </span>
            </CardHeader>
            <CardContent className="grid gap-5 px-5 py-5">
              <div>
                <span className="text-xs font-black tracking-[0.08em] text-[#758077] uppercase">
                  Nội dung tóm tắt
                </span>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#3F4941]">
                  {submission.summary || 'Chưa có nội dung tóm tắt.'}
                </p>
              </div>
              <dl className="grid gap-4 border-t border-[#E8EDE6] pt-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold text-[#758077]">
                    Người trình
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {submission.requester.displayName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-[#758077]">
                    Người xử lý hiện tại
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {submission.currentAssignee?.displayName ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-[#758077]">
                    Hạn xử lý
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {formatDate(submission.dueAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-xl border-[#DDE5DC]">
            <CardHeader className="border-b border-[#E4EAE2] px-5 py-4">
              <h2 className="font-display text-lg font-bold">
                Lịch sử xử lý
              </h2>
              <p className="text-sm text-[#667067]">
                Dấu vết không thể chỉnh sửa của các bước trong hồ sơ.
              </p>
            </CardHeader>
            <CardContent className="px-5 py-5">
              <ol className="grid gap-0">
                {(submission.actions ?? []).map(
                  (action: SubmissionAction, index, actions) => (
                    <li
                      key={action.id}
                      className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
                    >
                      {index < actions.length - 1 && (
                        <span className="absolute top-8 bottom-0 left-[17px] w-px bg-[#DDE5DC]" />
                      )}
                      <span className="relative z-10 grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <Check size={16} />
                      </span>
                      <div className="pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm">
                            {actionLabels[action.action] ?? action.action}
                          </strong>
                          <span className="text-xs text-[#758077]">
                            {formatDateTime(action.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#667067]">
                          {action.actor.displayName} ·{' '}
                          {statusLabels[action.toStatus]}
                        </p>
                        {action.note && (
                          <p className="mt-2 rounded-lg bg-[#F3F6F1] px-3 py-2 text-sm leading-6 text-[#4E584F]">
                            {action.note}
                          </p>
                        )}
                      </div>
                    </li>
                  ),
                )}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="grid h-fit gap-5">
          {editableByCurrentUser &&
            hasPermission(user, PERMISSIONS.SUBMISSIONS_SUBMIT) && (
              <Card className="gap-0 rounded-xl border-[#C9D9C7]">
                <CardHeader className="border-b border-[#E4EAE2] px-5 py-4">
                  <h2 className="font-display text-lg font-bold">
                    Gửi phê duyệt
                  </h2>
                  <p className="text-sm text-[#667067]">
                    Chọn một người có quyền duyệt trong doanh nghiệp.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-4 px-5 py-5">
                  <div className="grid gap-2">
                    <Label htmlFor="reviewer">Người duyệt</Label>
                    <Select value={reviewerId || undefined} onValueChange={setReviewerId} disabled={!reviewers.length}>
                      <SelectTrigger id="reviewer" className="w-full"><SelectValue placeholder={reviewers.length ? 'Chọn người duyệt' : 'Chưa có người duyệt phù hợp'} /></SelectTrigger>
                      <SelectContent position="popper">
                        {reviewers.map((reviewer) => (
                          <SelectItem key={reviewer.id} value={reviewer.id}>
                            {reviewer.displayName} (@{reviewer.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="submit-note">Ghi chú</Label>
                    <Textarea
                      id="submit-note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="min-h-24"
                      placeholder="Thông tin cần lưu ý cho người duyệt"
                    />
                  </div>
                  <Button
                    disabled={!reviewerId || Boolean(pendingAction)}
                    onClick={() =>
                      void runAction(
                        'submit',
                        () => eOfficeService.submitForReview(submission.id, reviewerId, note),
                        'Hồ sơ đã được gửi phê duyệt.',
                      )
                    }
                  >
                    {pendingAction === 'submit' ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <Send size={17} />
                    )}
                    Gửi người duyệt
                  </Button>
                </CardContent>
              </Card>
            )}

          {reviewableByCurrentUser && (
            <Card className="gap-0 rounded-xl border-[#C9D9C7]">
              <CardHeader className="border-b border-[#E4EAE2] px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <UserRound size={19} />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold">
                      Quyết định phê duyệt
                    </h2>
                    <p className="text-sm text-[#667067]">
                      Ghi chú bắt buộc khi trả lại.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 px-5 py-5">
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-28"
                  placeholder="Ý kiến của người duyệt"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    disabled={Boolean(pendingAction)}
                    onClick={() =>
                      void runAction(
                        'return',
                        () => eOfficeService.review(submission.id, 'return', note),
                        'Hồ sơ đã được trả lại người trình.',
                      )
                    }
                  >
                    {pendingAction === 'return' ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <RotateCcw size={17} />
                    )}
                    Trả lại
                  </Button>
                  <Button
                    disabled={Boolean(pendingAction)}
                    onClick={() =>
                      void runAction(
                        'approve',
                        () => eOfficeService.review(submission.id, 'approve', note),
                        'Hồ sơ đã được phê duyệt.',
                      )
                    }
                  >
                    {pendingAction === 'approve' ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <Check size={17} />
                    )}
                    Phê duyệt
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {submission.status === 'approved' &&
            hasPermission(user, PERMISSIONS.SIGNATURES_REQUEST) && (
              <Card className="gap-0 rounded-xl border-0 bg-primary text-white">
                <CardContent className="grid gap-4 px-5 py-5">
                  <span className="grid size-11 place-items-center rounded-xl bg-white/12 text-[#B9EFC5]">
                    <FileCheck2 size={21} />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold">
                      Chuyển ký số
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-white/70">
                      Tạo yêu cầu trong hàng đợi trung lập nhà cung cấp.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={Boolean(pendingAction)}
                    onClick={() =>
                      void runAction(
                        'signature',
                        () => signaturesService.createRequest(submission.id),
                        'Đã tạo yêu cầu ký số.',
                      )
                    }
                  >
                    {pendingAction === 'signature' ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <FileCheck2 size={17} />
                    )}
                    Tạo yêu cầu ký số
                  </Button>
                </CardContent>
              </Card>
            )}
        </aside>
      </div>
    </>
  );
}

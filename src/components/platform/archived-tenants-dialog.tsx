'use client';

import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TenantTableSkeleton } from '@/components/platform/tenant-table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchArchivedTenants,
  permanentlyDeletePlatformTenant,
  restorePlatformTenant,
} from '@/store/platform-tenants.slice';
import type { PlatformTenant } from '@/types/platform-tenancy';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ArchivedTenantsDialog() {
  const dispatch = useAppDispatch();
  const { archived, archivedStatus, archivedError } = useAppSelector(
    (state) => state.platformTenants,
  );
  const [open, setOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permanentTenantId, setPermanentTenantId] = useState<string | null>(null);
  const [permanentConfirmation, setPermanentConfirmation] = useState('');
  const [permanentlyDeletingId, setPermanentlyDeletingId] =
    useState<string | null>(null);

  const permanentTenant =
    archived.find((tenant) => tenant.id === permanentTenantId) ?? null;
  const confirmationValid =
    Boolean(permanentTenant) &&
    (permanentConfirmation === permanentTenant?.code ||
      permanentConfirmation === permanentTenant?.name);

  useEffect(() => {
    if (archivedError) toast.error(archivedError);
  }, [archivedError]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) void dispatch(fetchArchivedTenants({}));
  };

  const handleRestore = async (tenant: PlatformTenant) => {
    if (restoringId) return;
    setRestoringId(tenant.id);
    try {
      await dispatch(restorePlatformTenant(tenant.id)).unwrap();
      toast.success(`Đã khôi phục doanh nghiệp ${tenant.shortName}.`);
    } catch (error) {
      toast.error(errorMessage(error, 'Không thể khôi phục doanh nghiệp.'));
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentTenant || !confirmationValid || permanentlyDeletingId) return;

    setPermanentlyDeletingId(permanentTenant.id);
    try {
      await dispatch(
        permanentlyDeletePlatformTenant({
          id: permanentTenant.id,
          confirmation: permanentConfirmation,
        }),
      ).unwrap();
      toast.success('Đã xóa vĩnh viễn doanh nghiệp và dữ liệu liên quan.');
      closePermanentDialog();
    } catch (error) {
      toast.error(errorMessage(error, 'Không thể xóa vĩnh viễn doanh nghiệp.'));
    } finally {
      setPermanentlyDeletingId(null);
    }
  };

  const closePermanentDialog = () => {
    setPermanentTenantId(null);
    setPermanentConfirmation('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <Archive />
            Doanh nghiệp đã lưu trữ
            {archivedStatus === 'succeeded' && (
              <Badge variant="secondary">{archived.length}</Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Doanh nghiệp đã lưu trữ</DialogTitle>
            <DialogDescription>
              Khôi phục doanh nghiệp để tiếp tục sử dụng hoặc xóa vĩnh viễn sau
              khi xác nhận chính xác mã hoặc tên.
            </DialogDescription>
          </DialogHeader>

          {archivedStatus === 'idle' || archivedStatus === 'loading' ? (
            <TenantTableSkeleton rows={4} />
          ) : archived.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Archive />
                </EmptyMedia>
                <EmptyTitle>Chưa có doanh nghiệp lưu trữ</EmptyTitle>
                <EmptyDescription>
                  Các doanh nghiệp đã lưu trữ sẽ xuất hiện tại đây.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doanh nghiệp</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Quy mô</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archived.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <strong className="block">{tenant.name}</strong>
                        <span className="text-xs text-muted-foreground">
                          {tenant.shortName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tenant.code}</Badge>
                      </TableCell>
                      <TableCell>
                        {tenant.siteCount ?? 0} địa điểm ·{' '}
                        {tenant.memberCount ?? 0} người dùng
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={restoringId === tenant.id}
                            onClick={() => void handleRestore(tenant)}
                          >
                            <RotateCcw />
                            {restoringId === tenant.id
                              ? 'Đang khôi phục…'
                              : 'Khôi phục'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setPermanentTenantId(tenant.id);
                              setPermanentConfirmation('');
                            }}
                          >
                            <Trash2 />
                            Xóa vĩnh viễn
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(permanentTenant)}
        onOpenChange={(nextOpen) => !nextOpen && closePermanentDialog()}
      >
        {permanentTenant && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xóa vĩnh viễn doanh nghiệp</DialogTitle>
              <DialogDescription>
                Thao tác này không thể hoàn tác và chỉ áp dụng cho doanh nghiệp
                đã lưu trữ.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm">
              <strong className="block text-base">{permanentTenant.name}</strong>
              <span className="mt-1 block">
                Mã doanh nghiệp: <code>{permanentTenant.code}</code>
              </span>
              <span className="block">
                Tên doanh nghiệp: <code>{permanentTenant.name}</code>
              </span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="permanent-confirmation">
                Nhập chính xác mã hoặc tên doanh nghiệp hiển thị ở trên
              </Label>
              <Input
                id="permanent-confirmation"
                value={permanentConfirmation}
                onChange={(event) =>
                  setPermanentConfirmation(event.target.value)
                }
                placeholder={permanentTenant.code}
                disabled={permanentlyDeletingId === permanentTenant.id}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closePermanentDialog}>
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  !confirmationValid ||
                  permanentlyDeletingId === permanentTenant.id
                }
                onClick={() => void handlePermanentDelete()}
              >
                <Trash2 />
                {permanentlyDeletingId === permanentTenant.id
                  ? 'Đang xóa…'
                  : 'Xóa vĩnh viễn'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

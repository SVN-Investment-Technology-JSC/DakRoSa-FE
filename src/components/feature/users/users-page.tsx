'use client';

import { Eye, EyeOff, KeyRound, Pencil, Plus, Save, Search, Trash2, UserPlus, UserRoundCheck, UserRoundX, UsersRound } from 'lucide-react';
import { Popconfirm } from 'antd';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PERMISSIONS } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/services/service-error';
import { usersService } from '@/services/users.service';
import type { Role } from '@/types/rbac';
import type { UserListResponse, UserRecord } from '@/types/user';

const notify = ({ tone, message }: { tone: 'success' | 'error'; message: string }) => {
  if (tone === 'success') toast.success(message);
  else toast.error(message);
};

const getLocalDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const getInitialCreate = () => ({
  username: '',
  displayName: '',
  shortName: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  roleIds: [] as string[],
  joinedAt: getLocalDate(),
  workShift: '',
});

const getInitialEdit = () => ({
  displayName: '',
  shortName: '',
  email: '',
  phone: '',
  address: '',
  joinedAt: getLocalDate(),
  workShift: '',
  isActive: true,
  roleIds: [] as string[],
});
const emptyResult: UserListResponse = { items: [], total: 0, page: 1, limit: 20 };
const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

interface DialogState {
  mode: 'create' | 'edit' | 'reset' | null;
  selected: UserRecord | null;
  createForm: ReturnType<typeof getInitialCreate>;
  editForm: ReturnType<typeof getInitialEdit>;
  newPassword: string;
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<{ result: UserListResponse; roles: Role[] }>({ result: emptyResult, roles: [] });
  const { result, roles } = data;
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const setNotice = notify;
  const [dialogState, setDialogState] = useState<DialogState>({
    mode: null,
    selected: null,
    createForm: getInitialCreate(),
    editForm: getInitialEdit(),
    newPassword: '',
  });
  const { mode: dialog, selected, createForm, editForm, newPassword } = dialogState;
  const editingOwnAccount = selected?.id === currentUser?.id;
  const [submitting, setSubmitting] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({ create: false, edit: false, reset: false });
  const loadAssignableRoles = useCallback(async () => {
    const assignableRoles = await usersService.getAssignableRoles();
    setData((state) => ({ ...state, roles: assignableRoles }));
  }, []);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const [users, assignableRoles] = await Promise.all([
        usersService.getUsers(term),
        usersService.getAssignableRoles(),
      ]);
      setData({ result: users, roles: assignableRoles });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải người dùng.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      usersService.getUsers(),
      usersService.getAssignableRoles(),
    ])
      .then(([users, assignableRoles]) => {
        if (!active) return;
        setData({ result: users, roles: assignableRoles });
      })
      .catch((error) => {
        if (!active) return;
        setNotice({ tone: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải người dùng.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.activeTenant.id]);

  const showError = (error: unknown) =>
    setNotice({ tone: 'error', message: error instanceof ApiError ? error.message : 'Thao tác không thành công.' });

  const openCreate = () => {
    setVisiblePasswords((state) => ({ ...state, create: false }));
    setDialogState({ mode: 'create', selected: null, createForm: getInitialCreate(), editForm: getInitialEdit(), newPassword: '' });
    void loadAssignableRoles().catch(showError);
  };

  const openEdit = (item: UserRecord) => {
    void loadAssignableRoles().catch(showError);
    setDialogState({
      mode: 'edit',
      selected: item,
      createForm: getInitialCreate(),
      editForm: {
        displayName: item.displayName,
        shortName: item.shortName ?? '',
        email: item.email,
        phone: item.phone,
        address: item.address ?? '',
        joinedAt: item.joinedAt,
        workShift: item.workShift ?? '',
        isActive: item.isActive,
        roleIds: item.roles.map((role) => role.id),
      },
      newPassword: '',
    });
    setVisiblePasswords((state) => ({ ...state, edit: false }));
  };

  const openReset = (item: UserRecord) => {
    setVisiblePasswords((state) => ({ ...state, reset: false }));
    setDialogState({ mode: 'reset', selected: item, createForm: getInitialCreate(), editForm: getInitialEdit(), newPassword: '' });
  };

  const closeDialog = () => setDialogState((state) => ({ ...state, mode: null }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await usersService.createUser(createForm);
      closeDialog();
      setNotice({ tone: 'success', message: 'Đã tạo tài khoản mới.' });
      await load(search);
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const payload = {
        ...editForm,
        roleIds: editingOwnAccount ? undefined : editForm.roleIds,
      };
      await usersService.updateUser(selected.id, payload);
      if (newPassword) {
        await usersService.resetPassword(selected.id, newPassword);
      }
      closeDialog();
      setNotice({ tone: 'success', message: 'Đã cập nhật người dùng.' });
      await load(search);
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await usersService.resetPassword(selected.id, newPassword);
      closeDialog();
      setNotice({ tone: 'success', message: `Đã đặt lại mật khẩu cho @${selected.username}. Các phiên cũ đã bị thu hồi.` });
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item: UserRecord) => {
    try {
      await usersService.deleteUser(item.id);
      setNotice({ tone: 'success', message: 'Đã xóa tài khoản.' });
      await load(search);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="Quản trị truy cập"
        title="Người dùng hệ thống"
        description="Cấp tài khoản, gán vai trò và kiểm soát trạng thái truy cập trong doanh nghiệp đang chọn. Mật khẩu chỉ được nhận ở biểu mẫu và không xuất hiện trong log."
        actions={hasPermission(currentUser, PERMISSIONS.USERS_CREATE) ? <Button onClick={openCreate}><Plus size={16} /> Tạo người dùng</Button> : undefined}
      />
      <form className="toolbar" onSubmit={(event) => { event.preventDefault(); void load(search); }}>
        <div className="search-box">
          <Search size={16} />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, tài khoản, email hoặc số điện thoại…" />
        </div>
        <Button variant="secondary" type="submit">Tìm kiếm</Button>
      </form>
      <section className="panel data-panel">
        {loading ? (
          <div className="empty-state"><UsersRound size={38} /><strong>Đang tải danh sách…</strong></div>
        ) : result.items.length === 0 ? (
          <div className="empty-state"><UsersRound size={38} /><strong>Chưa có người dùng phù hợp</strong><p>Thử từ khóa khác hoặc tạo tài khoản mới.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Lần đăng nhập cuối</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr></thead>
            <tbody>
              {result.items.map((item) => {
                const protectedPlatformAdmin = item.isPlatformAdmin;
                return (
                  <tr key={item.id}>
                    <td><span className="cell-main">{item.displayName}</span><span className="cell-sub">@{item.username}</span></td>
                    <td><div className="role-chips">{item.roles.length ? item.roles.map((role) => <span className="role-chip" key={role.id}>{role.name}</span>) : <span className="cell-sub">Chưa gán vai trò</span>}</div></td>
                    <td><span className={`status-badge ${item.isActive ? 'status-active' : 'status-inactive'}`}>{item.isActive ? 'Hoạt động' : 'Đã khóa'}</span></td>
                    <td>{item.lastLoginAt ? dateTimeFormatter.format(new Date(item.lastLoginAt)) : <span className="cell-sub">Chưa đăng nhập</span>}</td>
                    <td>
                      <div className="table-actions">
                        {hasPermission(currentUser, PERMISSIONS.USERS_UPDATE) && !protectedPlatformAdmin && <Button type="button" variant="ghost" size="icon" className="table-action" onClick={() => openEdit(item)} aria-label={`Sửa ${item.username}`}>{item.isActive ? <Pencil size={15} /> : <UserRoundCheck size={15} />}</Button>}
                        {hasPermission(currentUser, PERMISSIONS.USERS_RESET_PASSWORD) && !protectedPlatformAdmin && item.id !== currentUser?.id && <Button type="button" variant="ghost" size="icon" className="table-action" onClick={() => openReset(item)} aria-label={`Đặt lại mật khẩu ${item.username}`}><KeyRound size={15} /></Button>}
                        {hasPermission(currentUser, PERMISSIONS.USERS_DELETE) && !protectedPlatformAdmin && item.id !== currentUser?.id && (
                          <Popconfirm title="Xóa người dùng?" description={`Tài khoản @${item.username} sẽ bị xóa và không thể hoàn tác.`} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => void remove(item)}>
                            <Button type="button" variant="ghost" size="icon" className="table-action table-action-danger" aria-label={`Xóa ${item.username}`}><Trash2 size={15} /></Button>
                          </Popconfirm>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="pagination-bar"><span>{result.total} người dùng</span><span>Hiển thị tối đa {result.limit} bản ghi</span></div>
      </section>

      <Dialog open={dialog === 'create'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tạo người dùng mới</DialogTitle>
            <DialogDescription>Nhập thông tin tài khoản và thông tin làm việc.</DialogDescription>
          </DialogHeader>
        <form onSubmit={submitCreate}>
          <div className="modal-body user-form-body">
            <section className="user-form-section">
              <h3>Thông tin cá nhân</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="create-display-name">Họ tên <span className="required-mark">*</span></label>
                  <Input id="create-display-name" value={createForm.displayName} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, displayName: event.target.value } }))} placeholder="VD: Nguyễn Văn A" minLength={2} required />
                </div>
                <div className="form-field">
                  <label htmlFor="create-short-name">Tên viết tắt <span className="optional-mark">(tùy chọn)</span></label>
                  <Input id="create-short-name" value={createForm.shortName} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, shortName: event.target.value } }))} placeholder="VD: A, Văn A" maxLength={80} />
                </div>
                <div className="form-field">
                  <label htmlFor="create-email">Email <span className="required-mark">*</span></label>
                  <Input id="create-email" type="email" autoComplete="email" value={createForm.email} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, email: event.target.value } }))} placeholder="example@email.com" required />
                </div>
                <div className="form-field">
                  <label htmlFor="create-phone">Số điện thoại <span className="required-mark">*</span></label>
                  <Input id="create-phone" type="tel" autoComplete="tel" value={createForm.phone} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, phone: event.target.value } }))} placeholder="0123456789" pattern="[0-9+().\s-]{7,30}" required />
                </div>
                <div className="form-field form-field-full">
                  <label htmlFor="create-address">Địa chỉ <span className="optional-mark">(tùy chọn)</span></label>
                  <Textarea id="create-address" className="user-address" value={createForm.address} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, address: event.target.value } }))} placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM" maxLength={500} />
                </div>
              </div>
            </section>
            <section className="user-form-section">
              <h3>Thông tin tài khoản</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="create-username">Tên đăng nhập <span className="required-mark">*</span></label>
                  <Input id="create-username" autoComplete="username" value={createForm.username} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, username: event.target.value } }))} placeholder="VD: nguyenvana" minLength={3} pattern="[a-zA-Z0-9._-]+" required />
                </div>
                <div className="form-field">
                  <label htmlFor="create-password">Mật khẩu <span className="required-mark">*</span></label>
                  <div className="password-control">
                    <Input id="create-password" type={visiblePasswords.create ? 'text' : 'password'} autoComplete="new-password" value={createForm.password} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, password: event.target.value } }))} placeholder="Tối thiểu 12 ký tự" minLength={12} required />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setVisiblePasswords((state) => ({ ...state, create: !state.create }))} aria-label={visiblePasswords.create ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visiblePasswords.create ? <EyeOff size={17} /> : <Eye size={17} />}</Button>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="create-role">Vai trò <span className="required-mark">*</span></label>
                  <Select value={createForm.roleIds[0] ?? undefined} onValueChange={(value) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, roleIds: [value] } }))}>
                    <SelectTrigger id="create-role" className="w-full"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                    <SelectContent position="popper">{roles.map((role) => <SelectItem value={role.id} key={role.id}>{role.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <label htmlFor="create-joined-at">Ngày vào làm <span className="required-mark">*</span></label>
                  <Input id="create-joined-at" type="date" value={createForm.joinedAt} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, joinedAt: event.target.value } }))} required />
                </div>
                <div className="form-field">
                  <label htmlFor="create-work-shift">Ca làm việc <span className="optional-mark">(tùy chọn)</span></label>
                  <Input id="create-work-shift" value={createForm.workShift} onChange={(event) => setDialogState((state) => ({ ...state, createForm: { ...state.createForm, workShift: event.target.value } }))} placeholder="Nhập ca làm việc" maxLength={100} />
                </div>
              </div>
            </section>
          </div>
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Hủy</Button></DialogClose><Button type="submit" disabled={submitting}><UserPlus size={17} />{submitting ? 'Đang thêm…' : 'Thêm người dùng'}</Button></DialogFooter>
        </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'edit'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>Cập nhật thông tin tài khoản và thông tin làm việc.</DialogDescription>
          </DialogHeader>
        <form onSubmit={submitEdit}>
          <div className="modal-body user-form-body">
            <section className="user-form-section">
              <h3>Thông tin cá nhân</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="edit-display-name">Họ tên <span className="required-mark">*</span></label>
                  <Input id="edit-display-name" value={editForm.displayName} onChange={(event) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, displayName: event.target.value } }))} minLength={2} required />
                </div>
                <div className="form-field">
                  <label htmlFor="edit-short-name">Tên viết tắt <span className="optional-mark">(tùy chọn)</span></label>
                  <Input id="edit-short-name" value={editForm.shortName} onChange={(event) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, shortName: event.target.value } }))} maxLength={80} />
                </div>
                <div className="form-field">
                  <label htmlFor="edit-email">Email <span className="required-mark">*</span></label>
                  <Input id="edit-email" type="email" autoComplete="email" value={editForm.email} onChange={(event) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, email: event.target.value } }))} required />
                </div>
                <div className="form-field">
                  <label htmlFor="edit-phone">Số điện thoại <span className="required-mark">*</span></label>
                  <Input id="edit-phone" type="tel" autoComplete="tel" value={editForm.phone} onChange={(event) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, phone: event.target.value } }))} pattern="[0-9+().\s-]{7,30}" required />
                </div>
                <div className="form-field form-field-full">
                  <label htmlFor="edit-address">Địa chỉ <span className="optional-mark">(tùy chọn)</span></label>
                  <Textarea id="edit-address" className="user-address" value={editForm.address} onChange={(event) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, address: event.target.value } }))} maxLength={500} />
                </div>
              </div>
            </section>
            <section className="user-form-section">
              <h3>Thông tin tài khoản</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="edit-username">Tên đăng nhập <span className="required-mark">*</span></label>
                  <Input id="edit-username" value={selected?.username ?? ''} disabled />
                </div>
                {hasPermission(currentUser, PERMISSIONS.USERS_RESET_PASSWORD) && (
                  <div className="form-field">
                    <label htmlFor="edit-password">Mật khẩu mới <span className="optional-mark">(tùy chọn)</span></label>
                    <div className="password-control">
                      <Input id="edit-password" type={visiblePasswords.edit ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => setDialogState((state) => ({ ...state, newPassword: event.target.value }))} placeholder="Để trống nếu không đổi" minLength={12} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setVisiblePasswords((state) => ({ ...state, edit: !state.edit }))} aria-label={visiblePasswords.edit ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visiblePasswords.edit ? <EyeOff size={17} /> : <Eye size={17} />}</Button>
                    </div>
                  </div>
                )}
                <div className="form-field">
                  <label htmlFor="edit-role">Vai trò <span className="required-mark">*</span></label>
                  <Select value={editForm.roleIds[0] ?? undefined} onValueChange={(value) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, roleIds: [value] } }))} disabled={editingOwnAccount}>
                    <SelectTrigger id="edit-role" className="w-full"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                    <SelectContent position="popper">{roles.map((role) => <SelectItem value={role.id} key={role.id}>{role.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {editingOwnAccount && <small className="form-hint">Bạn không thể tự thay đổi vai trò của chính mình.</small>}
                </div>
                <div className="form-field">
                  <label htmlFor="edit-joined-at">Ngày vào làm <span className="required-mark">*</span></label>
                  <Input id="edit-joined-at" type="date" value={editForm.joinedAt} onChange={(event) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, joinedAt: event.target.value } }))} required />
                </div>
                <div className="form-field">
                  <label htmlFor="edit-work-shift">Ca làm việc <span className="optional-mark">(tùy chọn)</span></label>
                  <Input id="edit-work-shift" value={editForm.workShift} onChange={(event) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, workShift: event.target.value } }))} placeholder="Nhập ca làm việc" maxLength={100} />
                </div>
                <label className="permission-check user-active-toggle"><Checkbox checked={editForm.isActive} onCheckedChange={(checked) => setDialogState((state) => ({ ...state, editForm: { ...state.editForm, isActive: checked === true } }))} />{editForm.isActive ? <UserRoundCheck size={17} /> : <UserRoundX size={17} />} Cho phép người dùng đăng nhập</label>
              </div>
            </section>
          </div>
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Hủy</Button></DialogClose><Button type="submit" className="edit-submit-button" disabled={submitting}><Save size={17} />{submitting ? 'Đang lưu…' : 'Lưu'}</Button></DialogFooter>
        </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'reset'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Đặt lại mật khẩu</DialogTitle><DialogDescription>{`Tạo mật khẩu mới cho @${selected?.username ?? ''}. Tất cả phiên đang đăng nhập sẽ bị thu hồi.`}</DialogDescription></DialogHeader>
        <form onSubmit={submitReset}>
          <div className="modal-body"><div className="form-field"><label htmlFor="reset-password">Mật khẩu mới</label><Input id="reset-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setDialogState((state) => ({ ...state, newPassword: event.target.value }))} minLength={12} required /><small>Tối thiểu 12 ký tự; không có bước buộc đổi mật khẩu sau đó.</small></div></div>
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Hủy</Button></DialogClose><Button type="submit" disabled={submitting}>{submitting ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}</Button></DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

import React, { useMemo, useState } from 'react';
import { ApiOrgUnitTreeNode } from '../../api/orgUnits';
import { useUpdateOrgUnit } from '../../hooks/useOrgUnits';
import {
  useAddOrgUnitMember,
  useOrgUnitMembers,
  usePositions,
  useRemoveOrgUnitMember,
} from '../../hooks/usePositions';
import { useCreateUser, useUsers } from '../../hooks/useUsers';

interface UnitPeopleModalProps {
  unit: ApiOrgUnitTreeNode;
  onClose: () => void;
}

function errorText(error: unknown): string {
  const e = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = e?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return message ?? e?.message ?? 'Có lỗi xảy ra.';
}

function initialsOf(fullName: string, fallback?: string): string {
  if (fallback) return fallback;
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

const Avatar: React.FC<{ name: string; initials?: string; tone?: 'blue' | 'slate' }> = ({
  name,
  initials,
  tone = 'slate',
}) => (
  <div
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
      tone === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
    }`}
  >
    {initialsOf(name, initials)}
  </div>
);

/**
 * Quản lý con người của MỘT đơn vị: ai là trưởng, và ai làm việc ở đó.
 *
 * Hai việc này tách riêng có chủ ý, vì hệ thống đối xử với chúng khác nhau:
 * `org_units.head_user_id` là người nhận vai trò khi ma trận gán cho cả đơn vị,
 * còn `org_unit_members` là danh sách để phân rã việc xuống và để chữ S lan tới
 * cả đơn vị. Một người có thể vừa là trưởng vừa nằm trong danh sách.
 */
export const UnitPeopleModal: React.FC<UnitPeopleModalProps> = ({ unit, onClose }) => {
  const { data: members, isLoading: loadingMembers } = useOrgUnitMembers(unit.id);
  const { data: positions } = usePositions();
  const [userSearch, setUserSearch] = useState('');
  const { data: users, isLoading: loadingUsers } = useUsers(userSearch);

  const updateUnit = useUpdateOrgUnit();
  const addMember = useAddOrgUnitMember();
  const removeMember = useRemoveOrgUnitMember(unit.id);
  const createUser = useCreateUser();

  const [addUserId, setAddUserId] = useState('');
  const [addPositionId, setAddPositionId] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const defaultPositionId = positions?.[0]?.id ?? '';
  const effectivePositionId = addPositionId || defaultPositionId;

  // Người đã có trong danh sách thì không mời thêm lần nữa — backend cũng chặn
  // trùng (đơn vị, người, chức vụ), nhưng để lộ ra trong danh sách chọn thì
  // người dùng chỉ biết là sai sau khi bấm.
  const rosterUserIds = useMemo(
    () => new Set((members ?? []).map((m) => m.userId)),
    [members],
  );
  const selectableUsers = (users ?? []).filter((u) => !rosterUserIds.has(u.id));

  const busy =
    updateUnit.isPending || addMember.isPending || removeMember.isPending || createUser.isPending;

  const run = async (action: () => Promise<unknown>) => {
    setFormError(null);
    try {
      await action();
    } catch (error) {
      setFormError(errorText(error));
    }
  };

  const setHead = (headUserId: string | null) =>
    run(() => updateUnit.mutateAsync({ id: unit.id, dto: { headUserId } }));

  const handleAddMember = () =>
    run(async () => {
      if (!addUserId || !effectivePositionId) return;
      await addMember.mutateAsync({
        orgUnitId: unit.id,
        userId: addUserId,
        positionId: effectivePositionId,
      });
      setAddUserId('');
    });

  const handleCreateUser = () =>
    run(async () => {
      if (!newFullName.trim() || !newEmail.trim() || newPassword.length < 6) {
        setFormError('Cần họ tên, email hợp lệ và mật khẩu ít nhất 6 ký tự.');
        return;
      }
      const created = await createUser.mutateAsync({
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
      });
      // Tạo xong đưa thẳng vào đơn vị đang mở — đó là lý do người dùng bấm "tạo
      // người dùng mới" ở màn hình này chứ không ở đâu khác.
      if (effectivePositionId) {
        await addMember.mutateAsync({
          orgUnitId: unit.id,
          userId: created.id,
          positionId: effectivePositionId,
        });
      }
      setShowCreateUser(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="animate-fade-in flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              {unit.type?.name ?? `Cấp ${unit.level}`}
            </span>
            <h3 className="truncate text-base font-bold text-slate-800">{unit.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          {formError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {formError}
            </p>
          )}

          {/* --- Trưởng đơn vị --- */}
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Trưởng đơn vị
            </h4>
            <p className="text-[11px] leading-snug text-slate-500">
              Vai trò gán cho <b>cả đơn vị</b> ở Ma trận RSACIE sẽ rơi vào người này. Đơn vị chưa có
              trưởng thì không gán cho cả đơn vị được.
            </p>

            {unit.head ? (
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                <Avatar name={unit.head.fullName} initials={unit.head.avatarInitials} tone="blue" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">{unit.head.fullName}</p>
                  <p className="truncate text-[10px] text-slate-500">{unit.head.email}</p>
                </div>
                <button
                  onClick={() => setHead(null)}
                  disabled={busy}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                >
                  Gỡ
                </button>
              </div>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                Chưa có trưởng đơn vị.
              </p>
            )}

            <select
              value=""
              disabled={busy}
              onChange={(e) => e.target.value && setHead(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none disabled:opacity-50"
            >
              <option value="">
                {unit.head ? '-- Đổi sang người khác --' : '-- Bổ nhiệm trưởng đơn vị --'}
              </option>
              {(members ?? [])
                .filter((m) => m.userId !== unit.headUserId)
                .map((m) => (
                  <option key={m.id} value={m.userId}>
                    {m.user?.fullName} — {m.position?.name} (trong đơn vị)
                  </option>
                ))}
              {(users ?? [])
                .filter((u) => u.id !== unit.headUserId && !rosterUserIds.has(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} — {u.email}
                  </option>
                ))}
            </select>
          </section>

          {/* --- Nhân sự --- */}
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Nhân sự của đơn vị{' '}
              <span className="font-mono text-slate-400">({members?.length ?? 0})</span>
            </h4>

            {loadingMembers && <p className="text-xs text-slate-500">Đang tải…</p>}
            {!loadingMembers && (members?.length ?? 0) === 0 && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                Chưa có nhân sự nào. Thêm người ở ô bên dưới.
              </p>
            )}

            <ul className="space-y-1.5">
              {(members ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5"
                >
                  <Avatar
                    name={m.user?.fullName ?? '?'}
                    initials={m.user?.avatarInitials}
                    tone={m.userId === unit.headUserId ? 'blue' : 'slate'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {m.user?.fullName ?? m.userId}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">{m.user?.email}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                    {m.position?.name ?? 'Nhân viên'}
                  </span>
                  {m.userId === unit.headUserId && (
                    <span className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                      TRƯỞNG
                    </span>
                  )}
                  <button
                    onClick={() => run(() => removeMember.mutateAsync(m.id))}
                    disabled={busy}
                    title="Gỡ khỏi đơn vị"
                    className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_remove</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Gỡ người đang là trưởng chỉ xoá họ khỏi danh sách, ghế trưởng vẫn
                do họ giữ — nói rõ thay vì để người dùng tự đoán. */}
            {unit.headUserId && rosterUserIds.has(unit.headUserId) && (
              <p className="text-[10px] leading-snug text-slate-400">
                Gỡ trưởng đơn vị khỏi danh sách nhân sự <b>không</b> đồng thời gỡ ghế trưởng — dùng
                nút “Gỡ” ở mục trên cho việc đó.
              </p>
            )}
          </section>

          {/* --- Thêm nhân sự --- */}
          <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Thêm nhân sự
            </h4>

            {!showCreateUser ? (
              <>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm theo họ tên hoặc email…"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-blue-600 focus:outline-none"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">
                      {loadingUsers
                        ? 'Đang tải…'
                        : selectableUsers.length === 0
                          ? userSearch.trim()
                            ? '-- Không tìm thấy ai --'
                            : '-- Mọi người đã ở trong đơn vị --'
                          : '-- Chọn người --'}
                    </option>
                    {selectableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} — {u.email}
                      </option>
                    ))}
                  </select>
                  <select
                    value={effectivePositionId}
                    onChange={(e) => setAddPositionId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    {(positions ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAddMember}
                    disabled={busy || !addUserId || !effectivePositionId}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addMember.isPending ? 'Đang thêm…' : 'Thêm vào đơn vị'}
                  </button>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
                  >
                    Người chưa có tài khoản?
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] leading-snug text-slate-500">
                  Tạo tài khoản mới rồi thêm luôn vào <b>{unit.title}</b> với chức vụ đã chọn. Tài
                  khoản mặc định có quyền xử lý công việc (<code>approver</code>).
                </p>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Họ và tên"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@company.vn"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-blue-600 focus:outline-none"
                />
                <select
                  value={effectivePositionId}
                  onChange={(e) => setAddPositionId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  {(positions ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateUser}
                    disabled={busy}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createUser.isPending ? 'Đang tạo…' : 'Tạo & thêm vào đơn vị'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateUser(false);
                      setFormError(null);
                    }}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Quay lại
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};

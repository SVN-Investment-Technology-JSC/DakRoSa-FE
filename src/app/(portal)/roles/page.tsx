'use client';

import {
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  Files,
  LayoutDashboard,
  ListTodo,
  Network,
  Package,
  Plus,
  RadioTower,
  Save,
  ScrollText,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';
import { apiRequest, ApiError } from '@/lib/api';
import { navigationConfig, NavigationIcon, PERMISSIONS } from '@/lib/navigation';
import { hasPermission, normalizeModuleSelection } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';
import { Role } from '@/types/rbac';
const icons: Record<NavigationIcon, React.ComponentType<{ size?: number }>> = {
  dashboard: LayoutDashboard,
  'work-items': ListTodo,
  submissions: Files,
  signatures: FileCheck2,
  users: Users,
  roles: ShieldCheck,
  audit: ScrollText,
  settings: Settings2,
  organization: Network,
  eoffice: BriefcaseBusiness,
  operations: RadioTower,
  equipment: Settings2,
  inventory: Package,
  work_order: ClipboardList,
  maintenance: CalendarClock,
};

export default function RolesPage() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<{
    roles: Role[];
    selectedRoleId: string | null;
    selectedKeys: Set<string>;
  }>({ roles: [], selectedRoleId: null, selectedKeys: new Set() });
  const { roles, selectedRoleId, selectedKeys } = workspace;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [roleForm, setRoleForm] = useState({ code: '', name: '', description: '' });

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );
  const selectedRoleIsAssignedToMe = Boolean(
    selectedRole && !user?.isPlatformAdmin && user?.roleCodes.includes(selectedRole.code),
  );
  const canEditSelectedRole =
    hasPermission(user, PERMISSIONS.ROLES_ASSIGN_PERMISSIONS) &&
    !selectedRoleIsAssignedToMe;

  const load = useCallback(async (preferredId?: string) => {
    setLoading(true);
    try {
      const items = await apiRequest<Role[]>('/rbac/roles');
      const next = items.find((role) => role.id === preferredId) ?? items[0] ?? null;
      setWorkspace({
        roles: items,
        selectedRoleId: next?.id ?? null,
        selectedKeys: new Set(next?.permissions.map((permission) => permission.key) ?? []),
      });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải vai trò.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<Role[]>('/rbac/roles')
      .then((items) => {
        if (!active) return;
        const next = items[0] ?? null;
        setWorkspace({
          roles: items,
          selectedRoleId: next?.id ?? null,
          selectedKeys: new Set(next?.permissions.map((permission) => permission.key) ?? []),
        });
      })
      .catch((error) => {
        if (!active) return;
        setNotice({ tone: 'error', message: error instanceof ApiError ? error.message : 'Không thể tải vai trò.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectRole = (role: Role) => {
    setWorkspace((current) => ({
      ...current,
      selectedRoleId: role.id,
      selectedKeys: new Set(role.permissions.map((permission) => permission.key)),
    }));
  };

  const togglePermission = (viewKey: string, actionKey: string, checked: boolean) => {
    setWorkspace((current) => ({
      ...current,
      selectedKeys: normalizeModuleSelection(current.selectedKeys, viewKey, actionKey, checked),
    }));
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const updated = await apiRequest<Role>(`/rbac/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissionKeys: [...selectedKeys] }),
      });
      setWorkspace((current) => ({
        roles: current.roles.map((item) => (item.id === updated.id ? updated : item)),
        selectedRoleId: updated.id,
        selectedKeys: new Set(updated.permissions.map((permission) => permission.key)),
      }));
      setNotice({ tone: 'success', message: `Đã lưu ma trận quyền cho vai trò “${updated.name}”.` });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof ApiError ? error.message : 'Không thể lưu quyền.' });
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setRoleForm({ code: '', name: '', description: '' });
    setDialog('create');
  };

  const openEdit = () => {
    if (!selectedRole) return;
    setRoleForm({ code: selectedRole.code, name: selectedRole.name, description: selectedRole.description ?? '' });
    setDialog('edit');
  };

  const submitRole = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = dialog === 'create'
        ? await apiRequest<Role>('/rbac/roles', { method: 'POST', body: JSON.stringify(roleForm) })
        : await apiRequest<Role>(`/rbac/roles/${selectedRole?.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: roleForm.name, description: roleForm.description }),
        });
      setDialog(null);
      setNotice({ tone: 'success', message: dialog === 'create' ? 'Đã tạo vai trò mới.' : 'Đã cập nhật vai trò.' });
      await load(saved.id);
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof ApiError ? error.message : 'Không thể lưu vai trò.' });
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async () => {
    if (!selectedRole || !window.confirm(`Xóa vai trò “${selectedRole.name}”?`)) return;
    try {
      await apiRequest(`/rbac/roles/${selectedRole.id}`, { method: 'DELETE' });
      setNotice({ tone: 'success', message: 'Đã xóa vai trò.' });
      await load();
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof ApiError ? error.message : 'Không thể xóa vai trò.' });
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="RBAC Permission"
        title="Vai trò và phân quyền"
        description="Role “Người dùng” là mẫu khởi tạo có thể điều chỉnh và đổi tên theo doanh nghiệp. Quyền “Xem” là nền tảng: bỏ quyền xem sẽ tự xóa toàn bộ quyền thao tác của phân hệ đó."
        actions={hasPermission(user, PERMISSIONS.ROLES_CREATE) ? <Button onClick={openCreate}><Plus size={16} /> Tạo vai trò</Button> : undefined}
      />
      {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
      <section className="role-layout">
        <aside className="panel role-sidebar">
          <div className="section-heading"><div><h2>Vai trò nghiệp vụ</h2><p>{roles.length} vai trò có thể cấu hình</p></div></div>
          <div className="role-tabs">
            {roles.map((role) => (
              <button type="button" key={role.id} className={`role-tab ${role.id === selectedRoleId ? 'role-tab-active' : ''}`} onClick={() => selectRole(role)}>
                <span>{role.name.slice(0, 1).toUpperCase()}</span>
                <div><strong>{role.name}</strong><small>{role.code} · {role.permissions.length} quyền</small></div>
              </button>
            ))}
          </div>
          {!loading && roles.length === 0 && <div className="empty-state" style={{ minHeight: 160 }}><ShieldCheck size={30} /><strong>Chưa có vai trò</strong></div>}
        </aside>

        <article className="panel permission-panel">
          {selectedRole ? (
            <>
              <div className="permission-header">
                <div><span className="eyebrow">Ma trận quyền</span><h2>{selectedRole.name}</h2><p>{selectedRole.description || 'Chưa có mô tả cho vai trò này.'}</p></div>
                <div className="page-actions">
                  {hasPermission(user, PERMISSIONS.ROLES_UPDATE) && <Button variant="secondary" onClick={openEdit} disabled={selectedRoleIsAssignedToMe}>Cập nhật</Button>}
                  {hasPermission(user, PERMISSIONS.ROLES_DELETE) && !selectedRole.isSystem && <Button variant="ghost" onClick={() => void removeRole()} disabled={selectedRoleIsAssignedToMe}><Trash2 size={15} /> Xóa</Button>}
                </div>
              </div>
              <div className="permission-list">
                {navigationConfig.map((module) => {
                  const Icon = icons[module.icon];
                  const options = [{ key: module.viewPermission, label: 'Xem' }, ...module.actions];
                  return (
                    <div className="permission-module" key={module.id}>
                      <div className="permission-module-title"><span><Icon size={17} /></span><div><h3>{module.label}</h3><p>{module.description}</p></div></div>
                      <div className="permission-options">
                        {options.map((option) => (
                          <label className="permission-check" key={option.key}>
                            <input
                              type="checkbox"
                              checked={selectedKeys.has(option.key)}
                              disabled={!canEditSelectedRole}
                              onChange={(event) => togglePermission(module.viewPermission, option.key, event.target.checked)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasPermission(user, PERMISSIONS.ROLES_ASSIGN_PERMISSIONS) && (
                <div className="permission-footer">
                  <Button variant="secondary" onClick={() => selectRole(selectedRole)} disabled={selectedRoleIsAssignedToMe}>Hoàn tác</Button>
                  <Button onClick={() => void savePermissions()} disabled={saving || !canEditSelectedRole}><Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu ma trận quyền'}</Button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state"><ShieldCheck size={40} /><strong>{loading ? 'Đang tải vai trò…' : 'Chọn hoặc tạo một vai trò'}</strong><p>Quản trị hệ thống “admin” được bảo vệ và không hiển thị trong ma trận.</p></div>
          )}
        </article>
      </section>

      <Modal
        open={dialog !== null}
        title={dialog === 'create' ? 'Tạo vai trò nghiệp vụ' : 'Cập nhật vai trò'}
        description="Mã vai trò ổn định để API dễ kiểm soát; tên hiển thị có thể thay đổi."
        onClose={() => setDialog(null)}
      >
        <form onSubmit={submitRole}>
          <div className="modal-body">
            <div className="form-field"><label htmlFor="role-code">Mã vai trò</label><input id="role-code" className="form-control" value={roleForm.code} onChange={(event) => setRoleForm({ ...roleForm, code: event.target.value.toLowerCase() })} pattern="[a-z0-9-]+" minLength={2} disabled={dialog === 'edit'} required /></div>
            <div className="form-field"><label htmlFor="role-name">Tên hiển thị</label><input id="role-name" className="form-control" value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} minLength={2} required /></div>
            <div className="form-field"><label htmlFor="role-description">Mô tả</label><textarea id="role-description" className="form-control" value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} maxLength={500} /></div>
          </div>
          <div className="modal-footer"><Button variant="secondary" onClick={() => setDialog(null)}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu vai trò'}</Button></div>
        </form>
      </Modal>
    </>
  );
}

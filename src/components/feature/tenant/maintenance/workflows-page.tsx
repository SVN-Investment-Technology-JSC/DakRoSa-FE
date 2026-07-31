'use client';

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Copy,
  Diamond,
  GitFork,
  GitMerge,
  Hand,
  Play,
  Plus,
  Route,
  Save,
  Send,
  Settings2,
  Trash2,
  UserRoundCheck,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Protected } from '@/components/protected';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PERMISSIONS } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { workflowApi } from '@/lib/api-workflow';
import { useAuth } from '@/providers/auth-provider';
import { rolesService } from '@/services/roles.service';
import { tenancyService } from '@/services/tenancy.service';
import { usersService } from '@/services/users.service';
import type { Role } from '@/types/rbac';
import type { Organization } from '@/types/tenancy';
import type { UserRecord } from '@/types/user';
import type {
  WorkflowAssignee,
  WorkflowAssigneeType,
  WorkflowDefinition,
  WorkflowFormField,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowTransition,
  WorkflowValidation,
} from '@/types/workflow';
import { MaintenanceShell } from './maintenance-shell';

const nodeWidth = 188;
const nodeHeight = 82;
const canvasWidth = 1100;
const canvasHeight = 610;

const nodeMeta: Record<
  WorkflowNodeType,
  { label: string; description: string; icon: typeof Play; color: string }
> = {
  START: {
    label: 'Bắt đầu',
    description: 'Điểm vào duy nhất',
    icon: Play,
    color: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
  HUMAN_TASK: {
    label: 'Công việc',
    description: 'Người dùng xử lý',
    icon: UserRoundCheck,
    color: 'border-blue-300 bg-blue-50 text-blue-700',
  },
  SERVICE_TASK: {
    label: 'Tự động',
    description: 'Hệ thống thực thi',
    icon: Wrench,
    color: 'border-violet-300 bg-violet-50 text-violet-700',
  },
  CONDITION: {
    label: 'Điều kiện',
    description: 'Rẽ nhánh theo dữ liệu',
    icon: Diamond,
    color: 'border-amber-300 bg-amber-50 text-amber-700',
  },
  PARALLEL_SPLIT: {
    label: 'Tách song song',
    description: 'Mở nhiều nhánh',
    icon: GitFork,
    color: 'border-cyan-300 bg-cyan-50 text-cyan-700',
  },
  PARALLEL_JOIN: {
    label: 'Gộp song song',
    description: 'Chờ đủ các nhánh',
    icon: GitMerge,
    color: 'border-indigo-300 bg-indigo-50 text-indigo-700',
  },
  END: {
    label: 'Kết thúc',
    description: 'Hoàn thành luồng',
    icon: CheckCircle2,
    color: 'border-slate-300 bg-slate-50 text-slate-700',
  },
};

const assigneeLabels: Record<WorkflowAssigneeType, string> = {
  USER: 'Người dùng cụ thể',
  ORGANIZATION_UNIT: 'Đơn vị tổ chức',
  POSITION: 'Chức danh',
  ROLE: 'Vai trò',
  REQUEST_FIELD: 'Trường trên phiếu',
  CREATOR: 'Người tạo phiếu',
  PREVIOUS_STEP_ACTOR: 'Người xử lý bước trước',
  MANAGER_OF_REQUESTER: 'Quản lý người yêu cầu',
};

function slugKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 70);
}

function nodeKeyFromId(nodes: WorkflowNode[], id?: string) {
  return nodes.find((node) => node.id === id)?.key;
}

function normalizeTransitions(
  nodes: WorkflowNode[],
  transitions: WorkflowTransition[],
): WorkflowTransition[] {
  return transitions.map((transition) => ({
    ...transition,
    sourceKey:
      transition.sourceKey ?? nodeKeyFromId(nodes, transition.sourceNodeId) ?? '',
    targetKey:
      transition.targetKey ?? nodeKeyFromId(nodes, transition.targetNodeId) ?? '',
  }));
}

function parseConditionValue(value: string, operator: string): unknown {
  if (operator === 'in' || operator === 'notIn') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const numeric = Number(item);
        return item !== '' && !Number.isNaN(numeric) ? numeric : item;
      });
  }
  if (operator === 'exists') return value !== 'false';
  const numeric = Number(value);
  return value !== '' && !Number.isNaN(numeric) ? numeric : value;
}

function ConditionEditor({
  condition,
  disabled,
  onChange,
}: {
  condition?: Record<string, unknown> | null;
  disabled: boolean;
  onChange: (condition: Record<string, unknown>) => void;
}) {
  const current = condition ?? {
    fact: 'priority',
    op: 'eq',
    value: 'URGENT',
  };
  const [advanced, setAdvanced] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(current, null, 2));
  const [jsonError, setJsonError] = useState('');
  const operator = String(current.op ?? 'eq');
  const rawValue = Array.isArray(current.value)
    ? current.value.join(', ')
    : String(current.value ?? '');

  const openAdvanced = () => {
    setDraft(JSON.stringify(current, null, 2));
    setJsonError('');
    setAdvanced(true);
  };

  if (advanced) {
    return (
      <div className="grid gap-2 rounded-xl bg-amber-50 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-amber-800">
            Điều kiện nâng cao
          </span>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={Boolean(jsonError)}
            onClick={() => setAdvanced(false)}
          >
            Dùng biểu mẫu
          </Button>
        </div>
        <Textarea
          rows={7}
          disabled={disabled}
          className="font-mono text-[11px]"
          value={draft}
          aria-invalid={Boolean(jsonError)}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            try {
              const parsed = JSON.parse(value) as unknown;
              if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
                setJsonError('Điều kiện phải là một JSON object.');
                return;
              }
              setJsonError('');
              onChange(parsed as Record<string, unknown>);
            } catch {
              setJsonError('JSON chưa hợp lệ.');
            }
          }}
        />
        <span className={`text-[10px] ${jsonError ? 'text-red-600' : 'text-[#69756D]'}`}>
          {jsonError || 'Hỗ trợ all, any, not và các điều kiện lồng nhau.'}
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-xl bg-amber-50 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black text-amber-800">
          Điều kiện rẽ nhánh
        </span>
        <Button type="button" size="xs" variant="ghost" onClick={openAdvanced}>
          JSON nâng cao
        </Button>
      </div>
      <div className="grid grid-cols-[1fr_108px] gap-2">
        <label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
          Trường dữ liệu
          <Input
            className="h-8 text-xs"
            disabled={disabled}
            placeholder="priority"
            value={String(current.fact ?? 'priority')}
            onChange={(event) =>
              onChange({
                ...current,
                fact: event.target.value,
                op: operator,
              })
            }
          />
        </label>
        <label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
          So sánh
          <select
            className="h-8 rounded-md border border-input bg-white px-2 text-xs"
            disabled={disabled}
            value={operator}
            onChange={(event) =>
              onChange({
                ...current,
                op: event.target.value,
                value: parseConditionValue(rawValue, event.target.value),
              })
            }
          >
            <option value="eq">Bằng</option>
            <option value="neq">Khác</option>
            <option value="gt">Lớn hơn</option>
            <option value="gte">Lớn hơn/bằng</option>
            <option value="lt">Nhỏ hơn</option>
            <option value="lte">Nhỏ hơn/bằng</option>
            <option value="in">Thuộc tập</option>
            <option value="notIn">Không thuộc</option>
            <option value="contains">Chứa</option>
            <option value="exists">Tồn tại</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
        {operator === 'in' || operator === 'notIn'
          ? 'Danh sách giá trị (phân cách bằng dấu phẩy)'
          : 'Giá trị so sánh'}
        {operator === 'exists' ? (
          <select
            className="h-8 rounded-md border border-input bg-white px-2 text-xs"
            disabled={disabled}
            value={rawValue || 'true'}
            onChange={(event) =>
              onChange({ ...current, value: event.target.value === 'true' })
            }
          >
            <option value="true">Có tồn tại</option>
            <option value="false">Không tồn tại</option>
          </select>
        ) : (
          <Input
            className="h-8 text-xs"
            disabled={disabled}
            placeholder={operator === 'in' ? 'HIGH, URGENT' : 'URGENT'}
            value={rawValue}
            onChange={(event) =>
              onChange({
                ...current,
                value: parseConditionValue(event.target.value, operator),
              })
            }
          />
        )}
      </label>
    </div>
  );
}

function edgePath(source: WorkflowNode, target: WorkflowNode) {
  const sx = Number(source.uiPosition.x ?? 0) + nodeWidth;
  const sy = Number(source.uiPosition.y ?? 0) + nodeHeight / 2;
  const tx = Number(target.uiPosition.x ?? 0);
  const ty = Number(target.uiPosition.y ?? 0) + nodeHeight / 2;
  const bend = Math.max(50, Math.abs(tx - sx) / 2);
  return `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`;
}

function newNode(type: WorkflowNodeType, index: number): WorkflowNode {
  const meta = nodeMeta[type];
  return {
    key: `${type.toLowerCase()}_${index + 1}`,
    type,
    name: meta.label,
    description: meta.description,
    config: type === 'HUMAN_TASK' ? { slaMinutes: 1440 } : {},
    uiPosition: {
      x: Math.min(860, 80 + (index % 5) * 205),
      y: 80 + (Math.floor(index / 5) % 4) * 125,
    },
    assignees:
      type === 'HUMAN_TASK'
        ? [
            {
              type: 'CREATOR',
              strategy: 'ANY',
              config: {},
            },
          ]
        : [],
  };
}

export function WorkflowsPage({ tenantSlug }: { tenantSlug: string }) {
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.WORKFLOW_DEFINITION_MANAGE);
  const canPublish = hasPermission(user, PERMISSIONS.WORKFLOW_DEFINITION_PUBLISH);
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [selected, setSelected] = useState<WorkflowDefinition | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState('');
  const [validation, setValidation] = useState<WorkflowValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ key: '', name: '', description: '' });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organization, setOrganization] = useState<Organization>({
    units: [],
    positions: [],
  });
  const [drag, setDrag] = useState<{
    key: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const hydrate = useCallback((definition: WorkflowDefinition) => {
    setSelected(definition);
    const graphNodes = definition.graph?.nodes ?? [];
    setNodes(graphNodes);
    setTransitions(normalizeTransitions(graphNodes, definition.graph?.transitions ?? []));
    setSelectedNodeKey(graphNodes[0]?.key ?? '');
    setValidation(null);
  }, []);

  const load = useCallback(
    async (preferredId?: string) => {
      setLoading(true);
      try {
        const list = await workflowApi.getDefinitions();
        setDefinitions(list);
        const id = preferredId ?? list[0]?.id;
        if (id) hydrate(await workflowApi.getDefinition(id));
        else {
          setSelected(null);
          setNodes([]);
          setTransitions([]);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể tải quy trình.');
      } finally {
        setLoading(false);
      }
    },
    [hydrate],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, tenantSlug]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const [userResult, roleResult, organizationResult] =
        await Promise.allSettled([
          usersService.getUsers(),
          rolesService.getRoles(),
          tenancyService.getOrganization(),
        ]);
      setUsers(userResult.status === 'fulfilled' ? userResult.value.items : []);
      setRoles(roleResult.status === 'fulfilled' ? roleResult.value : []);
      setOrganization(
        organizationResult.status === 'fulfilled'
          ? organizationResult.value
          : { units: [], positions: [] },
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [tenantSlug]);

  const activeNode = useMemo(
    () => nodes.find((node) => node.key === selectedNodeKey) ?? null,
    [nodes, selectedNodeKey],
  );
  const assigneeSubjectOptions = useMemo(() => {
    const type = activeNode?.assignees[0]?.type;
    if (type === 'USER') {
      return users
        .filter((item) => item.isActive)
        .map((item) => ({ id: item.id, label: item.displayName }));
    }
    if (type === 'ROLE') {
      return roles.map((item) => ({ id: item.id, label: item.name }));
    }
    if (type === 'ORGANIZATION_UNIT') {
      return organization.units
        .filter((item) => item.isActive)
        .map((item) => ({ id: item.id, label: `${item.code} · ${item.name}` }));
    }
    if (type === 'POSITION') {
      return organization.positions
        .filter((item) => item.isActive)
        .map((item) => ({ id: item.id, label: `${item.code} · ${item.name}` }));
    }
    return [];
  }, [activeNode?.assignees, organization, roles, users]);

  const activeTransitions = useMemo(
    () => transitions.filter((transition) => transition.sourceKey === selectedNodeKey),
    [selectedNodeKey, transitions],
  );

  const chooseDefinition = async (id: string) => {
    setLoading(true);
    try {
      hydrate(await workflowApi.getDefinition(id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể mở quy trình.');
    } finally {
      setLoading(false);
    }
  };

  const updateNode = (key: string, patch: Partial<WorkflowNode>) => {
    setNodes((current) =>
      current.map((node) => (node.key === key ? { ...node, ...patch } : node)),
    );
    setValidation(null);
  };

  const updateFormFields = (fields: WorkflowFormField[]) => {
    if (!activeNode) return;
    updateNode(activeNode.key, {
      config: { ...activeNode.config, formFields: fields },
    });
  };

  const addFormField = () => {
    if (!activeNode) return;
    const fields =
      (activeNode.config.formFields as WorkflowFormField[] | undefined) ?? [];
    let index = fields.length + 1;
    const keys = new Set(fields.map((field) => field.key));
    let key = `field_${index}`;
    while (keys.has(key)) key = `field_${++index}`;
    updateFormFields([
      ...fields,
      { key, label: `Trường ${index}`, type: 'text', required: false },
    ]);
  };

  const updateFormField = (
    index: number,
    patch: Partial<WorkflowFormField>,
  ) => {
    if (!activeNode) return;
    const fields =
      (activeNode.config.formFields as WorkflowFormField[] | undefined) ?? [];
    updateFormFields(
      fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  };

  const removeFormField = (index: number) => {
    if (!activeNode) return;
    const fields =
      (activeNode.config.formFields as WorkflowFormField[] | undefined) ?? [];
    updateFormFields(
      fields.filter((_, fieldIndex) => fieldIndex !== index),
    );
  };

  const addNode = (type: WorkflowNodeType) => {
    if (type === 'START' && nodes.some((node) => node.type === 'START')) {
      toast.error('Quy trình chỉ có một điểm bắt đầu.');
      return;
    }
    const node = newNode(type, nodes.length);
    const used = new Set(nodes.map((item) => item.key));
    let suffix = nodes.length + 1;
    while (used.has(node.key)) node.key = `${type.toLowerCase()}_${++suffix}`;
    setNodes((current) => [...current, node]);
    setSelectedNodeKey(node.key);
    setValidation(null);
  };

  const deleteNode = (key: string) => {
    const next = nodes.filter((node) => node.key !== key);
    setNodes(next);
    setTransitions((current) =>
      current.filter(
        (transition) =>
          transition.sourceKey !== key && transition.targetKey !== key,
      ),
    );
    setSelectedNodeKey(next[0]?.key ?? '');
    setValidation(null);
  };

  const addTransition = () => {
    if (!activeNode) return;
    const target = nodes.find((node) => node.key !== activeNode.key);
    if (!target) {
      toast.error('Cần ít nhất hai node để tạo kết nối.');
      return;
    }
    let index = activeTransitions.length + 1;
    let actionKey = `action_${index}`;
    const used = new Set(activeTransitions.map((item) => item.actionKey));
    while (used.has(actionKey)) actionKey = `action_${++index}`;
    setTransitions((current) => [
      ...current,
      {
        sourceKey: activeNode.key,
        targetKey: target.key,
        actionKey,
        label: 'Chuyển bước',
        sortOrder: activeTransitions.length,
      },
    ]);
    setValidation(null);
  };

  const updateTransition = (
    actionKey: string,
    patch: Partial<WorkflowTransition>,
  ) => {
    setTransitions((current) =>
      current.map((transition) =>
        transition.sourceKey === selectedNodeKey &&
        transition.actionKey === actionKey
          ? { ...transition, ...patch }
          : transition,
      ),
    );
    setValidation(null);
  };

  const removeTransition = (actionKey: string) => {
    setTransitions((current) =>
      current.filter(
        (transition) =>
          !(
            transition.sourceKey === selectedNodeKey &&
            transition.actionKey === actionKey
          ),
      ),
    );
    setValidation(null);
  };

  const saveDraft = async () => {
    if (!selected?.id) return null;
    setSaving(true);
    try {
      const saved = await workflowApi.saveDraft(selected.id, {
        nodes: nodes.map((node) => ({
          key: node.key,
          type: node.type,
          name: node.name,
          description: node.description,
          config: node.config,
          uiPosition: node.uiPosition,
          assignees: node.assignees.map((rule) => ({
            type: rule.type,
            subjectId: rule.subjectId || undefined,
            fieldKey: rule.fieldKey || undefined,
            strategy: rule.strategy,
            quorum: rule.quorum || undefined,
            config: rule.config,
          })),
        })),
        transitions: transitions.map((transition) => ({
          sourceKey: transition.sourceKey ?? '',
          targetKey: transition.targetKey ?? '',
          actionKey: transition.actionKey,
          label: transition.label,
          condition: transition.condition ?? undefined,
          sortOrder: transition.sortOrder,
        })),
        changelog: 'Cập nhật từ trình thiết kế trực quan.',
      });
      hydrate(saved);
      await load(saved.id);
      toast.success('Đã lưu phiên bản nháp.');
      return saved;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu quy trình.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const validate = async () => {
    const saved = await saveDraft();
    if (!saved) return null;
    try {
      const result = await workflowApi.validate(saved.id);
      setValidation(result);
      if (result.valid) toast.success('Quy trình hợp lệ và sẵn sàng công bố.');
      else toast.error(`Quy trình còn ${result.errors.length} lỗi.`);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể kiểm tra quy trình.');
      return null;
    }
  };

  const publish = async () => {
    const result = await validate();
    if (!result?.valid || !selected?.id) return;
    setSaving(true);
    try {
      const published = await workflowApi.publish(selected.id);
      hydrate(published);
      await load(published.id);
      toast.success('Quy trình đã được công bố. Phiếu mới sẽ dùng phiên bản này.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể công bố quy trình.');
    } finally {
      setSaving(false);
    }
  };

  const clone = async () => {
    if (!selected?.id) return;
    const suffix = Date.now().toString().slice(-5);
    try {
      const created = await workflowApi.clone(selected.id, {
        key: `${selected.key}-copy-${suffix}`,
        name: `${selected.name} (bản sao)`,
      });
      await load(created.id);
      toast.success('Đã nhân bản quy trình.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể nhân bản.');
    }
  };

  const create = async () => {
    if (!createForm.key || !createForm.name.trim()) {
      toast.error('Vui lòng nhập mã và tên quy trình.');
      return;
    }
    setSaving(true);
    try {
      const created = await workflowApi.createDefinition(createForm);
      setCreateOpen(false);
      setCreateForm({ key: '', name: '', description: '' });
      await load(created.id);
      toast.success('Đã tạo quy trình với luồng cơ bản.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo quy trình.');
    } finally {
      setSaving(false);
    }
  };

  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || !canvasRef.current || !canManage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    updateNode(drag.key, {
      uiPosition: {
        x: Math.max(
          10,
          Math.min(canvasWidth - nodeWidth - 10, event.clientX - rect.left - drag.offsetX),
        ),
        y: Math.max(
          10,
          Math.min(canvasHeight - nodeHeight - 10, event.clientY - rect.top - drag.offsetY),
        ),
      },
    });
  };

  return (
    <Protected permission={PERMISSIONS.WORKFLOW_DEFINITION_VIEW}>
      <MaintenanceShell
        tenantSlug={tenantSlug}
        title="Mẫu quy trình"
        description="Thiết kế quy trình có nhánh điều kiện, xử lý song song, làm lại, SLA và người nhận việc; mỗi lần công bố tạo một phiên bản bất biến."
        actions={
          canManage ? (
            <Button
              className="bg-white text-[#194934] hover:bg-emerald-50"
              onClick={() => setCreateOpen(true)}
            >
              <Plus />
              Tạo quy trình
            </Button>
          ) : null
        }
      >
        <div className="grid min-h-[720px] overflow-hidden rounded-2xl border border-[#DCE5DB] bg-white shadow-sm xl:grid-cols-[250px_minmax(0,1fr)_340px]">
          <aside className="border-b border-[#E4EAE3] bg-[#F8FAF7] xl:border-b-0 xl:border-r">
            <div className="border-b border-[#E4EAE3] p-4">
              <strong className="text-sm text-[#334039]">Quy trình của doanh nghiệp</strong>
              <p className="mt-1 text-xs text-[#79837B]">{definitions.length} mẫu đã lưu</p>
            </div>
            <div className="max-h-[320px] space-y-1 overflow-y-auto p-2">
              {definitions.map((definition) => (
                <button
                  key={definition.id}
                  type="button"
                  onClick={() => void chooseDefinition(definition.id)}
                  className={`w-full rounded-xl p-3 text-left transition ${
                    selected?.id === definition.id
                      ? 'bg-white shadow-sm ring-1 ring-emerald-200'
                      : 'hover:bg-white/80'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Route size={16} className="shrink-0 text-emerald-700" />
                    <strong className="truncate text-sm text-[#354139]">{definition.name}</strong>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[#7B857E]">
                    <span className="truncate">{definition.key}</span>
                    <Badge
                      variant="outline"
                      className={
                        definition.status === 'published'
                          ? 'border-emerald-200 text-emerald-700'
                          : 'border-amber-200 text-amber-700'
                      }
                    >
                      {definition.status === 'published' ? 'Công bố' : 'Nháp'}
                    </Badge>
                  </span>
                </button>
              ))}
              {!loading && !definitions.length ? (
                <div className="p-6 text-center text-sm text-[#758078]">
                  Chưa có quy trình.
                </div>
              ) : null}
            </div>

            {selected ? (
              <div className="border-t border-[#E4EAE3] p-3">
                <Button variant="outline" className="w-full" onClick={() => void clone()}>
                  <Copy />
                  Nhân bản quy trình
                </Button>
              </div>
            ) : null}

            {selected && canManage ? (
              <div className="border-t border-[#E4EAE3] p-4">
                <span className="text-xs font-black tracking-wide text-[#78837B] uppercase">
                  Thêm node
                </span>
                <div className="mt-2 grid gap-1.5">
                  {(Object.keys(nodeMeta) as WorkflowNodeType[]).map((type) => {
                    const meta = nodeMeta[type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addNode(type)}
                        className="flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-[#DCE5DB] hover:bg-white"
                      >
                        <span className={`grid size-8 place-items-center rounded-lg border ${meta.color}`}>
                          <Icon size={15} />
                        </span>
                        <span>
                          <strong className="block text-xs text-[#3A463E]">{meta.label}</strong>
                          <span className="block text-[10px] text-[#859087]">{meta.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </aside>

          <main className="min-w-0 border-b border-[#E4EAE3] xl:border-b-0 xl:border-r">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7ECE6] px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="truncate text-sm text-[#2D3A31]">
                    {selected?.name ?? 'Chọn một quy trình'}
                  </strong>
                  {selected?.graph?.version ? (
                    <Badge variant="outline">
                      v{selected.graph.version.versionNumber}
                    </Badge>
                  ) : null}
                </div>
                <span className="mt-0.5 block text-[11px] text-[#7A857D]">
                  <Hand size={11} className="mr-1 inline" />
                  Kéo node để sắp xếp · Chọn node để cấu hình
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage && selected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void saveDraft()}
                      disabled={saving}
                    >
                      <Save />
                      Lưu nháp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void validate()}
                      disabled={saving}
                    >
                      <CircleDot />
                      Kiểm tra
                    </Button>
                  </>
                ) : null}
                {canPublish && selected ? (
                  <Button size="sm" onClick={() => void publish()} disabled={saving}>
                    <Send />
                    Công bố
                  </Button>
                ) : null}
              </div>
            </header>

            <div className="overflow-auto bg-[#F7F9F6] p-4">
              <div
                ref={canvasRef}
                className="relative overflow-hidden rounded-2xl border border-[#DCE4DA] bg-white shadow-inner"
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  backgroundImage:
                    'radial-gradient(circle, #D8E1D7 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
                onPointerMove={pointerMove}
                onPointerUp={() => setDrag(null)}
                onPointerLeave={() => setDrag(null)}
              >
                <svg
                  className="pointer-events-none absolute inset-0 size-full"
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="workflow-arrow"
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M0,0 L8,4 L0,8 Z" fill="#789082" />
                    </marker>
                  </defs>
                  {transitions.map((transition) => {
                    const source = nodes.find(
                      (node) => node.key === transition.sourceKey,
                    );
                    const target = nodes.find(
                      (node) => node.key === transition.targetKey,
                    );
                    if (!source || !target) return null;
                    return (
                      <path
                        key={`${transition.sourceKey}-${transition.actionKey}`}
                        d={edgePath(source, target)}
                        fill="none"
                        stroke="#789082"
                        strokeWidth="2"
                        markerEnd="url(#workflow-arrow)"
                      />
                    );
                  })}
                </svg>

                {nodes.map((node) => {
                  const meta = nodeMeta[node.type];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={node.key}
                      type="button"
                      onClick={() => setSelectedNodeKey(node.key)}
                      onPointerDown={(event) => {
                        if (!canManage) return;
                        const rect = event.currentTarget.getBoundingClientRect();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDrag({
                          key: node.key,
                          offsetX: event.clientX - rect.left,
                          offsetY: event.clientY - rect.top,
                        });
                        setSelectedNodeKey(node.key);
                      }}
                      className={`absolute flex items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left shadow-[0_8px_24px_rgba(34,58,42,0.10)] transition ${
                        selectedNodeKey === node.key
                          ? 'border-emerald-500 ring-4 ring-emerald-100'
                          : 'border-[#DCE5DB] hover:border-emerald-300'
                      }`}
                      style={{
                        width: nodeWidth,
                        height: nodeHeight,
                        transform: `translate(${Number(node.uiPosition.x ?? 0)}px, ${Number(node.uiPosition.y ?? 0)}px)`,
                        touchAction: 'none',
                      }}
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${meta.color}`}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-black tracking-wide text-[#849087] uppercase">
                          {meta.label}
                        </span>
                        <strong className="block truncate text-sm text-[#334039]">
                          {node.name}
                        </strong>
                        {node.type === 'HUMAN_TASK' ? (
                          <span className="block truncate text-[10px] text-[#7D8880]">
                            SLA {Number(node.config.slaMinutes ?? 0) / 60} giờ
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}

                {!nodes.length ? (
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <Route className="mx-auto text-[#9AA69D]" />
                      <strong className="mt-3 block text-sm text-[#425047]">
                        Chọn hoặc tạo một quy trình
                      </strong>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {validation ? (
              <div
                className={`border-t px-4 py-3 text-sm ${
                  validation.valid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {validation.valid
                    ? 'Quy trình hợp lệ'
                    : `${validation.errors.length} lỗi cần xử lý`}
                </div>
                {[...validation.errors, ...validation.warnings].slice(0, 4).map((message) => (
                  <div key={message} className="mt-1 pl-6 text-xs">
                    • {message}
                  </div>
                ))}
              </div>
            ) : null}
          </main>

          <aside className="bg-[#FBFCFA]">
            <header className="border-b border-[#E4EAE3] p-4">
              <span className="flex items-center gap-2">
                <Settings2 size={16} className="text-emerald-700" />
                <strong className="text-sm text-[#334039]">Thuộc tính node</strong>
              </span>
              <p className="mt-1 text-xs text-[#79837B]">
                Người nhận, SLA và hành động chuyển bước
              </p>
            </header>

            {activeNode ? (
              <div className="grid max-h-[650px] gap-4 overflow-y-auto p-4">
                <label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Mã node
                  <Input value={activeNode.key} disabled />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Tên hiển thị
                  <Input
                    value={activeNode.name}
                    disabled={!canManage}
                    onChange={(event) =>
                      updateNode(activeNode.key, { name: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Mô tả
                  <Textarea
                    rows={3}
                    value={activeNode.description ?? ''}
                    disabled={!canManage}
                    onChange={(event) =>
                      updateNode(activeNode.key, {
                        description: event.target.value,
                      })
                    }
                  />
                </label>

                {activeNode.type === 'HUMAN_TASK' ? (
                  <div className="grid gap-3 rounded-2xl border border-[#DEE7DD] bg-white p-3">
                    <strong className="text-xs text-[#46534B]">Giao việc & SLA</strong>
                    <label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      Quy tắc người nhận
                      <select
                        className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                        value={activeNode.assignees[0]?.type ?? 'CREATOR'}
                        disabled={!canManage}
                        onChange={(event) => {
                          const type = event.target.value as WorkflowAssigneeType;
                          const rule: WorkflowAssignee = {
                            type,
                            strategy: 'ANY',
                            config: {},
                            fieldKey:
                              type === 'REQUEST_FIELD' ? 'assigneeId' : undefined,
                          };
                          updateNode(activeNode.key, { assignees: [rule] });
                        }}
                      >
                        {(Object.keys(assigneeLabels) as WorkflowAssigneeType[]).map(
                          (type) => (
                            <option key={type} value={type}>
                              {assigneeLabels[type]}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    {activeNode.assignees[0]?.type === 'REQUEST_FIELD' ? (
                      <label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                        Tên trường trên phiếu
                        <select
                          className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                          value={activeNode.assignees[0]?.fieldKey ?? 'assigneeId'}
                          disabled={!canManage}
                          onChange={(event) =>
                            updateNode(activeNode.key, {
                              assignees: [
                                {
                                  ...activeNode.assignees[0],
                                  fieldKey: event.target.value,
                                },
                              ],
                            })
                          }
                        >
                          <option value="assigneeId">Người thực hiện mặc định</option>
                          <option value="technicalReviewerId">Người kiểm tra kỹ thuật</option>
                          <option value="createdBy">Người tạo phiếu</option>
                        </select>
                      </label>
                    ) : null}
                    {['USER', 'ORGANIZATION_UNIT', 'POSITION', 'ROLE'].includes(
                      activeNode.assignees[0]?.type ?? '',
                    ) ? (
                      <label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                        Đối tượng nhận việc
                        {assigneeSubjectOptions.length ? (
                          <select
                            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                            value={activeNode.assignees[0]?.subjectId ?? ''}
                            disabled={!canManage}
                            onChange={(event) =>
                              updateNode(activeNode.key, {
                                assignees: [
                                  {
                                    ...activeNode.assignees[0],
                                    subjectId: event.target.value,
                                  },
                                ],
                              })
                            }
                          >
                            <option value="">Chọn đối tượng</option>
                            {assigneeSubjectOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={activeNode.assignees[0]?.subjectId ?? ''}
                            disabled={!canManage}
                            placeholder="Nhập mã định danh đối tượng"
                            onChange={(event) =>
                              updateNode(activeNode.key, {
                                assignees: [
                                  {
                                    ...activeNode.assignees[0],
                                    subjectId: event.target.value,
                                  },
                                ],
                              })
                            }
                          />
                        )}
                      </label>
                    ) : null}
                    {activeNode.assignees[0]?.type ===
                    'MANAGER_OF_REQUESTER' ? (
                      <label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                        Chức danh quản lý dự phòng
                        <select
                          className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                          value={String(
                            activeNode.assignees[0]?.config
                              ?.managerPositionId ?? '',
                          )}
                          disabled={!canManage}
                          onChange={(event) =>
                            updateNode(activeNode.key, {
                              assignees: [
                                {
                                  ...activeNode.assignees[0],
                                  config: {
                                    ...activeNode.assignees[0]?.config,
                                    managerPositionId:
                                      event.target.value || undefined,
                                  },
                                },
                              ],
                            })
                          }
                        >
                          <option value="">
                            Dùng managerUserId trong đơn vị tổ chức
                          </option>
                          {organization.positions
                            .filter((position) => position.isActive)
                            .map((position) => (
                              <option key={position.id} value={position.id}>
                                {position.code} · {position.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      SLA (phút)
                      <Input
                        type="number"
                        min={1}
                        value={Number(activeNode.config.slaMinutes ?? 1440)}
                        disabled={!canManage}
                        onChange={(event) =>
                          updateNode(activeNode.key, {
                            config: {
                              ...activeNode.config,
                              slaMinutes: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      Quyền bắt buộc (tùy chọn)
                      <Input
                        value={String(
                          activeNode.config.requiredPermission ?? '',
                        )}
                        disabled={!canManage}
                        placeholder="Ví dụ: work_order.review"
                        onChange={(event) =>
                          updateNode(activeNode.key, {
                            config: {
                              ...activeNode.config,
                              requiredPermission:
                                event.target.value.trim() || undefined,
                            },
                          })
                        }
                      />
                    </label>
                    <div className="grid gap-2 border-t border-[#E7ECE6] pt-3">
                      <div className="flex items-center justify-between">
                        <span>
                          <strong className="block text-xs text-[#46534B]">
                            Biểu mẫu khi xử lý
                          </strong>
                          <span className="text-[10px] font-normal text-[#7B867E]">
                            Dữ liệu được lưu trong nhật ký hành động.
                          </span>
                        </span>
                        {canManage ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={addFormField}
                          >
                            <Plus />
                            Thêm trường
                          </Button>
                        ) : null}
                      </div>
                      {(
                        (activeNode.config.formFields as
                          | WorkflowFormField[]
                          | undefined) ?? []
                      ).map((field, index) => (
                        <div
                          key={`${field.key}-${index}`}
                          className="grid gap-2 rounded-xl border border-[#E2E8E1] bg-[#F9FBF8] p-2"
                        >
                          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                            <Input
                              value={field.label}
                              disabled={!canManage}
                              className="h-8 text-xs"
                              placeholder="Nhãn trường"
                              onChange={(event) =>
                                updateFormField(index, {
                                  label: event.target.value,
                                })
                              }
                            />
                            <Input
                              value={field.key}
                              disabled={!canManage}
                              className="h-8 text-xs"
                              placeholder="field_key"
                              onChange={(event) =>
                                updateFormField(index, {
                                  key: slugKey(event.target.value),
                                })
                              }
                            />
                            {canManage ? (
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="ghost"
                                className="text-red-600"
                                aria-label={`Xóa trường ${field.label}`}
                                onClick={() => removeFormField(index)}
                              >
                                <Trash2 />
                              </Button>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                            <select
                              className="h-8 rounded-md border border-input bg-white px-2 text-xs"
                              value={field.type}
                              disabled={!canManage}
                              onChange={(event) =>
                                updateFormField(index, {
                                  type: event.target
                                    .value as WorkflowFormField['type'],
                                })
                              }
                            >
                              <option value="text">Văn bản ngắn</option>
                              <option value="textarea">Văn bản dài</option>
                              <option value="number">Số</option>
                              <option value="boolean">Có/không</option>
                              <option value="date">Ngày</option>
                              <option value="select">Danh sách chọn</option>
                            </select>
                            <label className="flex items-center gap-1.5 text-[10px] font-bold">
                              <input
                                type="checkbox"
                                checked={field.required ?? false}
                                disabled={!canManage}
                                onChange={(event) =>
                                  updateFormField(index, {
                                    required: event.target.checked,
                                  })
                                }
                              />
                              Bắt buộc
                            </label>
                          </div>
                          {field.type === 'select' ? (
                            <Input
                              value={(field.options ?? []).join(', ')}
                              disabled={!canManage}
                              className="h-8 text-xs"
                              placeholder="Lựa chọn A, Lựa chọn B"
                              onChange={(event) =>
                                updateFormField(index, {
                                  options: event.target.value
                                    .split(',')
                                    .map((value) => value.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[#46534B]">Hành động đi ra</strong>
                    {canManage && activeNode.type !== 'END' ? (
                      <Button size="xs" variant="outline" onClick={addTransition}>
                        <Plus />
                        Thêm
                      </Button>
                    ) : null}
                  </div>
                  {activeTransitions.map((transition) => (
                    <div
                      key={transition.actionKey}
                      className="grid gap-2 rounded-2xl border border-[#DEE7DD] bg-white p-3"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowRight size={14} className="text-emerald-700" />
                        <Input
                          value={transition.label}
                          disabled={!canManage}
                          className="h-8"
                          aria-label="Nhãn hành động"
                          onChange={(event) =>
                            updateTransition(transition.actionKey, {
                              label: event.target.value,
                            })
                          }
                        />
                        {canManage ? (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="text-red-600"
                            aria-label="Xóa kết nối"
                            onClick={() => removeTransition(transition.actionKey)}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
                          Action key
                          <Input
                            value={transition.actionKey}
                            disabled={!canManage}
                            className="h-8 text-xs"
                            onChange={(event) =>
                              updateTransition(transition.actionKey, {
                                actionKey: slugKey(event.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
                          Node đích
                          <select
                            className="h-8 rounded-md border border-input bg-white px-2 text-xs"
                            value={transition.targetKey}
                            disabled={!canManage}
                            onChange={(event) =>
                              updateTransition(transition.actionKey, {
                                targetKey: event.target.value,
                              })
                            }
                          >
                            {nodes
                              .filter((node) => node.key !== activeNode.key)
                              .map((node) => (
                                <option key={node.key} value={node.key}>
                                  {node.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      </div>
                      {activeNode.type === 'CONDITION' ? (
                        <ConditionEditor
                          key={`${selected?.id ?? 'draft'}-${transition.actionKey}`}
                          condition={transition.condition}
                          disabled={!canManage}
                          onChange={(condition) =>
                            updateTransition(transition.actionKey, { condition })
                          }
                        />
                      ) : null}
                    </div>
                  ))}
                  {!activeTransitions.length ? (
                    <div className="rounded-xl border border-dashed border-[#D8E1D7] p-4 text-center text-xs text-[#7D8880]">
                      Node chưa có hành động đi ra.
                    </div>
                  ) : null}
                </div>

                {canManage ? (
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => deleteNode(activeNode.key)}
                    disabled={activeNode.type === 'START' && nodes.length === 1}
                  >
                    <Trash2 />
                    Xóa node
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#7B857E]">
                Chọn một node để chỉnh thuộc tính.
              </div>
            )}
          </aside>
        </div>
      </MaintenanceShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo mẫu quy trình</DialogTitle>
            <DialogDescription>
              Hệ thống tạo sẵn luồng bắt đầu → thực hiện → kết thúc để bạn chỉnh nhanh.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="grid gap-1.5 text-sm font-bold">
              Tên quy trình *
              <Input
                value={createForm.name}
                placeholder="Quy trình bảo trì có nghiệm thu"
                onChange={(event) => {
                  const name = event.target.value;
                  setCreateForm((current) => ({
                    ...current,
                    name,
                    key: current.key || slugKey(name).replaceAll('_', '-'),
                  }));
                }}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Mã quy trình *
              <Input
                value={createForm.key}
                placeholder="maintenance-review"
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    key: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ''),
                  }))
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Mô tả
              <Textarea
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => void create()} disabled={saving}>
              <Plus />
              Tạo và thiết kế
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Protected>
  );
}

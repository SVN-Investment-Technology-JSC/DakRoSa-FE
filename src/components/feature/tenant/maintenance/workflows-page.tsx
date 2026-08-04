'use client';

import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Copy,
  Diamond,
  GitFork,
  GitMerge,
  GripVertical,
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
import { Popconfirm } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Protected } from '@/components/protected';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelectVariables } from '@/components/ui/multi-select-variables';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PERMISSIONS } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { workflowApi } from '@/lib/api-workflow';
import type {
  WorkflowDefinition,
  WorkflowFormField,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowTransition,
  WorkflowValidation,
} from '@/types/workflow';
import {
  WORKFLOW_NODE_DRAG_TYPE,
  WorkflowFlowCanvas,
} from './workflow-flow-canvas';
import { MaintenanceShell } from './maintenance-shell';
import { MasterBoardModal } from './master-board-modal';
import { MasterBoardMatrix } from './master-board-matrix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        <Label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
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
        </Label>
        <Label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
          So sánh
          <Select
            disabled={disabled}
            value={operator}
            onValueChange={(value) =>
              onChange({
                ...current,
                op: value,
                value: parseConditionValue(rawValue, value),
              })
            }
          >
            <SelectTrigger size="sm" className="w-full bg-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value="eq">Bằng</SelectItem>
              <SelectItem value="neq">Khác</SelectItem>
              <SelectItem value="gt">Lớn hơn</SelectItem>
              <SelectItem value="gte">Lớn hơn/bằng</SelectItem>
              <SelectItem value="lt">Nhỏ hơn</SelectItem>
              <SelectItem value="lte">Nhỏ hơn/bằng</SelectItem>
              <SelectItem value="in">Thuộc tập</SelectItem>
              <SelectItem value="notIn">Không thuộc</SelectItem>
              <SelectItem value="contains">Chứa</SelectItem>
              <SelectItem value="exists">Tồn tại</SelectItem>
            </SelectContent>
          </Select>
        </Label>
      </div>
      <Label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
        {operator === 'in' || operator === 'notIn'
          ? 'Danh sách giá trị (phân cách bằng dấu phẩy)'
          : 'Giá trị so sánh'}
        {operator === 'exists' ? (
          <Select
            disabled={disabled}
            value={rawValue || 'true'}
            onValueChange={(value) =>
              onChange({ ...current, value: value === 'true' })
            }
          >
            <SelectTrigger size="sm" className="w-full bg-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value="true">Có tồn tại</SelectItem>
              <SelectItem value="false">Không tồn tại</SelectItem>
            </SelectContent>
          </Select>
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
      </Label>
    </div>
  );
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
    
  };
}

export function WorkflowsPage({ tenantSlug }: { tenantSlug: string }) {
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.WORKFLOW_DEFINITION_MANAGE);
  const canPublish = hasPermission(user, PERMISSIONS.WORKFLOW_DEFINITION_PUBLISH);
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [archivedDefinitions, setArchivedDefinitions] = useState<
    WorkflowDefinition[]
  >([]);
  const [selected, setSelected] = useState<WorkflowDefinition | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState('');
  const [validation, setValidation] = useState<WorkflowValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isMasterBoardOpen, setMasterBoardOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState('');
  const [definitionPendingDeletion, setDefinitionPendingDeletion] =
    useState<WorkflowDefinition | null>(null);
  const [createForm, setCreateForm] = useState({ key: '', name: '', description: '' });
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



  const activeNode = useMemo(
    () => nodes.find((node) => node.key === selectedNodeKey) ?? null,
    [nodes, selectedNodeKey],
  );
  

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

  const updateNodePositions = useCallback(
    (positions: Array<{ key: string; x: number; y: number }>) => {
      const positionByKey = new Map(
        positions.map((position) => [position.key, position]),
      );
      setNodes((current) =>
        current.map((node) => {
          const position = positionByKey.get(node.key);
          return position
            ? {
                ...node,
                uiPosition: { x: position.x, y: position.y },
              }
            : node;
        }),
      );
      setValidation(null);
    },
    [],
  );

  const updateFormFields = (fields: WorkflowFormField[]) => {
    if (!activeNode) return;
    updateNode(activeNode.key, {
      config: { ...activeNode.config, formFields: fields },
    });
  };

  const addFormField = () => {
    if (!activeNode) return;
    const fields =
      (activeNode.config?.formFields as WorkflowFormField[] | undefined) ?? [];
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
      (activeNode.config?.formFields as WorkflowFormField[] | undefined) ?? [];
    updateFormFields(
      fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  };

  const removeFormField = (index: number) => {
    if (!activeNode) return;
    const fields =
      (activeNode.config?.formFields as WorkflowFormField[] | undefined) ?? [];
    updateFormFields(
      fields.filter((_, fieldIndex) => fieldIndex !== index),
    );
  };

  const addNode = (
    type: WorkflowNodeType,
    position?: { x: number; y: number },
  ) => {
    if (type === 'START' && nodes.some((node) => node.type === 'START')) {
      toast.error('Quy trình chỉ có một điểm bắt đầu.');
      return;
    }
    const node = newNode(type, nodes.length);
    const used = new Set(nodes.map((item) => item.key));
    let suffix = nodes.length + 1;
    while (used.has(node.key)) node.key = `${type.toLowerCase()}_${++suffix}`;
    if (position) node.uiPosition = position;
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

  const openArchivedDefinitions = async () => {
    setArchiveOpen(true);
    setLoadingArchived(true);
    try {
      setArchivedDefinitions(await workflowApi.getArchivedDefinitions());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách quy trình lưu trữ.',
      );
    } finally {
      setLoadingArchived(false);
    }
  };

  const archiveSelectedDefinition = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await workflowApi.archive(selected.id);
      toast.success('Đã lưu trữ quy trình.');
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể lưu trữ quy trình.',
      );
    } finally {
      setSaving(false);
    }
  };

  const restoreArchivedDefinition = async (definition: WorkflowDefinition) => {
    setArchiveBusyId(definition.id);
    try {
      const restored = await workflowApi.restore(definition.id);
      setArchivedDefinitions((current) =>
        current.filter((item) => item.id !== definition.id),
      );
      await load(restored.id);
      toast.success('Đã khôi phục quy trình.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể khôi phục quy trình.',
      );
    } finally {
      setArchiveBusyId('');
    }
  };

  const deleteArchivedDefinition = async (definition: WorkflowDefinition) => {
    setArchiveBusyId(definition.id);
    try {
      await workflowApi.deletePermanently(definition.id);
      setArchivedDefinitions((current) =>
        current.filter((item) => item.id !== definition.id),
      );
      setDefinitionPendingDeletion(null);
      toast.success('Đã xóa vĩnh viễn quy trình.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể xóa vĩnh viễn quy trình.',
      );
    } finally {
      setArchiveBusyId('');
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

  return (
    <Protected permission={PERMISSIONS.WORKFLOW_DEFINITION_VIEW}>
      <MaintenanceShell
        tenantSlug={tenantSlug}
        title="Mẫu quy trình"
        description="Thiết kế quy trình có nhánh điều kiện, xử lý song song, làm lại, SLA và người nhận việc; mỗi lần công bố tạo một phiên bản bất biến."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => void openArchivedDefinitions()}
            >
              <Archive />
              Quy trình lưu trữ
            </Button>
            {canManage ? (
              <Button
                className="bg-white text-[#194934] hover:bg-emerald-50"
                onClick={() => setCreateOpen(true)}
              >
                <Plus />
                Tạo quy trình
              </Button>
            ) : null}
          </div>
        }
      >
        
        <Tabs defaultValue="list" className="w-full">
          <div className="mb-4 flex items-center justify-between">
            <TabsList className="bg-white/50 p-1 border border-[#DDE5DC]">
              <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Danh sách Quy trình</TabsTrigger>
              <TabsTrigger value="matrix" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Ma trận Master</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="list" className="mt-0">
            <div className="grid min-h-[720px] overflow-hidden rounded-2xl border border-[#DCE5DB] bg-white shadow-sm xl:grid-cols-[250px_minmax(0,1fr)_340px]">
          <aside className="border-b border-[#E4EAE3] bg-[#F8FAF7] xl:border-b-0 xl:border-r">
            <div className="border-b border-[#E4EAE3] p-4">
              <strong className="text-sm text-[#334039]">Quy trình của doanh nghiệp</strong>
              <p className="mt-1 text-xs text-[#79837B]">{definitions.length} mẫu đã lưu</p>
            </div>
            <div className="max-h-[320px] space-y-1 overflow-y-auto p-2">
              {definitions.map((definition) => (
                <Button
                  key={definition.id}
                  type="button"
                  variant="ghost"
                  onClick={() => void chooseDefinition(definition.id)}
                  className={`h-auto w-full flex-col items-stretch rounded-xl p-3 text-left whitespace-normal transition ${selected?.id === definition.id
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
                </Button>
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

                {canManage ? (
                  <Popconfirm
                    title="Lưu trữ quy trình?"
                    description={`Quy trình “${selected.name}” sẽ được chuyển sang danh sách lưu trữ và có thể khôi phục.`}
                    okText="Lưu trữ"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    disabled={saving}
                    onConfirm={() => void archiveSelectedDefinition()}
                  >
                    <Button
                      variant="outline"
                      className="mt-2 w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                      disabled={saving}
                    >
                      <Archive />
                      Lưu trữ quy trình
                    </Button>
                  </Popconfirm>
                ) : null}
              </div>
            ) : null}

            {selected && canManage ? (
              <div className="border-t border-[#E4EAE3] p-4">
                <span className="text-xs font-black tracking-wide text-[#78837B] uppercase">
                  Thêm node
                </span>
                <p className="mt-1 text-[10px] leading-4 text-[#7B867E]">
                  Bấm để thêm nhanh hoặc kéo node vào vị trí mong muốn trên canvas.
                </p>
                <div className="mt-2 grid gap-1.5">
                  {(Object.keys(nodeMeta) as WorkflowNodeType[]).map((type) => {
                    const meta = nodeMeta[type];
                    const Icon = meta.icon;
                    return (
                      <Button
                        key={type}
                        type="button"
                        variant="ghost"
                        draggable
                        onClick={() => addNode(type)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData(WORKFLOW_NODE_DRAG_TYPE, type);
                          event.dataTransfer.setData('text/plain', type);
                          event.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="h-auto w-full cursor-grab justify-start gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left whitespace-normal transition hover:border-[#DCE5DB] hover:bg-white active:cursor-grabbing"
                      >
                        <span className={`grid size-8 place-items-center rounded-lg border ${meta.color}`}>
                          <Icon size={15} />
                        </span>
                        <span>
                          <strong className="block text-xs text-[#3A463E]">{meta.label}</strong>
                          <span className="block text-[10px] text-[#859087]">{meta.description}</span>
                        </span>
                        <GripVertical className="ml-auto size-4 shrink-0 text-[#9AA49D]" />
                      </Button>
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

            <div className="bg-[#F7F9F6] p-4">
              <WorkflowFlowCanvas
                key={selected?.id ?? 'empty-workflow'}
                nodes={nodes}
                transitions={transitions}
                nodeMeta={nodeMeta}
                selectedNodeKey={selectedNodeKey}
                editable={canManage}
                onNodeSelect={setSelectedNodeKey}
                onNodePositionsChange={updateNodePositions}
                onAddNode={addNode}
              />
            </div>

            {validation ? (
              <div
                className={`border-t px-4 py-3 text-sm ${validation.valid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                  }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {validation.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {validation.valid
                    ? 'Quy trình hợp lệ'
                    : `${(validation.errors || []).length} lỗi cần xử lý`}
                </div>
                {[...(validation.errors || []), ...(validation.warnings || [])].slice(0, 4).map((message) => (
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
                <Label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Mã node
                  <Input value={activeNode.key} disabled />
                </Label>
                <Label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Tên hiển thị
                  <Input
                    value={activeNode.name}
                    disabled={!canManage}
                    onChange={(event) =>
                      updateNode(activeNode.key, { name: event.target.value })
                    }
                  />
                </Label>
                <Label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
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
                </Label>

                {activeNode.type === 'HUMAN_TASK' ? (
                  <div className="grid gap-3 rounded-2xl border border-[#DEE7DD] bg-white p-3">
                    <strong className="text-xs text-[#46534B]">Giao việc & SLA</strong>
                    <Label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      Người thực hiện (Doers - Các biến số)
                      <MultiSelectVariables
                        value={((activeNode.config?.doers as string[]) || [])}
                        disabled={!canManage}
                        onChange={(vals) =>
                          updateNode(activeNode.key, {
                            config: {
                              ...activeNode.config,
                              doers: vals,
                            },
                          })
                        }
                      />
                    </Label>
                    <Label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      Người quan sát/báo cáo (Reporters)
                      <MultiSelectVariables
                        value={((activeNode.config?.reporters as string[]) || [])}
                        disabled={!canManage}
                        onChange={(vals) =>
                          updateNode(activeNode.key, {
                            config: {
                              ...activeNode.config,
                              reporters: vals,
                            },
                          })
                        }
                      />
                    </Label>
                    <Label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      SLA (phút)
                      <Input
                        type="number"
                        min={1}
                        value={Number(activeNode.config?.slaMinutes ?? 1440)}
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
                    </Label>
                    <Label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      Quyền bắt buộc (tùy chọn)
                      <Input
                        value={String(
                          activeNode.config?.requiredPermission ?? '',
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
                    </Label>
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
                        (activeNode.config?.formFields as
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
                            <Select
                              value={field.type}
                              disabled={!canManage}
                              onValueChange={(type) =>
                                updateFormField(index, {
                                  type: type as WorkflowFormField['type'],
                                })
                              }
                            >
                              <SelectTrigger size="sm" className="w-full bg-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" align="start">
                                <SelectItem value="text">Văn bản ngắn</SelectItem>
                                <SelectItem value="textarea">Văn bản dài</SelectItem>
                                <SelectItem value="number">Số</SelectItem>
                                <SelectItem value="boolean">Có/không</SelectItem>
                                <SelectItem value="date">Ngày</SelectItem>
                                <SelectItem value="select">Danh sách chọn</SelectItem>
                              </SelectContent>
                            </Select>
                            <Label className="flex items-center gap-1.5 text-[10px] font-bold">
                              <Checkbox
                                checked={field.required ?? false}
                                disabled={!canManage}
                                onCheckedChange={(checked) =>
                                  updateFormField(index, {
                                    required: checked === true,
                                  })
                                }
                              />
                              Bắt buộc
                            </Label>
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
                        <Label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
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
                        </Label>
                        <Label className="grid gap-1 text-[10px] font-bold text-[#717C74]">
                          Node đích
                          <Select
                            value={transition.targetKey}
                            disabled={!canManage}
                            onValueChange={(targetKey) =>
                              updateTransition(transition.actionKey, {
                                targetKey,
                              })
                            }
                          >
                            <SelectTrigger size="sm" className="w-full bg-white text-xs">
                              <SelectValue placeholder="Chọn node đích" />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start">
                              {nodes
                                .filter((node) => node.key !== activeNode.key)
                                .map((node) => (
                                  <SelectItem key={node.key} value={node.key}>
                                    {node.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </Label>
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
          </TabsContent>
          
          <TabsContent value="matrix" className="mt-0 h-[calc(100vh-140px)]">
            <MasterBoardMatrix />
          </TabsContent>
        </Tabs>
      </MaintenanceShell>

      <MasterBoardModal
        definitionId={selected?.id ?? null}
        isOpen={isMasterBoardOpen}
        onClose={() => setMasterBoardOpen(false)}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quy trình đã lưu trữ</DialogTitle>
            <DialogDescription>
              Khôi phục quy trình để tiếp tục sử dụng. Xóa vĩnh viễn chỉ được
              thực hiện trong danh sách này và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[520px] space-y-3 overflow-y-auto py-2">
            {loadingArchived ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#758078]">
                Đang tải danh sách lưu trữ…
              </div>
            ) : null}
            {!loadingArchived && !archivedDefinitions.length ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#758078]">
                Chưa có quy trình nào được lưu trữ.
              </div>
            ) : null}
            {archivedDefinitions.map((definition) => {
              const busy = archiveBusyId === definition.id;
              return (
                <div
                  key={definition.id}
                  className="rounded-xl border border-[#DCE5DB] bg-[#F8FAF7] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-[#2F3C34]">
                          {definition.name}
                        </strong>
                        <Badge variant="outline" className="border-slate-300 text-slate-600">
                          Đã lưu trữ
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-[#748078]">
                        {definition.key} · Khôi phục về{' '}
                        {definition.currentVersionId ? 'Công bố' : 'Nháp'}
                      </p>
                      {definition.description ? (
                        <p className="mt-2 text-sm text-[#59645D]">
                          {definition.description}
                        </p>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void restoreArchivedDefinition(definition)}
                        >
                          <ArchiveRestore />
                          Khôi phục
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={busy}
                          onClick={() => setDefinitionPendingDeletion(definition)}
                        >
                          <Trash2 />
                          Xóa vĩnh viễn
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(definitionPendingDeletion)}
        onOpenChange={(open) => {
          if (!open) setDefinitionPendingDeletion(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa vĩnh viễn quy trình?</DialogTitle>
            <DialogDescription>
              {definitionPendingDeletion
                ? `Quy trình “${definitionPendingDeletion.name}” sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`
                : 'Hành động này không thể hoàn tác.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={Boolean(archiveBusyId)}
              onClick={() => setDefinitionPendingDeletion(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={!definitionPendingDeletion || Boolean(archiveBusyId)}
              onClick={() => {
                if (definitionPendingDeletion) {
                  void deleteArchivedDefinition(definitionPendingDeletion);
                }
              }}
            >
              <Trash2 />
              Xóa vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo mẫu quy trình</DialogTitle>
            <DialogDescription>
              Hệ thống tạo sẵn luồng bắt đầu → thực hiện → kết thúc để bạn chỉnh nhanh.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Label className="grid gap-1.5 text-sm font-bold">
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
            </Label>
            <Label className="grid gap-1.5 text-sm font-bold">
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
            </Label>
            <Label className="grid gap-1.5 text-sm font-bold">
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
            </Label>
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

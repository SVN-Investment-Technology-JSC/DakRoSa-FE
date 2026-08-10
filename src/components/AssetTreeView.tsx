import React, { useMemo, useState } from 'react';
import { TopAppBar } from './TopAppBar';
import {
  useCreateMaintenancePart,
  useDeleteMaintenancePart,
  useMaintenancePartsTree,
  useUpdateMaintenancePart,
} from '../hooks/useMaintenance';
import { useOrgUnitTree } from '../hooks/useOrgUnits';
import {
  ASSET_CONDITION_LABEL,
  ASSET_KIND_ICON,
  ASSET_KIND_LABEL,
  validChildKinds,
  type ApiMaintenancePart,
  type AssetCondition,
  type AssetKind,
} from '../api/maintenance';
import type { ApiOrgUnit, ApiOrgUnitTreeNode } from '../api/orgUnits';

interface AssetTreeViewProps {
  onMenuToggle?: () => void;
}

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const KIND_TONE: Record<AssetKind, string> = {
  company: 'bg-slate-800 text-white',
  factory: 'bg-blue-100 text-blue-800',
  main_equipment: 'bg-violet-100 text-violet-800',
  part: 'bg-emerald-100 text-emerald-800',
};

const CONDITION_TONE: Record<AssetCondition, string> = {
  operating: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  broken: 'bg-rose-50 text-rose-700 border-rose-200',
  standby: 'bg-amber-50 text-amber-800 border-amber-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

function flattenOrgTree(units: ApiOrgUnitTreeNode[]): ApiOrgUnit[] {
  const flat: ApiOrgUnit[] = [];
  const walk = (nodes: ApiOrgUnitTreeNode[]) => {
    for (const node of nodes) {
      flat.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(units);
  return flat;
}

/** Mọi node của một nhánh, phẳng — dùng để mở sẵn toàn bộ cây lần đầu. */
function allNodeIds(nodes: ApiMaintenancePart[]): string[] {
  const ids: string[] = [];
  const walk = (list: ApiMaintenancePart[]) => {
    for (const node of list) {
      ids.push(node.id);
      walk(node.children ?? []);
    }
  };
  walk(nodes);
  return ids;
}

// --------------------------------------------------------------- Hàng của cây

interface TreeRowProps {
  node: ApiMaintenancePart;
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (node: ApiMaintenancePart) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
  node,
  depth,
  expanded,
  selectedId,
  onToggle,
  onSelect,
}) => {
  const children = node.children ?? [];
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const taskCount = node.taskTemplate?.length ?? 0;

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={children.length > 0 ? isOpen : undefined}
        onClick={() => onSelect(node)}
        style={{ paddingLeft: 8 + depth * 18 }}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pr-2 transition-colors ${
          isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-slate-50'
        }`}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="shrink-0 text-slate-400 hover:text-blue-600"
          >
            <span className="material-symbols-outlined text-base leading-none">
              {isOpen ? 'expand_more' : 'chevron_right'}
            </span>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span
          className={`material-symbols-outlined shrink-0 text-[15px] leading-none ${
            node.isActive ? 'text-slate-500' : 'text-slate-300'
          }`}
        >
          {ASSET_KIND_ICON[node.assetKind]}
        </span>

        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
          {node.name}
        </span>

        <span className="shrink-0 rounded bg-slate-100 px-1.5 font-mono text-[10px] font-bold text-slate-500">
          {node.code}
        </span>

        {taskCount > 0 && (
          <span
            title={`Đã khai ${taskCount} nhiệm vụ bảo trì (JSON)`}
            className="shrink-0 rounded border border-violet-200 bg-violet-50 px-1 text-[9px] font-bold text-violet-700"
          >
            {taskCount} NV
          </span>
        )}
        {node.schedules?.length > 0 && (
          <span
            title={`Có ${node.schedules.length} chu kỳ bảo trì`}
            className="material-symbols-outlined shrink-0 text-[13px] leading-none text-amber-500"
          >
            event_repeat
          </span>
        )}
        {!node.isActive && (
          <span className="shrink-0 rounded bg-slate-200 px-1 text-[9px] font-bold text-slate-600">
            Ngưng
          </span>
        )}
      </div>

      {isOpen &&
        children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            selectedId={selectedId}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </>
  );
};

// ------------------------------------------------------------- Form thêm node

interface AddNodeFormProps {
  parent: ApiMaintenancePart | null;
  orgUnits: ApiOrgUnit[];
  onDone: () => void;
}

const AddNodeForm: React.FC<AddNodeFormProps> = ({ parent, orgUnits, onDone }) => {
  const kinds = validChildKinds(parent?.assetKind ?? null);
  const createPart = useCreateMaintenancePart();
  const [form, setForm] = useState({
    code: '',
    name: '',
    assetKind: kinds[0],
    orgUnitId: '',
    symbol: '',
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Cần nhập cả mã và tên.');
      return;
    }
    setError(null);
    try {
      await createPart.mutateAsync({
        code: form.code.trim(),
        name: form.name.trim(),
        assetKind: form.assetKind,
        parentId: parent?.id,
        orgUnitId: form.orgUnitId || undefined,
        symbol: form.symbol.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Thêm node thất bại.'));
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
      <p className="text-[11px] font-bold text-blue-800">
        {parent ? `Thêm vào dưới "${parent.name}"` : 'Thêm Công ty ở gốc cây'}
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={form.assetKind}
          onChange={(e) => setForm({ ...form, assetKind: e.target.value as AssetKind })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold"
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {ASSET_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="Mã (VD: SB-KD-T-S-01)"
          className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
        />
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Tên"
          className="min-w-40 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          placeholder="Kí hiệu (T, Gu, Sh…)"
          className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
        />
        <select
          value={form.orgUnitId}
          onChange={(e) => setForm({ ...form, orgUnitId: e.target.value })}
          className="min-w-48 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium"
        >
          <option value="">— Đơn vị phụ trách: kế thừa cấp trên —</option>
          {orgUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {'— '.repeat(Math.max(0, u.level - 1))}
              {u.title}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-[10px] font-semibold text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={onDone}
          className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
        >
          Hủy
        </button>
        <button
          onClick={submit}
          disabled={createPart.isPending}
          className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createPart.isPending ? 'Đang lưu…' : 'Thêm'}
        </button>
      </div>
    </div>
  );
};

// ------------------------------------------------------- Khung thông tin node

interface DetailPanelProps {
  node: ApiMaintenancePart;
  orgUnits: ApiOrgUnit[];
}

const DetailPanel: React.FC<DetailPanelProps> = ({ node, orgUnits }) => {
  const updatePart = useUpdateMaintenancePart();
  const deletePart = useDeleteMaintenancePart();
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [draft, setDraft] = useState(() => toDraft(node));

  // Chọn sang node khác thì bỏ luôn bản nháp đang sửa dở của node cũ, nếu không
  // bấm Lưu sẽ ghi thông tin của node này đè lên node kia.
  React.useEffect(() => {
    setDraft(toDraft(node));
    setIsEditing(false);
    setFeedback(null);
  }, [node.id, node.updatedAt]);

  const save = async () => {
    try {
      await updatePart.mutateAsync({
        id: node.id,
        name: draft.name.trim(),
        orgUnitId: draft.orgUnitId || undefined,
        symbol: draft.symbol.trim(),
        condition: draft.condition || undefined,
        location: draft.location.trim(),
        specifications: draft.specifications.trim(),
        manufacturer: draft.manufacturer.trim(),
      });
      setIsEditing(false);
      setFeedback({ kind: 'ok', text: 'Đã lưu thông tin thiết bị.' });
    } catch (error) {
      setFeedback({ kind: 'err', text: errorMessage(error, 'Lưu thất bại.') });
    }
  };

  const remove = async () => {
    const childCount = (node.children ?? []).length;
    const confirmed = window.confirm(
      childCount > 0
        ? `Xoá "${node.name}" sẽ xoá cả ${childCount} nhánh con bên dưới. Tiếp tục?`
        : `Xoá "${node.name}"?`,
    );
    if (!confirmed) return;
    try {
      await deletePart.mutateAsync(node.id);
    } catch (error) {
      setFeedback({ kind: 'err', text: errorMessage(error, 'Xoá thất bại.') });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${KIND_TONE[node.assetKind]}`}
            >
              {ASSET_KIND_LABEL[node.assetKind]}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600">
              {node.code}
            </span>
          </div>
          <h3 className="mt-1.5 truncate text-base font-bold text-slate-900">{node.name}</h3>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-700"
            >
              Sửa
            </button>
          )}
          <button
            onClick={remove}
            disabled={deletePart.isPending}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
          >
            Xoá
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${
            feedback.kind === 'ok'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <Field label="Tên">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
            />
          </Field>
          <Field label="Kí hiệu">
            <input
              value={draft.symbol}
              onChange={(e) => setDraft({ ...draft, symbol: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
            />
          </Field>
          <Field label="Tình trạng">
            <select
              value={draft.condition}
              onChange={(e) => setDraft({ ...draft, condition: e.target.value as AssetCondition })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium"
            >
              <option value="">— Chưa xác định —</option>
              {(Object.keys(ASSET_CONDITION_LABEL) as AssetCondition[]).map((c) => (
                <option key={c} value={c}>
                  {ASSET_CONDITION_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vị trí">
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Địa điểm - Kho"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
            />
          </Field>
          <Field label="Đơn vị phụ trách">
            <select
              value={draft.orgUnitId}
              onChange={(e) => setDraft({ ...draft, orgUnitId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium"
            >
              <option value="">— Kế thừa từ cấp trên —</option>
              {orgUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {'— '.repeat(Math.max(0, u.level - 1))}
                  {u.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nhà sản xuất">
            <input
              value={draft.manufacturer}
              onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
            />
          </Field>
          <Field label="Thông số chính">
            <textarea
              value={draft.specifications}
              onChange={(e) => setDraft({ ...draft, specifications: e.target.value })}
              rows={3}
              placeholder="Thông số kỹ thuật / vật liệu / quy cách"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setDraft(toDraft(node));
                setIsEditing(false);
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
            >
              Hủy
            </button>
            <button
              onClick={save}
              disabled={updatePart.isPending}
              className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updatePart.isPending ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      ) : (
        <dl className="space-y-1.5">
          <ReadRow label="Kí hiệu" value={node.symbol} mono />
          <ReadRow
            label="Tình trạng"
            value={node.condition ? ASSET_CONDITION_LABEL[node.condition] : null}
            tone={node.condition ? CONDITION_TONE[node.condition] : undefined}
          />
          <ReadRow label="Vị trí" value={node.location} />
          <ReadRow label="Đơn vị phụ trách" value={node.orgUnit?.title ?? 'Kế thừa từ cấp trên'} />
          <ReadRow label="Nhà sản xuất" value={node.manufacturer} />
          <ReadRow label="Thông số chính" value={node.specifications} />
        </dl>
      )}

      {/* Timeline bảo dưỡng — các chu kỳ đang đặt cho thiết bị này. */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-1.5 text-[11px] font-bold text-slate-700">Chu kỳ bảo trì</p>
        {node.schedules?.length ? (
          <ul className="space-y-1">
            {node.schedules.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-semibold">{FREQ_LABEL[s.frequency] ?? s.frequency}</span>
                <span className="font-mono text-slate-500">kỳ kế tiếp {s.nextDueAt}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-slate-400">
            Chưa lên lịch. Đặt chu kỳ ở <b>Ma trận bảo trì thiết bị</b>.
          </p>
        )}
      </div>

      {/* Danh sách nhiệm vụ JSON — chỉ đọc ở đây; khai ở Ma trận bảo trì. */}
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
        <p className="mb-1.5 text-[11px] font-bold text-violet-800">
          Danh sách nhiệm vụ theo thiết bị (JSON)
        </p>
        {node.taskTemplate?.length ? (
          <ol className="space-y-1">
            {node.taskTemplate.map((t, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-[11px] text-slate-700">
                <span className="min-w-0">
                  <b className="text-violet-700">{i + 1}.</b> {t.title}
                  {t.note && <em className="block text-[10px] text-slate-500">{t.note}</em>}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-slate-500">
                  {formatDuration(t.durationMinutes)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[11px] text-slate-500">
            Chưa khai. Vào <b>Ma trận bảo trì thiết bị</b> → <b>Thêm thông tin công việc</b>.
          </p>
        )}
      </div>
    </div>
  );
};

const FREQ_LABEL: Record<string, string> = {
  day: 'Ngày',
  week: 'Tuần',
  month: 'Tháng',
  quarter: 'Quý',
  year: 'Năm',
};

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = minutes / 60;
  if (minutes % 60 === 0) return `${hours} giờ`;
  return `${Math.floor(hours)}g${minutes % 60}p`;
}

function toDraft(node: ApiMaintenancePart) {
  return {
    name: node.name,
    symbol: node.symbol ?? '',
    condition: (node.condition ?? '') as AssetCondition | '',
    location: node.location ?? '',
    orgUnitId: node.orgUnitId ?? '',
    manufacturer: node.manufacturer ?? '',
    specifications: node.specifications ?? '',
  };
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </span>
    {children}
  </label>
);

const ReadRow: React.FC<{
  label: string;
  value?: string | null;
  mono?: boolean;
  tone?: string;
}> = ({ label, value, mono, tone }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-1.5">
    <dt className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </dt>
    <dd
      className={`min-w-0 text-right text-[11px] font-semibold ${mono ? 'font-mono' : ''} ${
        tone ? `rounded border px-1.5 ${tone}` : 'text-slate-700'
      }`}
    >
      {value || <span className="font-normal text-slate-300">—</span>}
    </dd>
  </div>
);

// ------------------------------------------------------------------ Màn hình

/**
 * BRD 3 Epic 1 — "Sơ đồ thiết bị": cây Công ty → Nhà máy → Phân hệ → Bộ phận,
 * kèm khung thông tin chi tiết của node đang chọn.
 *
 * Chỉ đọc/sửa cấu trúc và thuộc tính thiết bị. Lên lịch bảo trì và khai Danh
 * sách nhiệm vụ vẫn nằm ở Ma trận bảo trì — cùng một thiết bị nhưng là việc của
 * người lập kế hoạch, không phải người quản lý tài sản.
 */
export const AssetTreeView: React.FC<AssetTreeViewProps> = ({ onMenuToggle }) => {
  const { data: tree = [], isLoading } = useMaintenancePartsTree();
  const { data: orgTree = [] } = useOrgUnitTree();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [didAutoExpand, setDidAutoExpand] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingUnder, setAddingUnder] = useState<{ parent: ApiMaintenancePart | null } | null>(null);
  const [search, setSearch] = useState('');

  const orgUnits = useMemo(() => flattenOrgTree(orgTree), [orgTree]);

  // Mở sẵn toàn bộ cây ở lần tải đầu: cây tài sản mặc định đóng thì màn hình
  // chỉ hiện vài dòng "Công ty" và trông như chưa có dữ liệu.
  React.useEffect(() => {
    if (didAutoExpand || tree.length === 0) return;
    setExpanded(new Set(allNodeIds(tree)));
    setDidAutoExpand(true);
  }, [tree, didAutoExpand]);

  // Cây được nạp lại sau mỗi lần sửa, nên node đang chọn phải tra lại theo id
  // chứ không giữ tham chiếu cũ — nếu không, khung chi tiết sẽ hiện dữ liệu
  // trước khi lưu.
  const { selected, roots, orphanParts } = useMemo(() => {
    const index = new Map<string, ApiMaintenancePart>();
    const walk = (nodes: ApiMaintenancePart[]) => {
      for (const n of nodes) {
        index.set(n.id, n);
        walk(n.children ?? []);
      }
    };
    walk(tree);
    return {
      selected: selectedId ? (index.get(selectedId) ?? null) : null,
      // Thiết bị `part` đứng ở gốc là dữ liệu có từ trước BRD 3 — chưa ai xếp
      // vào cây. Tách riêng thay vì trộn lẫn với các Công ty.
      roots: tree.filter((n) => n.assetKind !== 'part'),
      orphanParts: tree.filter((n) => n.assetKind === 'part'),
    };
  }, [tree, selectedId]);

  const matches = (node: ApiMaintenancePart) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return node.name.toLowerCase().includes(q) || node.code.toLowerCase().includes(q);
  };

  /** Giữ lại một nhánh nếu chính nó hoặc bất kỳ hậu duệ nào khớp từ khoá. */
  const filterTree = (nodes: ApiMaintenancePart[]): ApiMaintenancePart[] => {
    const kept: ApiMaintenancePart[] = [];
    for (const node of nodes) {
      const children = filterTree(node.children ?? []);
      if (matches(node) || children.length > 0) kept.push({ ...node, children });
    }
    return kept;
  };

  const visibleRoots = search.trim() ? filterTree(roots) : roots;
  const visibleOrphans = search.trim() ? filterTree(orphanParts) : orphanParts;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Tìm kiếm mà cây vẫn đóng thì kết quả nằm khuất bên trong; mở hết cho chắc.
  const effectiveExpanded = search.trim()
    ? new Set(allNodeIds([...visibleRoots, ...visibleOrphans]))
    : expanded;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-slate-50">
      <TopAppBar title="Sơ đồ thiết bị" onMenuToggle={onMenuToggle} />

      <main className="custom-scrollbar mt-16 flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div>
            <h2 className="mb-1 text-xl font-bold tracking-tight text-slate-800 md:text-2xl">
              Cây cấu trúc tài sản
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Công ty → Nhà máy → Phân hệ thiết bị chính → Bộ phận (lồng tối đa 5 cấp). Chọn một
              node để xem và sửa thông tin chi tiết.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            {/* --- Cây --- */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="mb-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-base text-slate-400">
                    search
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc mã…"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-[11px] font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setAddingUnder({ parent: selected })}
                  title={
                    selected
                      ? `Thêm node con dưới "${selected.name}"`
                      : 'Thêm một Công ty ở gốc cây'
                  }
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                >
                  <span className="material-symbols-outlined text-sm leading-none">add</span>
                  {selected ? 'Thêm con' : 'Thêm gốc'}
                </button>
              </div>

              {addingUnder && (
                <div className="mb-2">
                  <AddNodeForm
                    parent={addingUnder.parent}
                    orgUnits={orgUnits}
                    onDone={() => setAddingUnder(null)}
                  />
                </div>
              )}

              <div role="tree" className="custom-scrollbar max-h-[62vh] overflow-y-auto">
                {isLoading && <p className="p-4 text-center text-xs text-slate-500">Đang tải…</p>}
                {!isLoading && visibleRoots.length === 0 && visibleOrphans.length === 0 && (
                  <p className="p-6 text-center text-xs text-slate-400">
                    {search.trim()
                      ? 'Không có thiết bị nào khớp từ khoá.'
                      : 'Chưa có node nào. Bấm “Thêm gốc” để tạo Công ty đầu tiên.'}
                  </p>
                )}
                {visibleRoots.map((node) => (
                  <TreeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    expanded={effectiveExpanded}
                    selectedId={selectedId}
                    onToggle={toggle}
                    onSelect={(n) => setSelectedId(n.id)}
                  />
                ))}

                {visibleOrphans.length > 0 && (
                  <>
                    <p className="mt-3 border-t border-slate-100 px-2 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Chưa xếp vào cây
                    </p>
                    {visibleOrphans.map((node) => (
                      <TreeRow
                        key={node.id}
                        node={node}
                        depth={0}
                        expanded={effectiveExpanded}
                        selectedId={selectedId}
                        onToggle={toggle}
                        onSelect={(n) => setSelectedId(n.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* --- Khung thông tin chi tiết --- */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              {selected ? (
                <DetailPanel node={selected} orgUnits={orgUnits} />
              ) : (
                <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-200">
                    account_tree
                  </span>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Chọn một node trong cây
                  </p>
                  <p className="mt-1 max-w-56 text-[11px] text-slate-400">
                    Khung này hiển thị kí hiệu, tình trạng, vị trí, thông số, nhà sản xuất và danh
                    sách nhiệm vụ đã khai.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

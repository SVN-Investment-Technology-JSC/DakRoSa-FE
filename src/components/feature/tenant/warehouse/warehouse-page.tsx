'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Building2,
  Factory,
  Cpu,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  Layers,
  ArrowRightLeft,
  Sliders,
  ExternalLink,
  Download,
  Share2,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  warehouseService,
  DEFAULT_NAMING_DICTIONARY,
} from '@/services/warehouse.service';
import type {
  WarehouseNode,
  WarehouseAssetKind,
  WarehouseCondition,
  NamingDictionary,
  MaintenanceFrequency,
} from '@/types/warehouse';

const KIND_CONFIG: Record<
  WarehouseAssetKind,
  { label: string; tone: string; tag: string; icon: any }
> = {
  company: {
    label: 'Công ty (Company)',
    tone: 'border-slate-800 bg-slate-900 text-white',
    tag: 'bg-slate-800 text-white',
    icon: Building2,
  },
  factory: {
    label: 'Nhà máy / Hạ tầng (Factory)',
    tone: 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100',
    tag: 'bg-amber-600 text-white',
    icon: Factory,
  },
  main_equipment: {
    label: 'Phân hệ thiết bị chính (Main Equipment)',
    tone: 'border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-950/30 dark:text-violet-100',
    tag: 'bg-violet-600 text-white',
    icon: Cpu,
  },
  part: {
    label: 'Bộ phận / Chi tiết (Part)',
    tone: 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100',
    tag: 'bg-emerald-600 text-white',
    icon: Settings,
  },
};

const CONDITION_CONFIG: Record<
  WarehouseCondition,
  { label: string; badge: string; dot: string }
> = {
  operating: {
    label: 'Đang vận hành (🟢 OK)',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  standby: {
    label: 'Dự phòng (🟠 Standby / Ưu tiên)',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  broken: {
    label: 'Hỏng / Sự cố (🔴 Broken)',
    badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  other: {
    label: 'Khác (🟡 Alarm / Kiểm tra)',
    badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-500',
  },
};

export function validChildKinds(parentKind: WarehouseAssetKind | null): WarehouseAssetKind[] {
  if (!parentKind) return ['company'];
  if (parentKind === 'company') return ['factory'];
  if (parentKind === 'factory') return ['main_equipment'];
  return ['part'];
}

function TreeItemNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: WarehouseNode;
  selectedId: string | null;
  onSelect: (node: WarehouseNode) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const cfg = KIND_CONFIG[node.assetKind] || KIND_CONFIG.part;
  const cond = CONDITION_CONFIG[node.condition] || CONDITION_CONFIG.operating;
  const IconComp = cfg.icon;

  return (
    <div className="text-sm select-none">
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 transition-all ${
          isSelected
            ? 'bg-primary/15 font-semibold text-primary shadow-xs ring-1 ring-primary/30'
            : 'text-foreground/90 hover:bg-muted'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          type="button"
          className="grid h-5 w-5 shrink-0 place-items-center text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          {hasChildren ? (
            open ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(node)}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
              node.assetKind === 'company'
                ? 'bg-slate-800 text-white'
                : node.assetKind === 'factory'
                ? 'bg-amber-600 text-white'
                : node.assetKind === 'main_equipment'
                ? 'bg-violet-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
            title={cfg.label}
          >
            {node.assetKind === 'company'
              ? 'C'
              : node.assetKind === 'factory'
              ? 'F'
              : node.assetKind === 'main_equipment'
              ? 'M'
              : 'P'}
          </span>
          <span className="truncate font-mono text-xs text-muted-foreground">{node.code}</span>
          <span className="truncate text-xs font-medium">{node.name}</span>
          <span className={`h-2 w-2 shrink-0 rounded-full ${cond.dot}`} title={cond.label} />
        </button>
      </div>

      {open && hasChildren && (
        <div className="border-l border-border/50 ml-3.5">
          {node.children.map((child) => (
            <TreeItemNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WarehousePage() {
  const [tree, setTree] = useState<WarehouseNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<WarehouseNode | null>(null);
  const [dictionary, setDictionary] = useState<NamingDictionary>(DEFAULT_NAMING_DICTIONARY);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [nodeDialog, setNodeDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    parent?: WarehouseNode | null;
  }>({ open: false, mode: 'create' });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [matrixModalOpen, setMatrixModalOpen] = useState(false);
  const [qrModalNode, setQrModalNode] = useState<WarehouseNode | null>(null);
  const [workOrderNode, setWorkOrderNode] = useState<WarehouseNode | null>(null);
  const [crossPlantModalNode, setCrossPlantModalNode] = useState<WarehouseNode | null>(null);

  // Form states for create/edit
  const [formKind, setFormKind] = useState<WarehouseAssetKind>('part');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSymbol, setFormSymbol] = useState('');
  const [formCondition, setFormCondition] = useState<WarehouseCondition>('operating');
  const [formLocation, setFormLocation] = useState('');
  const [formSpecs, setFormSpecs] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');

  // Code generator state
  const [genCompany, setGenCompany] = useState('SB');
  const [genFactory, setGenFactory] = useState('KD');
  const [genMainPart, setGenMainPart] = useState('T');
  const [genSubPart1, setGenSubPart1] = useState('Sh');
  const [genSubPart2, setGenSubPart2] = useState('Ro');
  const [genSeq, setGenSeq] = useState('01');

  const loadData = async () => {
    try {
      const [treeData, dictData] = await Promise.all([
        warehouseService.getTree(),
        warehouseService.getDictionary(),
      ]);
      setTree(treeData);
      setDictionary(dictData);
      if (!selectedNode && treeData.length > 0) {
        // Auto select first part or factory
        const findFirstPart = (nodes: WarehouseNode[]): WarehouseNode | null => {
          for (const n of nodes) {
            if (n.assetKind === 'part') return n;
            if (n.children?.length) {
              const res = findFirstPart(n.children);
              if (res) return res;
            }
          }
          return nodes[0] || null;
        };
        setSelectedNode(findFirstPart(treeData));
      }
    } catch (e: any) {
      toast.error('Lỗi khi tải dữ liệu cây nhà kho: ' + e.message);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Update auto-generated code when generator fields change
  useEffect(() => {
    if (nodeDialog.open && nodeDialog.mode === 'create') {
      if (formKind === 'company') {
        setFormCode(genCompany);
      } else if (formKind === 'factory') {
        setFormCode(`${genCompany}-${genFactory}`);
      } else if (formKind === 'main_equipment') {
        setFormCode(`${genCompany}-${genFactory}-${genMainPart}`);
      } else {
        const subParts = [genSubPart1, genSubPart2].filter(Boolean);
        const code = warehouseService.generateCode({
          companyCode: genCompany,
          factoryCode: genFactory,
          mainPartCode: genMainPart,
          subPartCodes: subParts,
          sequenceNumber: genSeq,
        });
        setFormCode(code);
      }
    }
  }, [
    genCompany,
    genFactory,
    genMainPart,
    genSubPart1,
    genSubPart2,
    genSeq,
    formKind,
    nodeDialog.open,
    nodeDialog.mode,
  ]);

  const handleOpenCreateChild = (parent: WarehouseNode) => {
    const allowed = validChildKinds(parent.assetKind);
    const targetKind = allowed[0] || 'part';
    setFormKind(targetKind);
    setFormCode('');
    setFormName('');
    setFormSymbol('');
    setFormCondition('operating');
    setFormLocation(parent.location || '');
    setFormSpecs('');
    setFormManufacturer(parent.manufacturer || '');
    setNodeDialog({ open: true, mode: 'create', parent });
  };

  const handleOpenEdit = (node: WarehouseNode) => {
    setFormKind(node.assetKind);
    setFormCode(node.code);
    setFormName(node.name);
    setFormSymbol(node.symbol || '');
    setFormCondition(node.condition);
    setFormLocation(node.location || '');
    setFormSpecs(node.specifications || '');
    setFormManufacturer(node.manufacturer || '');
    setNodeDialog({ open: true, mode: 'edit' });
  };

  const handleSubmitNode = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (nodeDialog.mode === 'create') {
        const created = await warehouseService.addNode({
          tenantId: 'tenant-1',
          parentId: nodeDialog.parent ? nodeDialog.parent.id : null,
          code: formCode,
          name: formName,
          assetKind: formKind,
          symbol: formSymbol || undefined,
          condition: formCondition,
          location: formLocation || undefined,
          specifications: formSpecs || undefined,
          manufacturer: formManufacturer || undefined,
          schedules: formKind === 'part' ? [
            {
              id: `sch-${Date.now()}`,
              frequency: 'month',
              value: 'x',
              taskName: `Bảo dưỡng định kỳ ${formName}`,
              laborCount: 2,
              workOrderMode: 'auto',
            }
          ] : [],
        });
        toast.success(`Đã tạo thành công: ${created.code} - ${created.name}`);
      } else if (selectedNode) {
        await warehouseService.updateNode(selectedNode.id, {
          code: formCode,
          name: formName,
          symbol: formSymbol || undefined,
          condition: formCondition,
          location: formLocation || undefined,
          specifications: formSpecs || undefined,
          manufacturer: formManufacturer || undefined,
        });
        toast.success('Đã cập nhật thông tin.');
      }
      setNodeDialog({ open: false, mode: 'create' });
      await loadData();
      if (selectedNode) {
        const updated = await warehouseService.getTree();
        const findNode = (list: WarehouseNode[]): WarehouseNode | null => {
          for (const item of list) {
            if (item.id === selectedNode.id) return item;
            if (item.children) {
              const res = findNode(item.children);
              if (res) return res;
            }
          }
          return null;
        };
        const refreshed = findNode(updated);
        if (refreshed) setSelectedNode(refreshed);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu dữ liệu');
    }
  };

  const handleDelete = async (node: WarehouseNode) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${node.code} - ${node.name}?`)) return;
    try {
      await warehouseService.deleteNode(node.id);
      toast.success('Đã xóa thành công.');
      setSelectedNode(null);
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi khi xóa: ' + err.message);
    }
  };

  const collectAllParts = (nodes: WarehouseNode[]): WarehouseNode[] => {
    const list: WarehouseNode[] = [];
    const walk = (items: WarehouseNode[]) => {
      for (const item of items) {
        if (item.assetKind === 'part') list.push(item);
        if (item.children?.length) walk(item.children);
      }
    };
    walk(nodes);
    return list;
  };

  const allParts = collectAllParts(tree);

  return (
    <>
      <PageHeading
        eyebrow="Hệ thống Vận hành & CMMS"
        title="Quản lý Cây Nhà kho & Vật tư 360°"
        description="Chuẩn hóa cấu trúc cây 4 tầng (Company → Factory → Main equipments → Parts) kết hợp Quy cách đặt tên từ điển, Ma trận bảo trì ngăn ngừa và Tra cứu bù trừ dự phòng liên nhà máy."
      />

      {/* Top Action Toolbar */}
      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setFormKind('company');
              setFormCode('');
              setFormName('');
              setNodeDialog({ open: true, mode: 'create', parent: null });
            }}
          >
            <Plus size={16} /> Thêm Cấp Gốc / Công ty
          </Button>

          <Button size="sm" variant="outline" onClick={() => setMatrixModalOpen(true)}>
            <Layers size={16} /> Ma trận Lập lịch Bảo trì (Matrix View)
          </Button>

          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            <Sliders size={16} /> Từ điển Quy cách Đặt tên
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Tổng số: <strong>{allParts.length}</strong> bộ phận/phụ tùng định danh
          </span>
        </div>
      </section>

      {/* Main 2-Column Responsive Card */}
      <Card className="mt-4 overflow-hidden border">
        <CardContent className="p-0">
          <div className="grid min-h-[720px] lg:grid-cols-[330px_minmax(0,1fr)]">
            {/* Left Column: Tree View */}
            <aside className="border-b bg-muted/20 p-3 lg:border-r lg:border-b-0 flex flex-col">
              <div className="mb-2">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cây Phân Cấp 4 Tầng
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {tree.length} công ty
                  </span>
                </div>
                <Input
                  placeholder="Lọc theo mã hoặc tên..."
                  className="h-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                {tree.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    Chưa có cấu trúc cây nào.
                  </p>
                ) : (
                  tree.map((rootNode) => (
                    <TreeItemNode
                      key={rootNode.id}
                      node={rootNode}
                      selectedId={selectedNode?.id || null}
                      onSelect={(n) => setSelectedNode(n)}
                    />
                  ))
                )}
              </div>

              {/* Hierarchy Guide Box */}
              <div className="mt-2 rounded-lg border bg-background/80 p-2.5 text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Phân tầng hợp lệ:</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-800" />
                  <span>Company → </span>
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                  <span>Factory → </span>
                  <span className="h-2 w-2 rounded-full bg-violet-600" />
                  <span>Main Equipments → </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  <span>Parts (1-5 Sub-parts)</span>
                </div>
              </div>
            </aside>

            {/* Right Column: Detail & 360° Profile */}
            <main className="p-5 overflow-y-auto">
              {selectedNode ? (
                <div className="space-y-6">
                  {/* Header info & Action Bar */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                            KIND_CONFIG[selectedNode.assetKind]?.tag || 'bg-slate-700 text-white'
                          }`}
                        >
                          {KIND_CONFIG[selectedNode.assetKind]?.label || selectedNode.assetKind}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            CONDITION_CONFIG[selectedNode.condition]?.badge
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              CONDITION_CONFIG[selectedNode.condition]?.dot
                            }`}
                          />
                          {CONDITION_CONFIG[selectedNode.condition]?.label}
                        </span>
                      </div>

                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>{selectedNode.name}</span>
                        <span className="font-mono text-base font-normal text-muted-foreground">
                          ({selectedNode.code})
                        </span>
                      </h2>

                      {selectedNode.symbol && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Kí hiệu quy chuẩn: <strong className="text-foreground">{selectedNode.symbol}</strong>
                        </p>
                      )}
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedNode.assetKind === 'part' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setWorkOrderNode(selectedNode)}
                          >
                            <Wrench size={15} /> Work Order
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              toast.info(
                                `Đổi lịch bảo trì cho ${selectedNode.code}. Mở giao diện lập lịch.`
                              );
                            }}
                          >
                            <Calendar size={15} /> Change Maintenance
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              toast.success(`Đã cập nhật mức ưu tiên cao cho ${selectedNode.code}`);
                            }}
                          >
                            <ShieldAlert size={15} /> Set Priority
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setQrModalNode(selectedNode)}
                      >
                        <QrCode size={15} /> QR Code
                      </Button>

                      {validChildKinds(selectedNode.assetKind).length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCreateChild(selectedNode)}
                        >
                          <Plus size={15} /> Thêm cấp con
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        title="Chỉnh sửa"
                        onClick={() => handleOpenEdit(selectedNode)}
                      >
                        <Pencil size={16} />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        title="Xóa"
                        className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => handleDelete(selectedNode)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  {/* 2-Box Diagram Layout: Box 1 (Part Profile 360) & Box 2 (Preventive Maintenance Detail) */}
                  <div className="grid gap-5 lg:grid-cols-2">
                    {/* Box 1: Part 360° Profile */}
                    <div className="rounded-xl border bg-card p-4 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-bold text-base flex items-center gap-2">
                          <Settings className="text-emerald-600" size={18} />
                          Hồ sơ Chi tiết 360° (Part Profile)
                        </h3>
                        <span className="font-mono text-xs text-muted-foreground font-semibold">
                          {selectedNode.code}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="grid grid-cols-[130px_1fr] gap-1">
                          <span className="text-muted-foreground">Kí hiệu (Symbol):</span>
                          <span className="font-semibold">{selectedNode.symbol || '—'}</span>
                        </div>

                        <div className="grid grid-cols-[130px_1fr] gap-1">
                          <span className="text-muted-foreground">Tình trạng máy:</span>
                          <span className="font-medium">
                            {CONDITION_CONFIG[selectedNode.condition]?.label || 'Đang vận hành'}
                          </span>
                        </div>

                        <div className="grid grid-cols-[130px_1fr] gap-1">
                          <span className="text-muted-foreground">Vị trí địa điểm / Kho:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            📍 {selectedNode.location || 'Chưa thiết lập'}
                          </span>
                        </div>

                        <div className="grid grid-cols-[130px_1fr] gap-1">
                          <span className="text-muted-foreground">Thông số chính:</span>
                          <span className="leading-relaxed">
                            {selectedNode.specifications || 'Chưa cập nhật thông số quy cách.'}
                          </span>
                        </div>

                        <div className="grid grid-cols-[130px_1fr] gap-1">
                          <span className="text-muted-foreground">Nhà sản xuất:</span>
                          <span className="font-semibold">{selectedNode.manufacturer || '—'}</span>
                        </div>
                      </div>

                      {/* Documents Vault */}
                      <div className="pt-2 border-t space-y-2">
                        <p className="text-xs font-bold text-foreground">
                          Tài liệu số kèm theo (Digital Vault):
                        </p>
                        {selectedNode.documents && selectedNode.documents.length > 0 ? (
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {selectedNode.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between rounded-md border bg-muted/40 p-2 text-xs"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <FileText size={14} className="text-primary shrink-0" />
                                  <span className="truncate font-medium">{doc.name}</span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => toast.success(`Đang mở ${doc.name}`)}
                                >
                                  <Download size={12} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Chưa có tài liệu đính kèm (Manual, CO/CQ, Test Report).
                          </p>
                        )}
                      </div>

                      {/* AI Feature: Cross-plant spare parts suggestion */}
                      {selectedNode.crossPlantSpareAvailable && (
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1">
                                🤖 Tính năng AI / Mạng lưới Liên Nhà Máy:
                              </p>
                              <p className="mt-1 text-xs text-indigo-900 dark:text-indigo-300">
                                Phát hiện <strong>phụ tùng dự phòng lắp lẫn tương thích</strong> tại nhà máy thành viên khác!
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-indigo-300 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-900/50 text-[11px]"
                              onClick={() => setCrossPlantModalNode(selectedNode)}
                            >
                              <ArrowRightLeft size={13} /> Xem điều chuyển
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Box 2: Preventive Maintenance Detail (Lập lịch bảo trì ngăn ngừa) */}
                    <div className="rounded-xl border bg-card p-4 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-bold text-base flex items-center gap-2">
                          <Calendar className="text-blue-600" size={18} />
                          Lập Lịch Bảo Trì Ngăn Ngừa (Part Maintenance)
                        </h3>
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                          {selectedNode.schedules?.length ? `${selectedNode.schedules.length} Lịch trình` : 'Chưa lập lịch'}
                        </span>
                      </div>

                      {selectedNode.schedules && selectedNode.schedules.length > 0 ? (
                        <div className="space-y-3">
                          {selectedNode.schedules.map((sch) => (
                            <div
                              key={sch.id}
                              className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-primary font-bold">{sch.taskName}</span>
                                <span className="uppercase text-[10px] rounded bg-primary/10 px-2 py-0.5 text-primary">
                                  Chu kỳ: {sch.frequency}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                <div>
                                  Định mức nhân công: <strong className="text-foreground">{sch.laborCount || 2} công</strong>
                                </div>
                                <div>
                                  Thời gian: <strong className="text-foreground">{sch.startTime || '08:00'} - {sch.finishTime || '16:30'}</strong>
                                </div>
                              </div>

                              {sch.toolsNeeded && (
                                <div>
                                  <span className="text-muted-foreground">Công cụ sử dụng: </span>
                                  <span className="font-medium text-foreground">
                                    {sch.toolsNeeded.join(', ')}
                                  </span>
                                </div>
                              )}

                              {sch.assignedTeam && (
                                <div className="flex items-center gap-1.5">
                                  <User size={13} className="text-muted-foreground" />
                                  <span className="text-muted-foreground">Team thực hiện: </span>
                                  <span className="font-medium text-foreground">
                                    {sch.assignedTeam.join(', ')}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                                <span className="text-muted-foreground">
                                  Lịch kế tiếp: <strong className="text-emerald-600">{sch.nextDueDate || 'Theo chu kỳ'}</strong>
                                </span>
                                <span className="font-mono text-muted-foreground">
                                  Mode: {sch.workOrderMode === 'auto' ? 'Tự động lập lịch' : 'Thủ công'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground space-y-2">
                          <p>Chưa có cấu hình lịch bảo trì ngăn ngừa cho bộ phận này.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              toast.info('Đang thêm lịch bảo trì mới...');
                            }}
                          >
                            <Plus size={14} /> Thêm chu kỳ bảo trì
                          </Button>
                        </div>
                      )}

                      {/* Status Color Legend */}
                      <div className="rounded-lg border bg-muted/40 p-2.5 text-[11px] space-y-1">
                        <p className="font-semibold text-foreground">Quy chuẩn Bảng màu trạng thái:</p>
                        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 🟢 Xanh: OK (Vận hành tốt)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500" /> 🟡 Vàng: Alarm (Cảnh báo định kỳ)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-orange-500" /> 🟠 Cam: Ưu tiên (Cần xử lý/dời lịch)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-rose-500" /> 🔴 Đỏ: Sự cố (Hỏng/dừng máy)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-components / Children List if has any */}
                  {selectedNode.children && selectedNode.children.length > 0 && (
                    <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-bold text-sm">
                          Các Bộ phận / Vị trí Trực thuộc ({selectedNode.children.length})
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenCreateChild(selectedNode)}
                        >
                          <Plus size={14} /> Thêm cấp con
                        </Button>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {selectedNode.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            className="flex items-start justify-between rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                            onClick={() => setSelectedNode(child)}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-mono text-xs font-semibold text-primary truncate">
                                {child.code}
                              </p>
                              <p className="text-xs font-medium text-foreground truncate mt-0.5">
                                {child.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate mt-1">
                                📍 {child.location || '—'}
                              </p>
                            </div>
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${
                                CONDITION_CONFIG[child.condition]?.dot
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Cpu size={48} className="opacity-20 mb-3" />
                  <p className="text-base font-semibold">Chọn một bộ phận hoặc thiết bị từ cây bên trái</p>
                  <p className="text-xs max-w-md mt-1">
                    Cây phân cấp 4 tầng hỗ trợ xem hồ sơ 360°, cấu hình ma trận bảo trì ngăn ngừa và quản lý vị trí vật tư.
                  </p>
                </div>
              )}
            </main>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Create / Edit Node */}
      <Dialog
        open={nodeDialog.open}
        onOpenChange={(v) => !v && setNodeDialog({ open: false, mode: 'create' })}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {nodeDialog.mode === 'create'
                ? `Tạo ${KIND_CONFIG[formKind]?.label || 'Cấp Cây Mới'}`
                : `Chỉnh Sửa Thông Tin: ${selectedNode?.code}`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitNode} className="space-y-4 text-xs">
            {/* Kind Selector */}
            {nodeDialog.mode === 'create' && (
              <div>
                <Label>Cấp bậc (Phân tầng)</Label>
                <Select
                  value={formKind}
                  onValueChange={(val) => setFormKind(val as WarehouseAssetKind)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {validChildKinds(nodeDialog.parent?.assetKind || null).map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_CONFIG[k]?.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Smart Code Generator for Part */}
            {nodeDialog.mode === 'create' && formKind === 'part' && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <p className="font-bold text-foreground flex items-center justify-between">
                  <span>Quy cách Đặt tên Tự động (Từ điển Cài đặt):</span>
                  <span className="font-mono text-primary font-bold">{formCode}</span>
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Mã Cty</Label>
                    <Select value={genCompany} onValueChange={setGenCompany}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dictionary.companyCodes).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {k} ({v.split('(')[0]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px]">Mã Factory</Label>
                    <Select value={genFactory} onValueChange={setGenFactory}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dictionary.factoryCodes).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px]">Main Parts (1)</Label>
                    <Select value={genMainPart} onValueChange={setGenMainPart}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dictionary.mainParts).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {k} - {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Sub Parts (1)</Label>
                    <Select value={genSubPart1} onValueChange={setGenSubPart1}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dictionary.subParts).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {k} - {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px]">Sub Parts (2..5)</Label>
                    <Select value={genSubPart2} onValueChange={setGenSubPart2}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Không có" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Không có --</SelectItem>
                        {Object.entries(dictionary.subParts).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {k} - {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px]">Thứ tự parts</Label>
                    <Input
                      className="h-7 text-xs font-mono"
                      value={genSeq}
                      onChange={(e) => setGenSeq(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mã định danh (Code) *</Label>
                <Input
                  className="mt-1 font-mono font-bold"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Tên hiển thị *</Label>
                <Input
                  className="mt-1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kí hiệu (Symbol)</Label>
                <Input
                  className="mt-1"
                  placeholder="VD: S-01, Sh-01..."
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                />
              </div>

              <div>
                <Label>Tình trạng vận hành</Label>
                <Select
                  value={formCondition}
                  onValueChange={(v) => setFormCondition(v as WarehouseCondition)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Vị trí địa điểm / Nhà kho lưu trữ</Label>
              <Input
                className="mt-1"
                placeholder="VD: Kho vật tư số 01 - Kệ A2 - Ngăn 04..."
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>

            <div>
              <Label>Thông số kỹ thuật / Quy cách / Vật liệu</Label>
              <Input
                className="mt-1"
                placeholder="VD: Thép không gỉ ZG06Cr13Ni4Mo, D=380mm..."
                value={formSpecs}
                onChange={(e) => setFormSpecs(e.target.value)}
              />
            </div>

            <div>
              <Label>Nhà sản xuất</Label>
              <Input
                className="mt-1"
                placeholder="VD: Andritz Hydro, Harbin Electric, Dongfang..."
                value={formManufacturer}
                onChange={(e) => setFormManufacturer(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNodeDialog({ open: false, mode: 'create' })}
              >
                Hủy
              </Button>
              <Button type="submit">Lưu thông tin</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Preventive Maintenance Matrix Overview */}
      <Dialog open={matrixModalOpen} onOpenChange={setMatrixModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="text-blue-600" size={20} />
              Ma Trận Lập Lịch Bảo Trì Ngăn Ngừa (Preventive Maintenance Matrix)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              Bảng ma trận chu kỳ bảo trì theo các cấp độ thời gian (Day, Week, Month, Quarter, Year) theo sơ đồ quy chuẩn.
            </p>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/80 text-foreground border-b font-bold">
                  <tr>
                    <th className="p-3">Bộ phận / Chi tiết (Parts)</th>
                    <th className="p-3 font-mono">Mã tài sản</th>
                    <th className="p-3 text-center bg-blue-50/50 dark:bg-blue-950/20">Day (Ngày)</th>
                    <th className="p-3 text-center bg-indigo-50/50 dark:bg-indigo-950/20">Week (Tuần)</th>
                    <th className="p-3 text-center bg-violet-50/50 dark:bg-violet-950/20">Month (Tháng)</th>
                    <th className="p-3 text-center bg-amber-50/50 dark:bg-amber-950/20">Quarter (Quý)</th>
                    <th className="p-3 text-center bg-rose-50/50 dark:bg-rose-950/20">Year (Năm)</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allParts.map((part) => {
                    const daySch = part.schedules?.find((s) => s.frequency === 'day');
                    const weekSch = part.schedules?.find((s) => s.frequency === 'week');
                    const monthSch = part.schedules?.find((s) => s.frequency === 'month');
                    const quarterSch = part.schedules?.find((s) => s.frequency === 'quarter');
                    const yearSch = part.schedules?.find((s) => s.frequency === 'year');

                    return (
                      <tr key={part.id} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold text-foreground">
                          {part.name}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{part.code}</td>
                        <td className="p-3 text-center font-bold text-blue-600 bg-blue-50/30 dark:bg-blue-950/10">
                          {daySch ? (daySch.value || 'x') : '—'}
                        </td>
                        <td className="p-3 text-center font-bold text-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/10">
                          {weekSch ? (weekSch.value || 'x') : '—'}
                        </td>
                        <td className="p-3 text-center font-bold text-violet-600 bg-violet-50/30 dark:bg-violet-950/10">
                          {monthSch ? (monthSch.value || 'x') : '—'}
                        </td>
                        <td className="p-3 text-center font-bold text-amber-600 bg-amber-50/30 dark:bg-amber-950/10">
                          {quarterSch ? (quarterSch.value || '1') : '—'}
                        </td>
                        <td className="p-3 text-center font-bold text-rose-600 bg-rose-50/30 dark:bg-rose-950/10">
                          {yearSch ? (yearSch.value || '1') : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSelectedNode(part);
                              setMatrixModalOpen(false);
                            }}
                          >
                            Xem chi tiết
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Settings Dictionary */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders size={20} className="text-primary" />
              Cài Đặt Từ Điển Quy Cách Đặt Tên (Settings Dictionary)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              Định nghĩa bảng ký hiệu viết tắt chuẩn hóa cho Main parts và Sub parts phục vụ tự động sinh mã định danh và in mã QR.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-bold text-foreground">Phân hệ Chính (Main Parts)</h4>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {Object.entries(dictionary.mainParts).map(([code, name]) => (
                    <div key={code} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1">
                      <span className="font-mono font-bold text-primary">{code}</span>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-bold text-foreground">Bộ phận / Chi tiết (Sub Parts)</h4>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {Object.entries(dictionary.subParts).map(([code, name]) => (
                    <div key={code} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1">
                      <span className="font-mono font-bold text-emerald-600">{code}</span>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 text-[11px] space-y-1">
              <p className="font-bold text-foreground">Ví dụ quy cách sinh mã chuẩn:</p>
              <p className="font-mono">SB-KD-T-S-01 (Công ty SB - Nhà máy KD - Tuabin - Buồng xoắn - 01)</p>
              <p className="font-mono">SB-KD-T-Sh-Ro-01 (Công ty SB - Nhà máy KD - Tuabin - Trục - Roăng làm kín - 01)</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: QR Code Generator */}
      <Dialog open={!!qrModalNode} onOpenChange={(v) => !v && setQrModalNode(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Mã QR Định Danh Thông Minh</DialogTitle>
          </DialogHeader>

          {qrModalNode && (
            <div className="space-y-3 py-2 text-xs">
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-muted/20 p-4">
                {/* Simulated QR Code Box with dynamic label */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <QrCode size={96} className="text-primary" />
                  <span className="font-mono text-[10px] font-bold text-foreground">
                    {qrModalNode.code}
                  </span>
                </div>
              </div>

              <div>
                <p className="font-bold text-sm text-foreground">{qrModalNode.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{qrModalNode.code}</p>
                <p className="text-[11px] text-muted-foreground mt-1">📍 {qrModalNode.location || 'Kho Nhà máy'}</p>
              </div>

              <div className="flex justify-center gap-2 pt-2 border-t">
                <Button size="sm" onClick={() => toast.success('Đã gửi lệnh in tem nhãn QR')}>
                  In Tem Nhãn QR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Cross-Plant Spare Parts Suggestion Modal */}
      <Dialog open={!!crossPlantModalNode} onOpenChange={(v) => !v && setCrossPlantModalNode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="text-indigo-600" size={20} />
              Mạng Lưới Dự Phòng & Bù Trừ Đa Nhà Máy
            </DialogTitle>
          </DialogHeader>

          {crossPlantModalNode && (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border bg-muted/30 p-2.5">
                <p className="text-muted-foreground">Bộ phận hiện tại:</p>
                <p className="font-bold text-foreground text-sm">{crossPlantModalNode.name}</p>
                <p className="font-mono text-primary">{crossPlantModalNode.code}</p>
              </div>

              <p className="font-bold text-foreground">Danh mục phụ tùng lắp lẫn khả dụng tại các kho khác:</p>

              {crossPlantModalNode.crossPlantSuggestions?.map((sug, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-2 dark:border-indigo-900 dark:bg-indigo-950/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{sug.plantName}</p>
                      <p className="text-muted-foreground">📍 {sug.warehouseName}</p>
                    </div>
                    <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      Tồn: {sug.availableQty} cái
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-indigo-200/60 pt-2 dark:border-indigo-900/60">
                    <span className="font-mono font-semibold text-primary">{sug.partCode}</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                      ✓ {sug.matchRate}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => {
                      toast.success(
                        `Đã tạo yêu cầu điều chuyển phụ tùng ${sug.partCode} từ ${sug.plantName}`
                      );
                      setCrossPlantModalNode(null);
                    }}
                  >
                    Tạo Yêu Cầu Điều Chuyển Bù Trừ Khẩn Cấp
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Quick Work Order */}
      <Dialog open={!!workOrderNode} onOpenChange={(v) => !v && setWorkOrderNode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="text-blue-600" size={20} />
              Kích Hoạt Work Order (Lệnh Công Việc)
            </DialogTitle>
          </DialogHeader>

          {workOrderNode && (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border bg-muted/40 p-2.5">
                <p className="text-muted-foreground">Thiết bị / Chi tiết thực hiện:</p>
                <p className="font-bold text-sm">{workOrderNode.name}</p>
                <p className="font-mono text-primary">{workOrderNode.code}</p>
              </div>

              <div>
                <Label>Nội dung công việc</Label>
                <Input
                  className="mt-1"
                  defaultValue={`Bảo dưỡng ngăn ngừa & kiểm tra ${workOrderNode.name}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Định mức nhân công</Label>
                  <Input className="mt-1" defaultValue="2 công" />
                </div>
                <div>
                  <Label>Mức độ ưu tiên</Label>
                  <Select defaultValue="High">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">Cao (High)</SelectItem>
                      <SelectItem value="Normal">Bình thường (Normal)</SelectItem>
                      <SelectItem value="Low">Thấp (Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Người / Team phụ trách</Label>
                <Input className="mt-1" defaultValue="Nguyễn Văn A (Đội trưởng cơ khí)" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setWorkOrderNode(null)}>
                  Hủy
                </Button>
                <Button
                  onClick={() => {
                    toast.success(`Đã kích hoạt Work Order cho ${workOrderNode.code}!`);
                    setWorkOrderNode(null);
                  }}
                >
                  Phát Hành Lệnh Công Việc
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

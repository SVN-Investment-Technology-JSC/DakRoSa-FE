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
  Folder,
  CircleDot,
  MoreVertical,
  Printer,
  Zap,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  BookmarkCheck,
  Search,
  Filter,
  Eye,
  Info,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TransactionType,
  InventoryTransaction,
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
  { label: string; badge: string; dot: string; textClass: string; title: string }
> = {
  operating: {
    title: 'Green Status',
    label: 'Operating',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-300',
  },
  standby: {
    title: 'Amber Status',
    label: 'Standby / Ưu tiên',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-300',
  },
  broken: {
    title: 'Red Status',
    label: 'Broken / Sự cố',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dot: 'bg-rose-500',
    textClass: 'text-rose-700 dark:text-rose-300',
  },
  maintenance: {
    title: 'Blue Status',
    label: 'Maintenance',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  calibrating: {
    title: 'Purple Status',
    label: 'Calibrating',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    dot: 'bg-purple-500',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  other: {
    title: 'Slate Status',
    label: 'Alarm / Kiểm tra',
    badge: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
    dot: 'bg-slate-500',
    textClass: 'text-slate-700 dark:text-slate-300',
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
  const cond = CONDITION_CONFIG[node.condition] || CONDITION_CONFIG.operating;

  const renderIcon = () => {
    if (node.assetKind === 'company') {
      return <Building2 size={15} className="text-slate-700 dark:text-slate-300" />;
    }
    if (node.assetKind === 'factory') {
      return <Factory size={15} className="text-amber-600 dark:text-amber-400" />;
    }
    if (node.assetKind === 'main_equipment') {
      return <Cpu size={15} className="text-violet-600 dark:text-violet-400" />;
    }
    return <CircleDot size={14} className="text-blue-500 dark:text-blue-400" />;
  };

  return (
    <div className="text-sm select-none">
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 transition-all cursor-pointer ${
          isSelected
            ? 'bg-blue-50/90 font-medium text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-800 shadow-xs'
            : 'text-foreground/85 hover:bg-muted/60'
        }`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        onClick={() => onSelect(node)}
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

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0">{renderIcon()}</span>
          <span className="truncate text-xs font-medium">
            {node.assetKind === 'company' && `Company (${node.code})`}
            {node.assetKind === 'factory' && `Factory (${node.name.replace('Nhà máy Thủy điện ', '')})`}
            {node.assetKind === 'main_equipment' && `Main Equipment (${node.symbol || node.name})`}
            {node.assetKind === 'part' && `${node.name}`}
          </span>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cond.dot}`} title={cond.label} />
        </div>
      </div>

      {open && hasChildren && (
        <div className="border-l border-border/40 ml-3.5">
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
  const [activeTab, setActiveTab] = useState('overview');

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
  const [rescheduleNode, setRescheduleNode] = useState<WarehouseNode | null>(null);
  const [priorityNode, setPriorityNode] = useState<WarehouseNode | null>(null);
  const [crossPlantModalNode, setCrossPlantModalNode] = useState<WarehouseNode | null>(null);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);

  // Form states for create/edit
  const [formKind, setFormKind] = useState<WarehouseAssetKind>('part');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSymbol, setFormSymbol] = useState('');
  const [formCondition, setFormCondition] = useState<WarehouseCondition>('operating');
  const [formLocation, setFormLocation] = useState('');
  const [formSpecs, setFormSpecs] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formMaterial, setFormMaterial] = useState('');
  const [formDimensions, setFormDimensions] = useState('');
  const [formOperatingTemp, setFormOperatingTemp] = useState('');
  const [formPressureRating, setFormPressureRating] = useState('');

  // Code generator state
  const [genCompany, setGenCompany] = useState('SB');
  const [genFactory, setGenFactory] = useState('KD');
  const [genMainPart, setGenMainPart] = useState('T');
  const [genSubPart1, setGenSubPart1] = useState('Sh');
  const [genSubPart2, setGenSubPart2] = useState('Ro');
  const [genSeq, setGenSeq] = useState('01');

  // Transaction form state
  const [txType, setTxType] = useState<TransactionType>('OUT');
  const [txQty, setTxQty] = useState(1);
  const [txRefType, setTxRefType] = useState<'WORK_ORDER' | 'PURCHASE_ORDER' | 'OPERATION'>('WORK_ORDER');
  const [txRefId, setTxRefId] = useState('WO-2026-0815');
  const [txRequester, setTxRequester] = useState('Nguyễn Văn A (Đội trưởng cơ khí)');
  const [txNotes, setTxNotes] = useState('Xuất kho phục vụ thay thế định kỳ theo kế hoạch bảo trì');

  // Reserve form state
  const [resQty, setResQty] = useState(1);
  const [resWoId, setResWoId] = useState('WO-2026-0815');

  const loadData = async () => {
    try {
      const [treeData, dictData] = await Promise.all([
        warehouseService.getTree(),
        warehouseService.getDictionary(),
      ]);
      setTree(treeData);
      setDictionary(dictData);
      
      if (!selectedNode && treeData.length > 0) {
        // Find default node: SB-KD-T-Sh-Ro-01
        const findTargetNode = (nodes: WarehouseNode[]): WarehouseNode | null => {
          for (const n of nodes) {
            if (n.code === 'SB-KD-T-Sh-Ro-01') return n;
            if (n.children?.length) {
              const res = findTargetNode(n.children);
              if (res) return res;
            }
          }
          return null;
        };
        const target = findTargetNode(treeData);
        setSelectedNode(target || treeData[0] || null);
      }
    } catch (e: any) {
      toast.error('Lỗi khi tải dữ liệu nhà kho: ' + e.message);
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
    setFormModel('');
    setFormSerial('');
    setFormMaterial('');
    setFormDimensions('');
    setFormOperatingTemp('');
    setFormPressureRating('');
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
    setFormModel(node.model || '');
    setFormSerial(node.serialNumber || '');
    setFormMaterial(node.material || '');
    setFormDimensions(node.dimensions || '');
    setFormOperatingTemp(node.operatingTemp || '');
    setFormPressureRating(node.pressureRating || '');
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
          model: formModel || undefined,
          serialNumber: formSerial || undefined,
          material: formMaterial || undefined,
          dimensions: formDimensions || undefined,
          operatingTemp: formOperatingTemp || undefined,
          pressureRating: formPressureRating || undefined,
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
          model: formModel || undefined,
          serialNumber: formSerial || undefined,
          material: formMaterial || undefined,
          dimensions: formDimensions || undefined,
          operatingTemp: formOperatingTemp || undefined,
          pressureRating: formPressureRating || undefined,
        });
        toast.success('Đã cập nhật thông tin.');
      }
      setNodeDialog({ open: false, mode: 'create' });
      await loadData();
      if (selectedNode) {
        const refreshed = await warehouseService.findNodeById(selectedNode.id);
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

  const handleCreateTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;
    try {
      const codePrefix = txType === 'IN' ? 'NK' : txType === 'OUT' ? 'XK' : txType === 'TRANSFER' ? 'DC' : 'MT';
      const code = `${codePrefix}-${Date.now().toString().slice(-6)}`;
      await warehouseService.addTransaction(selectedNode.id, {
        transactionCode: code,
        transactionType: txType,
        itemCode: selectedNode.code,
        itemName: selectedNode.name,
        quantity: Number(txQty),
        unit: selectedNode.stock?.unit || 'Cái',
        fromLocation: txType === 'IN' ? 'Nhà cung cấp' : selectedNode.location,
        toLocation: txType === 'IN' ? selectedNode.location : 'Hiện trường thi công',
        referenceType: txRefType,
        referenceId: txRefId,
        requester: txRequester,
        approver: 'Nguyễn Văn Tuấn (Phó Giám đốc Kỹ thuật)',
        executor: 'Lê Hữu Đạt (Thủ kho)',
        status: 'COMPLETED',
        notes: txNotes,
      });

      toast.success(`Đã tạo phiếu giao dịch ${code} (${txType}) thành công! Tồn kho đã được cập nhật.`);
      setTransactionModalOpen(false);
      const refreshed = await warehouseService.findNodeById(selectedNode.id);
      if (refreshed) setSelectedNode(refreshed);
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi giao dịch: ' + err.message);
    }
  };

  const handleReserve = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;
    try {
      await warehouseService.reserveMaterial(selectedNode.id, Number(resQty), resWoId);
      toast.success(`Đã giữ chỗ ${resQty} cái cho Lệnh bảo trì ${resWoId}!`);
      setReserveModalOpen(false);
      const refreshed = await warehouseService.findNodeById(selectedNode.id);
      if (refreshed) setSelectedNode(refreshed);
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi giữ chỗ: ' + err.message);
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
  const conditionCfg = selectedNode ? (CONDITION_CONFIG[selectedNode.condition] || CONDITION_CONFIG.operating) : CONDITION_CONFIG.operating;

  return (
    <>
      <PageHeading
        eyebrow="Hệ thống Vận hành & Quản lý Nhà kho"
        title="Quản lý Cây Nhà kho & Tài sản 360°"
        description="Mô hình nhà kho độc lập theo chuẩn transaction-driven: Quản lý cây phân cấp, dữ liệu đặc tả kỹ thuật, kho tài liệu số, ma trận bảo trì và tra cứu phụ tùng dự phòng đa nhà máy."
      />

      {/* Top Action Toolbar */}
      <section className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setFormKind('company');
              setFormCode('');
              setFormName('');
              setNodeDialog({ open: true, mode: 'create', parent: null });
            }}
          >
            <Plus size={15} /> Thêm Cấp Công Ty
          </Button>

          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setMatrixModalOpen(true)}>
            <Layers size={15} /> Ma trận Lập lịch Bảo trì
          </Button>

          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSettingsOpen(true)}>
            <Sliders size={15} /> Từ điển Quy cách Đặt tên
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Tổng số: <strong className="text-foreground">{allParts.length}</strong> phụ tùng định danh
          </span>
        </div>
      </section>

      {/* Main 2-Column Responsive Card matching main_UI.jpg */}
      <Card className="mt-3 overflow-hidden border shadow-xs bg-background">
        <CardContent className="p-0">
          <div className="grid min-h-[760px] lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Left Column: Asset 360 Tree */}
            <aside className="border-b bg-slate-50/50 dark:bg-slate-950/20 p-3 lg:border-r lg:border-b-0 flex flex-col">
              <div className="mb-2.5 flex items-center justify-between pb-1 border-b border-border/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Asset 360</span>
                </h3>
                <span className="text-[11px] text-muted-foreground font-mono">
                  «
                </span>
              </div>

              <div className="mb-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="h-8 pl-8 text-xs bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
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

              {/* Quick Hierarchy Footer */}
              <div className="mt-2 rounded-md border bg-background p-2 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground text-[10px] uppercase tracking-wide">Cấu trúc phân cấp:</p>
                <p className="mt-0.5 truncate">🏢 Company → 🏭 Factory → ⚙️ Main Equipment → ⭕ Parts</p>
              </div>
            </aside>

            {/* Right Column: Detail & 360° Profile exact to main_UI.jpg */}
            <main className="p-5 overflow-y-auto space-y-5 bg-background">
              {selectedNode ? (
                <>
                  {/* Header Row exact to main_UI.jpg */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>{selectedNode.name}</span>
                      </h1>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">
                        Mã định danh: <strong className="text-foreground">{selectedNode.code}</strong> {selectedNode.symbol && `| Ký hiệu: ${selectedNode.symbol}`}
                      </p>
                    </div>

                    {/* QR Code & Status Cards + Action Buttons matching main_UI.jpg */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* QR Code Card */}
                      <button
                        type="button"
                        onClick={() => setQrModalNode(selectedNode)}
                        className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 shadow-2xs hover:bg-muted/50 transition-all text-left"
                      >
                        <div className="grid h-7 w-7 place-items-center rounded bg-muted/60">
                          <QrCode size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold leading-none text-foreground">QR Code</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Scannable</p>
                        </div>
                      </button>

                      {/* Status Card */}
                      <div className="flex flex-col justify-center rounded-lg border border-border/70 bg-card px-3 py-1.5 shadow-2xs">
                        <p className="text-[10px] font-semibold text-muted-foreground leading-none">{conditionCfg.title}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${conditionCfg.dot}`} />
                          <span className={`text-[11px] font-bold ${conditionCfg.textClass}`}>{conditionCfg.label}</span>
                        </div>
                      </div>

                      {/* Action Buttons exact to main_UI.jpg */}
                      <Button
                        size="sm"
                        className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 shadow-xs"
                        onClick={() => setWorkOrderNode(selectedNode)}
                      >
                        <Pencil size={13} className="mr-1" /> Create Work Order
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 border-border/80"
                        onClick={() => setRescheduleNode(selectedNode)}
                      >
                        <Calendar size={13} className="mr-1" /> Reschedule
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 border-border/80"
                        onClick={() => setPriorityNode(selectedNode)}
                      >
                        <Zap size={13} className="mr-1" /> Set Priority
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 border-border/80"
                        onClick={() => {
                          toast.success(`Đang gửi lệnh in tem QR cho ${selectedNode.code}`);
                        }}
                      >
                        <Printer size={13} className="mr-1" /> Print QR
                      </Button>

                      {validChildKinds(selectedNode.assetKind).length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs px-2"
                          title="Thêm cấp con"
                          onClick={() => handleOpenCreateChild(selectedNode)}
                        >
                          <Plus size={15} />
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Chỉnh sửa node"
                        onClick={() => handleOpenEdit(selectedNode)}
                      >
                        <Pencil size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Navigation Tabs matching main_UI.jpg + plan_2.md */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0 gap-4">
                      <TabsTrigger
                        value="overview"
                        className="rounded-none border-b-2 border-transparent px-2 py-1.5 text-xs font-semibold text-muted-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                      >
                        Overview & Specs <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">Active</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="documents"
                        className="rounded-none border-b-2 border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                      >
                        Documents ({selectedNode.documents?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger
                        value="timeline"
                        className="rounded-none border-b-2 border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                      >
                        Timeline & Incidents
                      </TabsTrigger>
                      <TabsTrigger
                        value="bom"
                        className="rounded-none border-b-2 border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                      >
                        Spare Parts & Tools (BOM)
                      </TabsTrigger>
                      <TabsTrigger
                        value="maintenance"
                        className="rounded-none border-b-2 border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                      >
                        Maintenance Plan
                      </TabsTrigger>
                      <TabsTrigger
                        value="crossplant"
                        className="rounded-none border-b-2 border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                      >
                        Cross-Plant Stock Buffer
                      </TabsTrigger>
                      <TabsTrigger
                        value="transactions"
                        className="rounded-none border-b-2 border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                      >
                        Sổ Giao Dịch & Giữ Chỗ (Stock)
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Overview & Specs matching main_UI.jpg */}
                    <TabsContent value="overview" className="mt-4 space-y-4">
                      {/* Top 2 Cards: Technical Specifications & Attached Documents */}
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Card 1: Technical Specifications */}
                        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
                          <h3 className="text-sm font-bold text-foreground">
                            Technical Specifications
                          </h3>

                          <div className="grid grid-cols-[140px_1fr] gap-y-2 text-xs">
                            <span className="text-muted-foreground">Model</span>
                            <span className="font-semibold text-foreground">{selectedNode.model || selectedNode.code}</span>

                            <span className="text-muted-foreground">Serial</span>
                            <span className="font-semibold text-foreground">{selectedNode.serialNumber || 'SB-HNT000002'}</span>

                            <span className="text-muted-foreground">Material</span>
                            <span className="font-semibold text-foreground">{selectedNode.material || 'Nitrile Rubber'}</span>

                            <span className="text-muted-foreground">Dimensions</span>
                            <span className="font-semibold text-foreground">{selectedNode.dimensions || '120 × 12.9 mm × 15.20 mm'}</span>

                            <span className="text-muted-foreground">Operating Temp</span>
                            <span className="font-semibold text-foreground">{selectedNode.operatingTemp || '-20 - 50°C'}</span>

                            <span className="text-muted-foreground">Pressure Rating</span>
                            <span className="font-semibold text-foreground">{selectedNode.pressureRating || '100 MP/a'}</span>

                            <span className="text-muted-foreground">Vị trí lưu kho</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              📍 {selectedNode.location || 'Kho Khe Diên - Kệ A2 - Tầng 2 - Ngăn 04'}
                            </span>
                          </div>
                        </div>

                        {/* Card 2: Attached Documents with List icon */}
                        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">
                              Attached Documents
                            </h3>
                            <button
                              type="button"
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                              onClick={() => setActiveTab('documents')}
                            >
                              <Layers size={13} /> List
                            </button>
                          </div>

                          <div className="space-y-2">
                            {selectedNode.documents && selectedNode.documents.length > 0 ? (
                              selectedNode.documents.map((doc, idx) => {
                                const isManual = doc.name.toLowerCase().includes('manual');
                                const isCocq = doc.name.toLowerCase().includes('co-cq') || doc.name.toLowerCase().includes('cocq');
                                const iconColor = isManual
                                  ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/50'
                                  : isCocq
                                  ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50'
                                  : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50';

                                return (
                                  <div
                                    key={doc.id || idx}
                                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs hover:bg-muted/40 transition-all"
                                  >
                                    <div className="flex items-center gap-2.5 truncate">
                                      <div className={`grid h-7 w-7 place-items-center rounded ${iconColor}`}>
                                        <FileText size={15} />
                                      </div>
                                      <div>
                                        <p className="font-semibold text-foreground truncate">{doc.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{doc.fileSize || '2.4 MB'} • Uploaded {doc.uploadedAt}</p>
                                      </div>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => toast.success(`Đang mở tài liệu ${doc.name}`)}
                                    >
                                      <MoreVertical size={14} />
                                    </Button>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-muted-foreground italic py-3 text-center">
                                Chưa có tài liệu đính kèm.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Maintenance Requirements */}
                      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
                        <h3 className="text-sm font-bold text-foreground">
                          Maintenance Requirements
                        </h3>

                        <div className="grid gap-4 md:grid-cols-2 text-xs">
                          <div>
                            <p className="text-muted-foreground font-medium">Required Tools</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {selectedNode.requiredTools?.join(', ') || 'Torque Wrench 150Nm, Vernier Caliper'}
                            </p>
                          </div>

                          <div>
                            <p className="text-muted-foreground font-medium">Labor Requirement</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {selectedNode.laborRequirement || '2 Workers'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Cross-Plant Spare Parts Buffer matching main_UI.jpg banner */}
                      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs dark:border-blue-900/60 dark:bg-blue-950/20 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-blue-950 dark:text-blue-200">
                            Cross-Plant Spare Parts Buffer: 1 compatible standby unit found in Plant 2 (SB-HN-T-Sh-Ro-02) - Manual Engineer Review & Transfer Approval required
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200/80 bg-card/90 p-3 dark:border-blue-900/80">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-lg border bg-muted/40">
                              <span className="text-lg">⭕</span>
                            </div>
                            <div className="text-xs">
                              <p className="font-bold text-foreground">
                                SB-KD-T-Sh-Ro-01 (Shaft Sealing Ring)
                              </p>
                              <p className="font-mono text-muted-foreground text-[11px]">
                                SB-HN-T-Sh-Ro-02
                              </p>
                            </div>
                          </div>

                          <div className="text-xs">
                            <p className="text-muted-foreground text-[11px]">Part in Plant</p>
                            <p className="font-semibold text-foreground">Plant 2 (Krông H&apos;năng)</p>
                          </div>

                          <div className="text-xs">
                            <p className="text-muted-foreground text-[11px]">Current status</p>
                            <p className="font-semibold text-amber-700 dark:text-amber-300">2.5 kW / Standby</p>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 text-xs font-semibold"
                            onClick={() => setCrossPlantModalNode(selectedNode)}
                          >
                            View part Plant
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 2: Documents Vault */}
                    <TabsContent value="documents" className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-foreground">Kho Tài Liệu Kỹ Thuật Số Hóa (Digital Document Vault)</h3>
                          <p className="text-xs text-muted-foreground">Tài liệu gắn trực tiếp với tài sản: Hướng dẫn sử dụng (Manual), Chứng chỉ xuất xưởng (CO/CQ), Biên bản thử nghiệm (Test Report).</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => toast.info('Mở hộp thoại tải lên tài liệu')}
                        >
                          <Plus size={14} className="mr-1" /> Tải lên tài liệu
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedNode.documents?.map((doc) => (
                          <div key={doc.id} className="rounded-xl border bg-card p-3.5 space-y-2 shadow-2xs">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className="grid h-8 w-8 place-items-center rounded bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                  <FileText size={16} />
                                </div>
                                <div className="truncate">
                                  <p className="font-bold text-xs truncate">{doc.name}</p>
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{doc.type}</p>
                                </div>
                              </div>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                {doc.fileSize || 'PDF'}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground">Ngày tải lên: {doc.uploadedAt}</p>

                            <div className="flex justify-end gap-1.5 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => toast.success(`Đang mở xem trước ${doc.name}`)}
                              >
                                <Eye size={12} className="mr-1" /> Xem
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => toast.success(`Đang tải file ${doc.name}`)}
                              >
                                <Download size={12} className="mr-1" /> Tải về
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Tab 3: Timeline & Incidents */}
                    <TabsContent value="timeline" className="mt-4 space-y-4">
                      <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-3">
                        <h3 className="font-bold text-sm text-foreground">Nhật Ký Vận Hành & Lịch Sử Sự Cố (Timeline & Incidents)</h3>
                        <p className="text-xs text-muted-foreground">Lịch sử can thiệp, bảo dưỡng, thay thế phụ tùng và các sự cố phát sinh.</p>

                        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                          {selectedNode.timeline?.map((evt, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-blue-600" />
                              <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-primary">{evt.date}</span>
                                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                    {evt.type}
                                  </span>
                                </div>
                                <p className="mt-1 text-foreground font-medium">{evt.event}</p>
                                {evt.reference && (
                                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">Lệnh tham chiếu: {evt.reference}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 4: Spare Parts & Tools (BOM) */}
                    <TabsContent value="bom" className="mt-4 space-y-4">
                      <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-foreground">Cơ Cấu Phụ Tùng & Vật Tư Tiêu Hao (BOM / Tools)</h3>
                            <p className="text-xs text-muted-foreground">Linh kiện cấu thành và vật tư cần thiết cho mỗi lần bảo dưỡng hoặc thay thế.</p>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/60 border-b font-bold">
                              <tr>
                                <th className="p-2.5 font-mono">Mã Vật tư</th>
                                <th className="p-2.5">Tên vật tư / Quy cách</th>
                                <th className="p-2.5">Phân loại</th>
                                <th className="p-2.5 text-center">Định mức</th>
                                <th className="p-2.5">Trạng thái kho</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {selectedNode.bomItems?.map((item) => (
                                <tr key={item.id} className="hover:bg-muted/30">
                                  <td className="p-2.5 font-mono font-semibold text-primary">{item.code}</td>
                                  <td className="p-2.5 font-medium">{item.name}</td>
                                  <td className="p-2.5">
                                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">
                                      {item.category}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-bold">{item.quantity} {item.unit}</td>
                                  <td className="p-2.5">
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                      <CheckCircle2 size={13} /> {item.condition}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 5: Maintenance Plan */}
                    <TabsContent value="maintenance" className="mt-4 space-y-4">
                      <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-foreground">Kế Hoạch & Ma Trận Chu Kỳ Bảo Trì Ngăn Ngừa</h3>
                            <p className="text-xs text-muted-foreground">Lịch trình kiểm tra, vệ sinh, thay dầu, đại tu theo Ngày, Tuần, Tháng, Quý, Năm.</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setRescheduleNode(selectedNode)}>
                            <Plus size={14} className="mr-1" /> Thêm lịch trình
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {selectedNode.schedules?.map((sch) => (
                            <div key={sch.id} className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                      Chu kỳ: {sch.frequency} {sch.value ? `(${sch.value})` : ''}
                                    </span>
                                    <span className="font-bold text-foreground">{sch.taskName}</span>
                                  </div>
                                  <p className="text-muted-foreground text-[11px] mt-1">
                                    Định mức nhân công: <strong>{sch.laborCount || 2} công</strong> | Hạn tiếp theo: <strong className="text-blue-600 dark:text-blue-400">{sch.nextDueDate || 'Định kỳ'}</strong>
                                  </p>
                                </div>

                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => setWorkOrderNode(selectedNode)}
                                >
                                  Tạo WO
                                </Button>
                              </div>

                              {sch.toolsNeeded && (
                                <div className="text-[11px] text-muted-foreground">
                                  Dụng cụ yêu cầu: <span className="font-medium text-foreground">{sch.toolsNeeded.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 6: Cross-Plant Stock Buffer */}
                    <TabsContent value="crossplant" className="mt-4 space-y-4">
                      <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-foreground">Mạng Lưới Tra Cứu & Bù Trừ Phụ Tùng Dự Phòng Đa Nhà Máy</h3>
                            <p className="text-xs text-muted-foreground">Giải pháp điều chuyển khẩn cấp phụ tùng lắp lẫn tương thích giữa các nhà máy trong tập đoàn khi xảy ra sự cố.</p>
                          </div>
                        </div>

                        {selectedNode.crossPlantSuggestions?.map((sug, idx) => (
                          <div key={idx} className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-bold text-sm text-foreground">{sug.plantName}</p>
                                <p className="text-xs text-muted-foreground">📍 {sug.warehouseName}</p>
                              </div>
                              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
                                Tồn sẵn: {sug.availableQty} cái
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-2.5 text-xs">
                              <div>
                                <span className="text-muted-foreground">Mã phụ tùng tương thích:</span>
                                <p className="font-mono font-bold text-primary">{sug.partCode}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Đánh giá khả năng lắp lẫn:</span>
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400">✓ {sug.matchRate}</p>
                              </div>
                            </div>

                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => {
                                toast.success(`Đã khởi tạo quy trình điều chuyển phụ tùng ${sug.partCode} từ ${sug.plantName}!`);
                              }}
                            >
                              <ArrowRightLeft size={14} className="mr-1.5" /> Tạo Phiếu Điều Chuyển Bù Trừ Khẩn Cấp
                            </Button>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Tab 7: Sổ Giao Dịch & Giữ Chỗ (Transactions & Stock) theo plan_2.md & dexuat.md */}
                    <TabsContent value="transactions" className="mt-4 space-y-4">
                      {/* Stock Summary Cards */}
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border bg-card p-3 text-center shadow-2xs">
                          <p className="text-xs font-medium text-muted-foreground">Tồn Kho Thực Tế (On-Hand)</p>
                          <p className="mt-1 text-2xl font-bold text-foreground">
                            {selectedNode.stock?.quantityOnHand ?? 3} <span className="text-xs font-normal text-muted-foreground">{selectedNode.stock?.unit || 'Cái'}</span>
                          </p>
                        </div>

                        <div className="rounded-xl border bg-card p-3 text-center shadow-2xs">
                          <p className="text-xs font-medium text-muted-foreground">Đã Giữ Chỗ (Reserved)</p>
                          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {selectedNode.stock?.quantityReserved ?? 1} <span className="text-xs font-normal text-muted-foreground">{selectedNode.stock?.unit || 'Cái'}</span>
                          </p>
                        </div>

                        <div className="rounded-xl border bg-card p-3 text-center shadow-2xs">
                          <p className="text-xs font-medium text-muted-foreground">Tồn Khả Dụng (Available)</p>
                          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {selectedNode.stock?.quantityAvailable ?? 2} <span className="text-xs font-normal text-muted-foreground">{selectedNode.stock?.unit || 'Cái'}</span>
                          </p>
                        </div>

                        <div className="rounded-xl border bg-card p-3 text-center shadow-2xs">
                          <p className="text-xs font-medium text-muted-foreground">Định Mức Min / Max</p>
                          <p className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-300">
                            {selectedNode.stock?.minStock ?? 2} / {selectedNode.stock?.maxStock ?? 6} <span className="text-xs font-normal text-muted-foreground">{selectedNode.stock?.unit || 'Cái'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                            onClick={() => {
                              setTxType('OUT');
                              setTransactionModalOpen(true);
                            }}
                          >
                            <ArrowUpRight size={14} className="mr-1" /> Xuất Kho (Issue for WO)
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => {
                              setTxType('IN');
                              setTransactionModalOpen(true);
                            }}
                          >
                            <ArrowDownRight size={14} className="mr-1" /> Nhập Kho (Goods Receipt)
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => setReserveModalOpen(true)}
                          >
                            <BookmarkCheck size={14} className="mr-1" /> Giữ Chỗ Vật Tư (Reserve)
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => {
                              setTxType('BORROW');
                              setTransactionModalOpen(true);
                            }}
                          >
                            <RotateCcw size={14} className="mr-1" /> Mượn / Trả Công Cụ
                          </Button>
                        </div>
                      </div>

                      {/* Transactions History Table */}
                      <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          Sổ Nhật Ký Giao Dịch Kho (Inventory Transactions Ledger)
                        </h4>

                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/60 border-b font-bold">
                              <tr>
                                <th className="p-2.5 font-mono">Mã Phiếu</th>
                                <th className="p-2.5">Loại</th>
                                <th className="p-2.5 text-center">Số lượng</th>
                                <th className="p-2.5">Nơi cấp / Vị trí</th>
                                <th className="p-2.5">Chứng từ tham chiếu</th>
                                <th className="p-2.5">Người thực hiện</th>
                                <th className="p-2.5 font-mono">Thời gian</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {selectedNode.transactions && selectedNode.transactions.length > 0 ? (
                                selectedNode.transactions.map((tx) => (
                                  <tr key={tx.id} className="hover:bg-muted/30">
                                    <td className="p-2.5 font-mono font-bold text-primary">{tx.transactionCode}</td>
                                    <td className="p-2.5">
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                          tx.transactionType === 'IN'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                            : tx.transactionType === 'OUT'
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                        }`}
                                      >
                                        {tx.transactionType}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center font-bold">
                                      {tx.quantity} {tx.unit}
                                    </td>
                                    <td className="p-2.5 text-muted-foreground text-[11px]">
                                      {tx.toLocation || tx.fromLocation}
                                    </td>
                                    <td className="p-2.5 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                                      {tx.referenceId || '—'}
                                    </td>
                                    <td className="p-2.5 text-[11px]">{tx.executor}</td>
                                    <td className="p-2.5 font-mono text-muted-foreground text-[11px]">{tx.createdAt}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={7} className="p-4 text-center text-muted-foreground italic">
                                    Chưa có giao dịch phát sinh.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center p-8">
                  <Package size={48} className="text-muted-foreground/50 mb-3" />
                  <h3 className="text-base font-bold">Chọn một nút trên cây để xem hồ sơ</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Khám phá cây phân cấp tài sản & nhà kho để xem thông số kỹ thuật, kho tài liệu, ma trận bảo trì và sổ giao dịch kho.
                  </p>
                </div>
              )}
            </main>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Create / Edit Node */}
      <Dialog open={nodeDialog.open} onOpenChange={(v) => setNodeDialog({ ...nodeDialog, open: v })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {nodeDialog.mode === 'create' ? 'Thêm Thực Thể Mới Vào Cây' : 'Chỉnh Sửa Thông Tin Thực Thể'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitNode} className="space-y-3.5 text-xs">
            {nodeDialog.mode === 'create' && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="font-bold text-foreground">Bộ sinh mã tự động theo từ điển:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[10px]">Công ty</Label>
                    <Select value={genCompany} onValueChange={setGenCompany}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(dictionary.companyCodes).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Nhà máy</Label>
                    <Select value={genFactory} onValueChange={setGenFactory}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(dictionary.factoryCodes).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Phân hệ chính</Label>
                    <Select value={genMainPart} onValueChange={setGenMainPart}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(dictionary.mainParts).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Sub Part</Label>
                    <Select value={genSubPart1} onValueChange={setGenSubPart1}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(dictionary.subParts).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <Label>Ký hiệu (Symbol)</Label>
                <Input
                  className="mt-1"
                  placeholder="VD: Ro-01, S-01..."
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                />
              </div>
              <div>
                <Label>Tình trạng vận hành</Label>
                <Select value={formCondition} onValueChange={(v) => setFormCondition(v as WarehouseCondition)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Model</Label>
                <Input className="mt-1" value={formModel} onChange={(e) => setFormModel(e.target.value)} />
              </div>
              <div>
                <Label>Serial Number</Label>
                <Input className="mt-1 font-mono" value={formSerial} onChange={(e) => setFormSerial(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vật liệu (Material)</Label>
                <Input className="mt-1" value={formMaterial} onChange={(e) => setFormMaterial(e.target.value)} />
              </div>
              <div>
                <Label>Kích thước (Dimensions)</Label>
                <Input className="mt-1" value={formDimensions} onChange={(e) => setFormDimensions(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nhiệt độ vận hành</Label>
                <Input className="mt-1" value={formOperatingTemp} onChange={(e) => setFormOperatingTemp(e.target.value)} />
              </div>
              <div>
                <Label>Áp suất định mức</Label>
                <Input className="mt-1" value={formPressureRating} onChange={(e) => setFormPressureRating(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Vị trí địa điểm / Nhà kho lưu trữ</Label>
              <Input
                className="mt-1"
                placeholder="VD: Kho vật tư số 01 - Kệ A2 - Tầng 2 - Ngăn 04"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setNodeDialog({ open: false, mode: 'create' })}>
                Hủy
              </Button>
              <Button type="submit">Lưu thông tin</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create Work Order exact to main_UI.jpg button */}
      <Dialog open={!!workOrderNode} onOpenChange={(v) => !v && setWorkOrderNode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="text-blue-600" size={18} />
              Create Work Order (Phát Hành Lệnh Bảo Trì)
            </DialogTitle>
          </DialogHeader>

          {workOrderNode && (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border bg-muted/40 p-2.5">
                <p className="text-muted-foreground">Thiết bị / Phụ tùng bảo dưỡng:</p>
                <p className="font-bold text-sm text-foreground">{workOrderNode.name}</p>
                <p className="font-mono text-primary font-semibold">{workOrderNode.code}</p>
              </div>

              <div>
                <Label>Nội dung công việc</Label>
                <Input
                  className="mt-1"
                  defaultValue={`Bảo dưỡng ngăn ngừa & kiểm tra khe hở ${workOrderNode.name}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Định mức nhân công</Label>
                  <Input className="mt-1" defaultValue={workOrderNode.laborRequirement || '2 Workers'} />
                </div>
                <div>
                  <Label>Mức độ ưu tiên</Label>
                  <Select defaultValue="High">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                <Input className="mt-1" defaultValue={workOrderNode.assignedTeam || 'Nguyễn Văn A (Đội trưởng cơ khí)'} />
              </div>

              <div className="rounded-md border bg-blue-50/50 p-2 text-[11px] text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                ✓ Hệ thống sẽ tự động tạo yêu cầu giữ chỗ 1 phụ tùng ({workOrderNode.code}) trong kho cho lệnh này.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setWorkOrderNode(null)}>
                  Hủy
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    toast.success(`Đã phát hành Work Order cho ${workOrderNode.code}!`);
                    setWorkOrderNode(null);
                  }}
                >
                  Phát Hành Lệnh Bảo Trì
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Reschedule exact to main_UI.jpg */}
      <Dialog open={!!rescheduleNode} onOpenChange={(v) => !v && setRescheduleNode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={18} />
              Reschedule Maintenance (Đổi Lịch Bảo Trì)
            </DialogTitle>
          </DialogHeader>

          {rescheduleNode && (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border bg-muted/40 p-2.5">
                <p className="font-bold text-sm">{rescheduleNode.name}</p>
                <p className="font-mono text-primary">{rescheduleNode.code}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Chu kỳ tần suất</Label>
                  <Select defaultValue="month">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Hàng ngày (Day)</SelectItem>
                      <SelectItem value="week">Hàng tuần (Week)</SelectItem>
                      <SelectItem value="month">Hàng tháng (Month)</SelectItem>
                      <SelectItem value="quarter">Hàng quý (Quarter)</SelectItem>
                      <SelectItem value="year">Hàng năm (Year)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ngày thực hiện tiếp theo</Label>
                  <Input type="date" className="mt-1" defaultValue="2026-09-15" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setRescheduleNode(null)}>Hủy</Button>
                <Button
                  onClick={() => {
                    toast.success(`Đã cập nhật lịch bảo trì cho ${rescheduleNode.code}`);
                    setRescheduleNode(null);
                  }}
                >
                  Lưu Lịch Trình
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Set Priority exact to main_UI.jpg */}
      <Dialog open={!!priorityNode} onOpenChange={(v) => !v && setPriorityNode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="text-amber-500" size={18} />
              Set Priority & Criticality
            </DialogTitle>
          </DialogHeader>

          {priorityNode && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">Thiết lập mức độ ưu tiên vận hành cho:</p>
              <p className="font-bold font-mono text-primary">{priorityNode.code}</p>

              <div>
                <Label>Mức độ quan trọng (Criticality)</Label>
                <Select defaultValue="critical">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical (Quan trọng cấp 1 - Không được dừng)</SelectItem>
                    <SelectItem value="high">High (Ưu tiên cao)</SelectItem>
                    <SelectItem value="medium">Medium (Bình thường)</SelectItem>
                    <SelectItem value="low">Low (Thấp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setPriorityNode(null)}>Hủy</Button>
                <Button
                  onClick={() => {
                    toast.success(`Đã cập nhật mức độ ưu tiên Critical cho ${priorityNode.code}`);
                    setPriorityNode(null);
                  }}
                >
                  Cập Nhật
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: QR Code Generator & Print */}
      <Dialog open={!!qrModalNode} onOpenChange={(v) => !v && setQrModalNode(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Smart QR Code Định Danh</DialogTitle>
          </DialogHeader>

          {qrModalNode && (
            <div className="space-y-3 py-2 text-xs">
              <div className="mx-auto flex h-48 w-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-muted/20 p-4">
                <QrCode size={110} className="text-primary" />
                <span className="font-mono text-[11px] font-bold text-foreground mt-2">
                  {qrModalNode.code}
                </span>
              </div>

              <div>
                <p className="font-bold text-sm text-foreground">{qrModalNode.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{qrModalNode.code}</p>
                <p className="text-[11px] text-muted-foreground mt-1">📍 {qrModalNode.location || 'Kho Nhà máy'}</p>
              </div>

              <div className="flex justify-center gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => toast.success('Đang in tem nhãn QR dán hiện trường')}
                >
                  <Printer size={13} className="mr-1" /> In Tem Nhãn Dán
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Cross-Plant Buffer Suggestion Modal */}
      <Dialog open={!!crossPlantModalNode} onOpenChange={(v) => !v && setCrossPlantModalNode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="text-blue-600" size={18} />
              Cross-Plant Spare Parts Buffer (Mạng Lưới Dự Phòng)
            </DialogTitle>
          </DialogHeader>

          {crossPlantModalNode && (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border bg-muted/30 p-2.5">
                <p className="text-muted-foreground">Phụ tùng hiện tại:</p>
                <p className="font-bold text-foreground text-sm">{crossPlantModalNode.name}</p>
                <p className="font-mono text-primary font-semibold">{crossPlantModalNode.code}</p>
              </div>

              <p className="font-bold text-foreground">Phụ tùng tương thích tìm thấy tại các nhà máy thành viên:</p>

              {crossPlantModalNode.crossPlantSuggestions?.map((sug, idx) => (
                <div key={idx} className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2 dark:border-blue-900 dark:bg-blue-950/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{sug.plantName}</p>
                      <p className="text-muted-foreground">📍 {sug.warehouseName}</p>
                    </div>
                    <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      Tồn kho: {sug.availableQty} cái
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-blue-200/60 pt-2 dark:border-blue-900/60 text-xs">
                    <span className="font-mono font-semibold text-primary">{sug.partCode}</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      ✓ {sug.matchRate}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      toast.success(`Đã tạo phiếu điều chuyển phụ tùng ${sug.partCode} từ ${sug.plantName}`);
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

      {/* Dialog: Inventory Transaction Form (IN / OUT / TRANSFER / BORROW) */}
      <Dialog open={transactionModalOpen} onOpenChange={setTransactionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {txType === 'IN' && 'Tạo Phiếu Nhập Kho (Goods Receipt)'}
              {txType === 'OUT' && 'Tạo Phiếu Xuất Kho (Goods Issue)'}
              {txType === 'TRANSFER' && 'Tạo Phiếu Điều Chuyển Kho'}
              {txType === 'BORROW' && 'Tạo Phiếu Mượn Công Cụ Dụng Cụ'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTransaction} className="space-y-3 text-xs">
            {selectedNode && (
              <div className="rounded-lg border bg-muted/40 p-2.5">
                <p className="text-muted-foreground">Vật tư / Phụ tùng:</p>
                <p className="font-bold text-foreground">{selectedNode.name}</p>
                <p className="font-mono text-primary">{selectedNode.code}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Loại giao dịch</Label>
                <Select value={txType} onValueChange={(v) => setTxType(v as TransactionType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OUT">Xuất kho (OUT)</SelectItem>
                    <SelectItem value="IN">Nhập kho (IN)</SelectItem>
                    <SelectItem value="TRANSFER">Điều chuyển (TRANSFER)</SelectItem>
                    <SelectItem value="BORROW">Mượn công cụ (BORROW)</SelectItem>
                    <SelectItem value="RETURN">Hoàn trả (RETURN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Số lượng ({selectedNode?.stock?.unit || 'Cái'})</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1 font-bold"
                  value={txQty}
                  onChange={(e) => setTxQty(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Chứng từ tham chiếu</Label>
                <Select value={txRefType} onValueChange={(v: any) => setTxRefType(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WORK_ORDER">Lệnh bảo trì (Work Order)</SelectItem>
                    <SelectItem value="PURCHASE_ORDER">Đơn mua sắm (PO)</SelectItem>
                    <SelectItem value="OPERATION">Vận hành sản xuất</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mã chứng từ</Label>
                <Input
                  className="mt-1 font-mono"
                  value={txRefId}
                  onChange={(e) => setTxRefId(e.target.value)}
                  placeholder="VD: WO-2026-0815"
                />
              </div>
            </div>

            <div>
              <Label>Người / Đơn vị yêu cầu</Label>
              <Input
                className="mt-1"
                value={txRequester}
                onChange={(e) => setTxRequester(e.target.value)}
              />
            </div>

            <div>
              <Label>Ghi chú lý do xuất / nhập</Label>
              <Input
                className="mt-1"
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setTransactionModalOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Xác Nhận Giao Dịch</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Material Reservation */}
      <Dialog open={reserveModalOpen} onOpenChange={setReserveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkCheck className="text-amber-600" size={18} />
              Giữ Chỗ Trước Vật Tư (Material Reservation)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleReserve} className="space-y-3 text-xs">
            <p className="text-muted-foreground">
              Khóa trước số lượng tồn kho khả dụng để bảo đảm luôn có sẵn vật tư cho Lệnh bảo trì (Work Order), chống xuất kho ngoài kế hoạch.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Số lượng giữ chỗ</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedNode?.stock?.quantityAvailable || 10}
                  className="mt-1 font-bold"
                  value={resQty}
                  onChange={(e) => setResQty(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <Label>Mã Lệnh Bảo Trì (Work Order)</Label>
                <Input
                  className="mt-1 font-mono"
                  value={resWoId}
                  onChange={(e) => setResWoId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setReserveModalOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Xác Nhận Giữ Chỗ</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Maintenance Matrix Overview */}
      <Dialog open={matrixModalOpen} onOpenChange={setMatrixModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="text-blue-600" size={18} />
              Ma Trận Lập Lịch Bảo Trì Ngăn Ngừa (Preventive Maintenance Matrix)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/80 text-foreground border-b font-bold">
                  <tr>
                    <th className="p-3">Bộ phận / Chi tiết (Parts)</th>
                    <th className="p-3 font-mono">Mã tài sản</th>
                    <th className="p-3 text-center bg-blue-50/50 dark:bg-blue-950/20">Day</th>
                    <th className="p-3 text-center bg-indigo-50/50 dark:bg-indigo-950/20">Week</th>
                    <th className="p-3 text-center bg-violet-50/50 dark:bg-violet-950/20">Month</th>
                    <th className="p-3 text-center bg-amber-50/50 dark:bg-amber-950/20">Quarter</th>
                    <th className="p-3 text-center bg-rose-50/50 dark:bg-rose-950/20">Year</th>
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
                        <td className="p-3 font-semibold text-foreground">{part.name}</td>
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
              <Sliders size={18} className="text-primary" />
              Từ Điển Quy Cách Đặt Tên (Naming Dictionary)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tenancyService } from '@/services/tenancy.service';
import { PositionsManagerDialog } from './positions-manager-dialog';
import type { Organization, OrganizationChartUnit } from '@/types/tenancy';

const types: Record<string, string> = { company: 'Công ty', division: 'Khối/ban', department: 'Phòng ban', plant: 'Nhà máy', team: 'Tổ/nhóm' };
const ranks = [
  { value: '1', name: 'Quản lý cấp cao' }, { value: '2', name: 'Lãnh đạo Công ty' },
  { value: '3', name: 'Lãnh đạo Nhà máy' }, { value: '4', name: 'Quản lý Bộ phận/Phòng ban' },
  { value: '5', name: 'Giám sát/Trung gian' }, { value: '6', name: 'Nhân viên/Chuyên viên' },
];
const rankStyles: Record<number, { label: string; card: string; tag: string }> = {
  1: { label: 'Quản lý cấp cao', card: 'border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-950/30 dark:text-violet-50', tag: 'bg-violet-600 text-white' },
  2: { label: 'Lãnh đạo Công ty', card: 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50', tag: 'bg-amber-600 text-white' },
  3: { label: 'Lãnh đạo Nhà máy', card: 'border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-50', tag: 'bg-orange-600 text-white' },
  4: { label: 'Quản lý Phòng ban', card: 'border-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950/30 dark:text-sky-50', tag: 'bg-sky-600 text-white' },
  5: { label: 'Giám sát/Trung gian', card: 'border-teal-500 bg-teal-50 text-teal-950 dark:bg-teal-950/30 dark:text-teal-50', tag: 'bg-teal-600 text-white' },
  6: { label: 'Nhân viên/Chuyên viên', card: 'border-slate-300 bg-card text-foreground', tag: 'bg-slate-500 text-white' },
};
type UnitDraft = { id?: string; parentId?: string; code: string; name: string; type: string };

function PersonnelNode({ person }: { person: OrganizationChartUnit['personnel'][number] }) {
  const style = rankStyles[person.rank] ?? rankStyles[6];
  const isLeadership = person.rank <= 5;
  return <article className={`relative min-h-24 min-w-0 rounded-md border-2 p-3 shadow-sm ${style.card}`} aria-label={`${person.fullName}, ${style.label}`}>
    <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="break-words font-bold leading-5">{person.fullName}</p><div className="mt-1 flex max-w-full flex-wrap gap-1">{person.isPrimary && person.rank <= 2 && (person.organizationTags ?? []).map((tag) => <span className={`inline-flex max-w-full break-words rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.tag}`} key={`unit-${tag}`}>{tag}</span>)}{person.isPrimary && isLeadership && <span className={`inline-flex max-w-full break-words rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.tag}`} key={`position-${person.positionName}`}>{person.positionName}</span>}{!person.isPrimary && person.primaryAssignment && <span className="inline-flex max-w-full break-words rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Quản lý cấp cao</span>}</div></div><span className="max-w-28 shrink-0 break-words text-right text-[10px] font-medium opacity-75">{style.label}</span></div>
    <p className="mt-1 font-mono text-xs opacity-80">{person.employeeCode}</p>
  </article>;
}

function PersonnelSummaryNode({ count, onClick }: { count: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-24 flex-col justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-left text-slate-700 shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900/30 dark:text-slate-200"><p className="text-2xl font-bold">{count}</p><p className="text-sm font-semibold">nhân viên / chuyên viên</p><p className="mt-1 text-xs opacity-75">Nhấn để xem danh sách</p></button>;
}

function partitionPlantCharts(nodes: OrganizationChartUnit[]) {
  const plants: OrganizationChartUnit[] = [];
  const withoutPlants = (items: OrganizationChartUnit[]): OrganizationChartUnit[] => items.flatMap((item) => {
    if (item.type === 'plant') { plants.push(item); return []; }
    return [{ ...item, children: withoutPlants(item.children) }];
  });
  return { corporate: withoutPlants(nodes), plants };
}

function TreeItem({ unit, selectedId, onSelect }: { unit: OrganizationChartUnit; selectedId: string; onSelect: (unit: OrganizationChartUnit) => void }) {
  const [open, setOpen] = useState(true); const hasChildren = unit.children.length > 0;
  return <div className="pl-3"><div className={`group flex items-center gap-1 rounded-md py-1 pr-2 text-sm ${selectedId === unit.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}><button type="button" className="grid h-5 w-5 place-items-center" onClick={() => setOpen(!open)} aria-label="Mở hoặc thu gọn">{hasChildren ? open ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : null}</button><button type="button" className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left" onClick={() => onSelect(unit)}><Building2 size={15} className={unit.type === 'plant' ? 'text-orange-600' : 'text-primary'} /><span className="truncate">{unit.name}</span></button></div>{open && hasChildren && <div className="border-l border-border">{unit.children.map((child) => <TreeItem key={child.id} unit={child} selectedId={selectedId} onSelect={onSelect} />)}</div>}</div>;
}

function OrganizationDetail({ unit, onUnit, onPerson, onDelete, onSummary, onSelect }: { unit: OrganizationChartUnit; onUnit: (draft: UnitDraft) => void; onPerson: (id: string) => void; onDelete: (id: string) => void; onSummary: (unitName: string, personnel: OrganizationChartUnit['personnel']) => void; onSelect: (unit: OrganizationChartUnit) => void }) {
  const importantPersonnel = unit.personnel.filter((person) => person.rank <= 5); const staff = unit.personnel.filter((person) => person.rank >= 6);
  return <div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"><div><p className="text-sm font-medium text-primary">Chi tiết đơn vị</p><h2 className="mt-1 text-xl font-bold">{unit.name}</h2><p className="mt-1 text-sm text-muted-foreground">{unit.code} · {types[unit.type] ?? unit.type} · {unit.personnel.length} nhân sự trực thuộc</p></div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => onUnit({ parentId: unit.id, code: '', name: '', type: 'department' })}><Plus size={16} />Thêm đơn vị</Button><Button size="sm" onClick={() => onPerson(unit.id)}><UserPlus size={16} />Thêm nhân sự</Button><Button size="icon" variant="ghost" title="Chỉnh sửa đơn vị" onClick={() => onUnit({ id: unit.id, parentId: unit.parentId ?? undefined, code: unit.code, name: unit.name, type: unit.type })}><Pencil size={16} /></Button><Button size="icon" variant="ghost" title="Xóa đơn vị" onClick={() => onDelete(unit.id)}><Trash2 size={16} /></Button></div></div>
    {unit.children.length > 0 && <div className="mt-4"><p className="mb-2 text-sm font-semibold">Đơn vị trực thuộc</p><div className="flex flex-wrap gap-2">{unit.children.map((child) => <Button key={child.id} size="sm" variant="outline" onClick={() => onSelect(child)}><Building2 size={15} />{child.name}</Button>)}</div></div>}
    <div className="mt-5"><p className="mb-3 text-sm font-semibold">Nhân sự</p>{unit.personnel.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{importantPersonnel.map((person) => <PersonnelNode key={`${unit.id}-${person.id}-${person.positionName}`} person={person} />)}{staff.length > 0 && <PersonnelSummaryNode count={staff.length} onClick={() => onSummary(unit.name, staff)} />}</div> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Chưa có nhân sự được bổ nhiệm vào đơn vị này.</p>}</div>
  </div>;
}

export function OrganizationPage() {
  const [data, setData] = useState<Organization | null>(null); const [tree, setTree] = useState<OrganizationChartUnit[]>([]);
  const [unit, setUnit] = useState<UnitDraft | null>(null); const [personUnitId, setPersonUnitId] = useState<string | null>(null); const [showPersonUnitPicker, setShowPersonUnitPicker] = useState(false); const [positionId, setPositionId] = useState('');
  const [positionsManagerOpen, setPositionsManagerOpen] = useState(false);
  const [staffPanel, setStaffPanel] = useState<{ unitName: string; personnel: OrganizationChartUnit['personnel'] } | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const load = async () => { const [org, chart] = await Promise.all([tenancyService.getOrganization(), tenancyService.getOrganizationTree()]); setData(org); setTree(chart.units); };
  useEffect(() => { void load().catch((e: Error) => toast.error(e.message)); }, []);
  const submitUnit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!unit) return; const f = new FormData(event.currentTarget); try { const input = { code: String(f.get('code')), name: String(f.get('name')), type: String(f.get('type')), parentId: unit.parentId }; if (unit.id) await tenancyService.updateOrganizationUnit(unit.id, input); else await tenancyService.createUnit(input); setUnit(null); await load(); toast.success('Đã lưu đơn vị tổ chức.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không thể lưu đơn vị.'); } };
  const submitPerson = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!personUnitId || personUnitId === '__choose__' || !positionId) return toast.error('Vui lòng chọn đơn vị và chức danh.'); const f = new FormData(event.currentTarget); try { await tenancyService.createAndAssignPersonnel({ employeeCode: String(f.get('employeeCode')), fullName: String(f.get('fullName')), phone: String(f.get('phone') || '') || undefined, email: String(f.get('email') || '') || undefined, organizationUnitId: personUnitId, positionId, rank: Number(f.get('rank')), createAccount: false }); setPersonUnitId(null); setShowPersonUnitPicker(false); setPositionId(''); await load(); toast.success('Đã tạo và bổ nhiệm nhân sự.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không thể tạo nhân sự.'); } };
  const remove = async (id: string) => { if (!confirm('Xóa đơn vị này? Chỉ có thể xóa đơn vị không có dữ liệu liên quan.')) return; try { await tenancyService.deleteOrganizationUnit(id); await load(); toast.success('Đã xóa đơn vị.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không thể xóa đơn vị.'); } };
  const { corporate, plants } = partitionPlantCharts(tree);
  const allUnits = [...corporate, ...plants].flatMap(function collect(unit): OrganizationChartUnit[] { return [unit, ...unit.children.flatMap(collect)]; });
  const selectedUnit = allUnits.find((unit) => unit.id === selectedUnitId) ?? allUnits[0] ?? null;
  return <><PageHeading eyebrow="Quản trị doanh nghiệp" title="Sơ đồ tổ chức" description="Quản lý cơ cấu, chức danh, hồ sơ nhân sự và bổ nhiệm vào đơn vị." /><section className="mt-5 rounded-xl border bg-card p-4 shadow-sm"><div className="flex flex-wrap gap-2"><Button onClick={() => setUnit({ code: '', name: '', type: 'department' })}><Plus />Thêm đơn vị/Phòng ban</Button><Button variant="outline" onClick={() => setPositionsManagerOpen(true)}><Pencil />Quản lý chức danh</Button><Button variant="outline" onClick={() => { setShowPersonUnitPicker(true); setPersonUnitId('__choose__'); }}><UserPlus />Thêm & bổ nhiệm nhân sự</Button></div><p className="mt-3 text-xs text-muted-foreground">Tài khoản đăng nhập được quản lý tại <strong>/users</strong>; vai trò và quyền truy cập được quản lý tại <strong>/roles</strong>.</p></section>
    <Card className="mt-5 overflow-hidden"><CardContent className="p-0">{selectedUnit ? <div className="grid min-h-[640px] lg:grid-cols-[290px_minmax(0,1fr)]"><aside className="border-b bg-muted/30 p-4 lg:border-r lg:border-b-0"><h2 className="mb-3 font-bold">Cây tổ chức</h2><div className="max-h-[70vh] overflow-y-auto pr-1"><p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Công ty mẹ</p>{corporate.map((unit) => <TreeItem key={unit.id} unit={unit} selectedId={selectedUnit.id} onSelect={(selected) => setSelectedUnitId(selected.id)} />)}{plants.length > 0 && <><p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nhà máy</p>{plants.map((unit) => <TreeItem key={unit.id} unit={unit} selectedId={selectedUnit.id} onSelect={(selected) => setSelectedUnitId(selected.id)} />)}</>}</div></aside><main className="p-5"><OrganizationDetail unit={selectedUnit} onUnit={setUnit} onPerson={(id) => { setShowPersonUnitPicker(false); setPersonUnitId(id); }} onDelete={(id) => void remove(id)} onSummary={(unitName, personnel) => setStaffPanel({ unitName, personnel })} onSelect={(selected) => setSelectedUnitId(selected.id)} /></main></div> : <p className="p-10 text-center text-muted-foreground">Chưa có đơn vị tổ chức.</p>}</CardContent></Card>
    <PositionsManagerDialog open={positionsManagerOpen} onOpenChange={setPositionsManagerOpen} positions={data?.positions ?? []} units={data?.units ?? []} onChanged={load} />
    <Dialog open={!!staffPanel} onOpenChange={(open) => !open && setStaffPanel(null)}><DialogContent className="fixed inset-y-0 right-0 left-auto top-0 h-dvh w-full max-w-md translate-x-0 translate-y-0 rounded-none border-y-0 border-r-0 p-6 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md"><DialogHeader><DialogTitle>Nhân viên · {staffPanel?.unitName}</DialogTitle></DialogHeader><div className="overflow-y-auto pr-1"><p className="mb-4 text-sm text-muted-foreground">{staffPanel?.personnel.length ?? 0} nhân viên / chuyên viên</p><div className="space-y-2">{staffPanel?.personnel.map((person) => <div className="rounded-lg border p-3" key={`${person.id}-${person.positionName}`}><p className="font-semibold">{person.fullName}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{person.employeeCode}</p><p className="mt-1 text-sm text-muted-foreground">{person.positionName}</p></div>)}</div></div></DialogContent></Dialog>
    <Dialog open={!!unit} onOpenChange={(v) => !v && setUnit(null)}><DialogContent><DialogHeader><DialogTitle>{unit?.id ? 'Chỉnh sửa đơn vị' : 'Tạo Đơn vị/Phòng ban'}</DialogTitle></DialogHeader><form className="grid gap-3" onSubmit={submitUnit}><Label>Mã đơn vị<Input name="code" required defaultValue={unit?.code} /></Label><Label>Tên đơn vị<Input name="name" required defaultValue={unit?.name} /></Label><Label>Loại đơn vị<Select name="type" defaultValue={unit?.type}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(types).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></Label><Button type="submit">Lưu đơn vị</Button></form></DialogContent></Dialog>
    <Dialog open={!!personUnitId} onOpenChange={(v) => { if (!v) { setPersonUnitId(null); setShowPersonUnitPicker(false); } }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Tạo và Bổ nhiệm Nhân sự mới</DialogTitle></DialogHeader><form className="grid gap-3" onSubmit={submitPerson}>{showPersonUnitPicker && <Label>Đơn vị<Select onValueChange={setPersonUnitId}><SelectTrigger><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger><SelectContent>{data?.units.filter((u) => u.isActive).map((u) => <SelectItem value={u.id} key={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></Label>}<Label>Họ và tên<Input name="fullName" required /></Label><Label>Mã nhân viên<Input name="employeeCode" required /></Label><Label>Chức danh<Select value={positionId} onValueChange={setPositionId}><SelectTrigger><SelectValue placeholder="Chọn chức danh" /></SelectTrigger><SelectContent>{data?.positions.filter((position) => position.isActive).map((position) => <SelectItem key={position.id} value={position.id}>{position.name}</SelectItem>)}</SelectContent></Select></Label><Input name="phone" placeholder="Số điện thoại (tùy chọn)" /><Input name="email" type="email" placeholder="Email" /><Label>Cấp bậc<Select name="rank" defaultValue="6"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ranks.map((rank) => <SelectItem key={rank.value} value={rank.value}>{rank.name}</SelectItem>)}</SelectContent></Select></Label><p className="text-xs text-muted-foreground">Sau khi bổ nhiệm, tạo tài khoản tại <strong>/users</strong> và gán quyền tại <strong>/roles</strong>.</p><Button type="submit">Tạo và bổ nhiệm</Button></form></DialogContent></Dialog></>;
}

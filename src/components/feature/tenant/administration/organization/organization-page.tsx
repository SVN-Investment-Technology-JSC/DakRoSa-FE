'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, GitBranch, Network, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tenancyService } from '@/services/tenancy.service';
import { ApiError } from '@/services/service-error';
import type { Organization, OrganizationChartUnit } from '@/types/tenancy';

const unitLabels: Record<string, string> = { company: 'Công ty', division: 'Khối/ban', department: 'Phòng ban', plant: 'Nhà máy', team: 'Tổ/nhóm' };
const rankLabels: Record<number, string> = { 1: 'Quản lý', 2: 'Cấp phó', 3: 'Nhân viên' };
const rankColors: Record<number, string> = { 1: 'border-l-rose-500 text-rose-700', 2: 'border-l-amber-500 text-amber-700', 3: 'border-l-sky-500 text-sky-700' };

function OrganizationNode({ unit, depth = 0 }: { unit: OrganizationChartUnit; depth?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = unit.children.length > 0;
  return <div className={depth ? 'ml-3 border-l border-border pl-4 md:ml-7' : ''}>
    <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-3 shadow-sm">
      <button type="button" onClick={() => setOpen(!open)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted" aria-label={open ? 'Thu gọn đơn vị' : 'Mở rộng đơn vị'}>{hasChildren ? (open ? <ChevronDown size={17} /> : <ChevronRight size={17} />) : <span />}</button>
      <Building2 size={18} className="text-primary" />
      <div className="min-w-0 flex-1"><p className="font-semibold">{unit.name}</p><p className="text-xs text-muted-foreground">{unit.code} · {unitLabels[unit.type] ?? unit.type}</p></div>
      <span className="hidden rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground sm:inline">{unit.personnel.length} nhân sự</span>
    </div>
    {open && <div className="pb-3 pt-2">
      {unit.personnel.length > 0 && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {unit.personnel.map((person) => <div key={`${unit.id}-${person.id}-${person.positionName}`} className={`rounded-lg border border-border border-l-4 bg-background p-3 ${rankColors[person.rank] ?? rankColors[3]}`}>
          <div className="flex items-start justify-between gap-2"><p className="font-semibold leading-5">{person.fullName}</p><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{person.isPrimary ? 'CHÍNH' : 'MA TRẬN'}</span></div>
          <p className="mt-1 text-sm text-foreground/80">{person.positionName}</p><div className="mt-2 flex justify-between text-xs"><span>{person.employeeCode}</span><span>{rankLabels[person.rank] ?? 'Nhân viên'}</span></div>
        </div>)}
      </div>}
      {open && unit.children.map((child) => <OrganizationNode key={child.id} unit={child} depth={depth + 1} />)}
    </div>}
  </div>;
}

export function OrganizationPage() {
  const [data, setData] = useState<Organization | null>(null);
  const [tree, setTree] = useState<OrganizationChartUnit[]>([]);
  const [view, setView] = useState<'chart' | 'manage'>('chart');
  const [unitType, setUnitType] = useState('department');
  const [parentId, setParentId] = useState('__none__');
  const [positionUnitId, setPositionUnitId] = useState('__none__');
  const [assignmentUnitId, setAssignmentUnitId] = useState('__none__');
  const [assignmentPositionId, setAssignmentPositionId] = useState('__none__');
  const [assignmentRank, setAssignmentRank] = useState('3');

  const load = async () => { const [organization, chart] = await Promise.all([tenancyService.getOrganization(), tenancyService.getOrganizationTree()]); setData(organization); setTree(chart.units); };
  useEffect(() => {
    let active = true;
    Promise.all([tenancyService.getOrganization(), tenancyService.getOrganizationTree()])
      .then(([organization, chart]) => { if (active) { setData(organization); setTree(chart.units); } })
      .catch((error: unknown) => { if (active) toast.error(error instanceof Error ? error.message : 'Không thể tải cơ cấu tổ chức.'); });
    return () => { active = false; };
  }, []);
  const activeUnits = data?.units.filter((unit) => unit.isActive) ?? [];
  const activePositions = data?.positions.filter((position) => position.isActive) ?? [];
  const unitName = (id: string | null) => data?.units.find((unit) => unit.id === id)?.name ?? '—';

  const submitUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await tenancyService.createUnit({ code: String(form.get('code')), name: String(form.get('name')), type: unitType, parentId: parentId === '__none__' ? undefined : parentId });
      formElement.reset(); setParentId('__none__'); await load(); toast.success('Đã thêm đơn vị tổ chức.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) { setParentId('__none__'); void load(); toast.error('Đơn vị cấp trên không còn tồn tại. Danh sách đã được tải lại; vui lòng chọn lại cấp trên.'); return; }
      toast.error(error instanceof Error ? error.message : 'Không thể thêm đơn vị.');
    }
  };
  const submitPosition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await tenancyService.createPosition({ code: String(form.get('code')), name: String(form.get('name')), organizationUnitId: positionUnitId === '__none__' ? undefined : positionUnitId });
      formElement.reset(); setPositionUnitId('__none__'); await load(); toast.success('Đã thêm chức danh.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể thêm chức danh.'); }
  };
  const submitPerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const code = String(form.get('employeeCode'));
    try {
      await tenancyService.createPersonnel({ employeeCode: code, fullName: String(form.get('fullName')), phone: String(form.get('phone') || '') || undefined, email: String(form.get('email') || '') || undefined });
      if (assignmentUnitId !== '__none__' && assignmentPositionId !== '__none__') await tenancyService.createPersonnelAssignment(code, { organizationUnitId: assignmentUnitId, positionId: assignmentPositionId, isPrimary: true, rank: Number(assignmentRank) });
      formElement.reset(); setAssignmentUnitId('__none__'); setAssignmentPositionId('__none__'); await load(); toast.success('Đã thêm nhân sự vào sơ đồ.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể thêm nhân sự.'); }
  };
  const deactivate = async (kind: 'units' | 'positions', id: string) => { try { await tenancyService.deactivateOrganizationRecord(kind, id); await load(); toast.success('Đã ngừng kích hoạt bản ghi.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể cập nhật.'); } };

  return <>
    <PageHeading eyebrow="Quản trị doanh nghiệp" title="Cơ cấu tổ chức" description="Thiết kế cây đơn vị, chức danh và sơ đồ nhân sự đa vị trí (ma trận)." />
    <div className="mt-5 flex gap-2 border-b"><Button variant={view === 'chart' ? 'default' : 'ghost'} onClick={() => setView('chart')}><GitBranch size={17} />Sơ đồ tổ chức</Button><Button variant={view === 'manage' ? 'default' : 'ghost'} onClick={() => setView('manage')}><Network size={17} />Quản lý cơ cấu</Button></div>
    {view === 'chart' ? <Card className="mt-5"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Sơ đồ tổ chức</CardTitle><p className="mt-1 text-sm text-muted-foreground">Thẻ viền màu theo cấp bậc; nhãn MA TRẬN hiển thị vị trí kiêm nhiệm.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{tree.length} đơn vị gốc</span></CardHeader><CardContent>{tree.length ? <div className="overflow-x-auto"><div className="min-w-[620px] space-y-2">{tree.map((unit) => <OrganizationNode key={unit.id} unit={unit} />)}</div></div> : <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Chưa có đơn vị nào. Hãy tạo cơ cấu ở tab “Quản lý cơ cấu”.</div>}</CardContent></Card> : <div className="mt-5 grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Đơn vị và phòng ban</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2" onSubmit={submitUnit}><Input name="code" placeholder="Mã đơn vị" required /><Input name="name" placeholder="Tên đơn vị/phòng ban" required /><Select value={unitType} onValueChange={setUnitType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="company">Công ty</SelectItem><SelectItem value="division">Khối/ban</SelectItem><SelectItem value="department">Phòng ban</SelectItem><SelectItem value="plant">Nhà máy</SelectItem><SelectItem value="team">Tổ/nhóm</SelectItem></SelectContent></Select><Select value={parentId} onValueChange={setParentId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Không có cấp trên</SelectItem>{activeUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select><Button type="submit" className="md:col-span-2"><Plus size={18} />Thêm đơn vị</Button></form><div className="mt-5 grid gap-2">{data?.units.map((unit) => <div key={unit.id} className="flex gap-3 rounded-lg border p-3"><Building2 size={18} className="mt-0.5 text-primary" /><div className="min-w-0 flex-1"><strong>{unit.name}</strong><p className="text-sm text-muted-foreground">{unit.code} · {unitLabels[unit.type] ?? unit.type}{unit.parentId ? ` · Thuộc ${unitName(unit.parentId)}` : ''}</p></div>{unit.isActive && <Button size="sm" variant="ghost" onClick={() => void deactivate('units', unit.id)}><Trash2 size={17} /></Button>}</div>)}</div></CardContent></Card>
      <div className="space-y-6"><Card><CardHeader><CardTitle>Chức danh</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2" onSubmit={submitPosition}><Input name="code" placeholder="Mã chức danh" required /><Input name="name" placeholder="Tên chức danh" required /><Select value={positionUnitId} onValueChange={setPositionUnitId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Áp dụng toàn doanh nghiệp</SelectItem>{activeUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select><Button type="submit"><Plus size={18} />Thêm chức danh</Button></form><div className="mt-5 grid gap-2">{data?.positions.map((position) => <div key={position.id} className="flex gap-3 rounded-lg border p-3"><Network size={18} className="mt-0.5 text-primary" /><div className="min-w-0 flex-1"><strong>{position.name}</strong><p className="text-sm text-muted-foreground">{position.code} · {unitName(position.organizationUnitId)}</p></div>{position.isActive && <Button size="sm" variant="ghost" onClick={() => void deactivate('positions', position.id)}><Trash2 size={17} /></Button>}</div>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Nhân sự và vị trí công tác</CardTitle></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2" onSubmit={submitPerson}><Input name="employeeCode" placeholder="Mã nhân sự" required /><Input name="fullName" placeholder="Họ và tên" required /><Input name="phone" placeholder="Số điện thoại (tuỳ chọn)" /><Input name="email" type="email" placeholder="Email (tuỳ chọn)" /><Select value={assignmentUnitId} onValueChange={setAssignmentUnitId}><SelectTrigger><SelectValue placeholder="Đơn vị công tác" /></SelectTrigger><SelectContent><SelectItem value="__none__">Chưa gán đơn vị</SelectItem>{activeUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select><Select value={assignmentPositionId} onValueChange={setAssignmentPositionId}><SelectTrigger><SelectValue placeholder="Chức danh" /></SelectTrigger><SelectContent><SelectItem value="__none__">Chưa gán chức danh</SelectItem>{activePositions.map((position) => <SelectItem key={position.id} value={position.id}>{position.name}</SelectItem>)}</SelectContent></Select><Select value={assignmentRank} onValueChange={setAssignmentRank}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Quản lý</SelectItem><SelectItem value="2">Cấp phó</SelectItem><SelectItem value="3">Nhân viên</SelectItem></SelectContent></Select><Button type="submit"><UserPlus size={18} />Thêm nhân sự</Button></form><p className="mt-3 flex gap-2 text-xs text-muted-foreground"><Users size={15} />Có thể thêm vị trí kiêm nhiệm qua API phân công; sơ đồ sẽ gắn nhãn MA TRẬN.</p></CardContent></Card></div>
    </div>}
  </>;
}

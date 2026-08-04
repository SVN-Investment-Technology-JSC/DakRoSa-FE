/* eslint-disable */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeading } from '@/components/page-heading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkflowMiniMap } from '@/components/workflow-minimap';
import { listWorkflowTemplates } from '@/lib/api-workflow';
import type { CMMSWorkflowTemplate } from '@/types/workflow';
import { GitBranch, ChevronDown, ChevronUp, Clock, Users } from 'lucide-react';

const STATUS_MAP = {
  active: { label: 'Đang dùng', cls: 'bg-green-100 text-green-700' },
  draft: { label: 'Nháp', cls: 'bg-yellow-100 text-yellow-700' },
  archived: { label: 'Lưu trữ', cls: 'bg-gray-100 text-gray-500' },
};

function TemplateRow({ template }: { template: CMMSWorkflowTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_MAP[template.status] ?? STATUS_MAP.draft;
  const totalActors = new Set(template.nodes.map((n) => n.assigneeValue).filter(Boolean)).size;

  return (
    <div className="overflow-hidden rounded-xl border border-[#DDE5DC]">
      {/* Header row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#F7FAF7]"
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#EAF4EC]">
          <GitBranch size={18} className="text-[#386948]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#2C342E] truncate">{template.name}</p>
          <p className="text-xs text-gray-400">
            {template.key} · v{template.version}
          </p>
        </div>
        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <GitBranch size={12} />
            {template.nodes.length} bước
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            {totalActors} tác nhân
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {new Date(template.updatedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${s.cls}`}>{s.label}</span>
        <span className="ml-2 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Mini-map expandable panel */}
      {expanded && (
        <div className="border-t border-[#DDE5DC] bg-[#FAFCFA] p-4">
          <WorkflowMiniMap templateId={template.id} height={360} />
        </div>
      )}
    </div>
  );
}

export default function WorkflowTemplatesPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [templates, setTemplates] = useState<CMMSWorkflowTemplate[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listWorkflowTemplates();
      setTemplates(data);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Quy trình vận hành"
        title="Mẫu quy trình"
        description="Xem và quản lý các mẫu luồng công việc bảo trì, sửa chữa. Nhấn vào từng mẫu để xem sơ đồ luồng."
      />

      <Card className="border-[#DDE5DC] rounded-xl">
        <CardHeader className="px-5 py-4 border-b border-[#E4EAE2]">
          <CardTitle className="font-display text-lg">Danh sách mẫu quy trình</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))
          ) : templates && templates.length > 0 ? (
            templates.map((t) => <TemplateRow key={t.id} template={t} />)
          ) : (
            <div className="py-10 text-center text-sm text-gray-400">
              Chưa có mẫu quy trình nào. Hãy tạo mẫu đầu tiên từ API.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

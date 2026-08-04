/* eslint-disable */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CMMSWorkflowTemplate, CMMSWorkflowNode } from '@/types/workflow';
import { getWorkflowPreview } from '@/lib/api-workflow';

// ─── Node types colour map ───────────────────────────────────────────────────
const NODE_COLORS: Record<string, string> = {
  start: '#16a34a',
  end: '#dc2626',
  task: '#2563eb',
  approval: '#d97706',
  condition: '#7c3aed',
};

const NODE_LABELS: Record<string, string> = {
  MANAGER_OF_REQUESTER: 'Quản lý người Y/C',
  PREVIOUS_STEP_ACTOR: 'Người bước trước',
  ROLE: 'Vai trò',
  POSITION: 'Chức danh',
  USER: 'Cá nhân',
};

/** Render 1 node tuỳ chỉnh */
function WorkflowNodeCard({ data }: { data: CMMSWorkflowNode & { label: string } }) {
  const color = NODE_COLORS[data.type] ?? '#64748b';
  return (
    <div
      className="rounded-xl border border-white/20 bg-white shadow-md"
      style={{ minWidth: 160, fontSize: 12 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-xl px-3 py-2 text-white"
        style={{ background: color }}
      >
        <span className="font-bold truncate">{data.name}</span>
      </div>
      {/* Body */}
      <div className="px-3 py-2 text-xs text-gray-600 space-y-1">
        {data.assigneeType && (
          <div>
            <span className="font-medium">Giao: </span>
            <span>{NODE_LABELS[data.assigneeType] ?? data.assigneeType}</span>
            {data.assigneeValue && (
              <span className="text-gray-400"> ({data.assigneeValue})</span>
            )}
          </div>
        )}
        {data.slaMinutes && (
          <div>
            <span className="font-medium">SLA: </span>
            <span>{data.slaMinutes} phút</span>
          </div>
        )}
        {data.formSchema && data.formSchema.fields.length > 0 && (
          <div className="text-[10px] text-blue-500">
            📋 {data.formSchema.fields.length} trường biểu mẫu
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNodeCard as never,
};

// ─── Convert API data → ReactFlow nodes & edges ────────────────────────────
function templateToFlow(template: CMMSWorkflowTemplate): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = template.nodes.map((n) => ({
    id: n.id,
    type: 'workflowNode',
    position: { x: n.positionX, y: n.positionY },
    data: { ...n, label: n.name },
  }));

  const edges: Edge[] = [];
  for (const node of template.nodes) {
    for (const t of node.outgoingTransitions) {
      const color =
        t.condition === 'REJECTED' ? '#ef4444' : t.condition === 'APPROVED' ? '#16a34a' : '#94a3b8';
      edges.push({
        id: t.id,
        source: t.sourceNodeId,
        target: t.targetNodeId,
        label: t.label ?? t.condition,
        style: { stroke: color, strokeWidth: 2 },
        labelStyle: { fontSize: 10, fill: color, fontWeight: 600 },
        animated: t.condition !== 'REJECTED',
      });
    }
  }
  return { nodes, edges };
}

// ─── Main Component ────────────────────────────────────────────────────────
interface WorkflowMiniMapProps {
  templateId: string;
  /** Chiều cao container (mặc định 400px) */
  height?: number;
  /** Chế độ nhỏ gọn (dùng trong Popover) */
  compact?: boolean;
}

export function WorkflowMiniMap({ templateId, height = 400, compact = false }: WorkflowMiniMapProps) {
  const [template, setTemplate] = useState<CMMSWorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWorkflowPreview(templateId);
      setTemplate(data);
    } catch {
      setError('Không thể tải sơ đồ quy trình');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-gray-50"
        style={{ height }}
      >
        <span className="text-sm text-gray-400 animate-pulse">Đang tải sơ đồ...</span>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-red-50 text-sm text-red-400"
        style={{ height }}
      >
        {error ?? 'Không có dữ liệu'}
      </div>
    );
  }

  const { nodes, edges } = templateToFlow(template);
  const totalActors = new Set(template.nodes.map((n) => n.assigneeValue).filter(Boolean)).size;

  return (
    <div className="flex flex-col gap-2">
      {/* Summary bar */}
      {!compact && (
        <div className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-2 text-xs text-gray-500">
          <span>
            <strong className="text-gray-700">{template.name}</strong> v{template.version}
          </span>
          <span>•</span>
          <span>{template.nodes.length} bước</span>
          <span>•</span>
          <span>{totalActors} tác nhân</span>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
              template.status === 'active'
                ? 'bg-green-100 text-green-700'
                : template.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {template.status === 'active'
              ? 'Đang dùng'
              : template.status === 'draft'
                ? 'Nháp'
                : 'Lưu trữ'}
          </span>
        </div>
      )}

      {/* ReactFlow diagram */}
      <div
        className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
        style={{ height }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background gap={16} size={1} color="#e5e7eb" />
          {!compact && <Controls showInteractive={false} />}
        </ReactFlow>
      </div>
    </div>
  );
}

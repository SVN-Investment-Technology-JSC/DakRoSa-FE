'use client';

import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type MiniMapNodeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type XYPosition,
} from '@xyflow/react';
import { Route, type LucideIcon } from 'lucide-react';
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type DragEvent,
} from 'react';
import type {
  WorkflowNode,
  WorkflowNodeType,
  WorkflowTransition,
} from '@/types/workflow';

const workflowNodeWidth = 188;
const workflowNodeHeight = 82;

export const WORKFLOW_NODE_DRAG_TYPE =
  'application/x-dakrosa-workflow-node';

export interface WorkflowNodePresentation {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

interface WorkflowFlowNodeData extends Record<string, unknown> {
  workflowNode: WorkflowNode;
  presentation: WorkflowNodePresentation;
}

type WorkflowFlowNode = Node<WorkflowFlowNodeData, 'workflowNode'>;

interface WorkflowFlowCanvasProps {
  nodes: WorkflowNode[];
  transitions: WorkflowTransition[];
  nodeMeta: Record<WorkflowNodeType, WorkflowNodePresentation>;
  selectedNodeKey: string;
  editable: boolean;
  onNodeSelect: (key: string) => void;
  onNodePositionsChange: (
    positions: Array<{ key: string; x: number; y: number }>,
  ) => void;
  onAddNode: (type: WorkflowNodeType, position: XYPosition) => void;
}

const miniMapNodeColors: Record<WorkflowNodeType, string> = {
  START: '#10B981',
  HUMAN_TASK: '#3B82F6',
  SERVICE_TASK: '#8B5CF6',
  CONDITION: '#F59E0B',
  PARALLEL_SPLIT: '#06B6D4',
  PARALLEL_JOIN: '#6366F1',
  END: '#64748B',
};

const WorkflowFlowNodeCard = memo(function WorkflowFlowNodeCard({
  data,
  draggable,
  selected,
}: NodeProps<WorkflowFlowNode>) {
  const { workflowNode, presentation } = data;
  const Icon = presentation.icon;
  const slaMinutes = Number(workflowNode.config.slaMinutes ?? 0);

  return (
    <div
      className={`relative flex h-[82px] w-[188px] items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left shadow-[0_8px_24px_rgba(34,58,42,0.10)] transition-[border-color,box-shadow] ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${
        selected
          ? 'border-emerald-500 ring-4 ring-emerald-100'
          : 'border-[#DCE5DB] hover:border-emerald-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-2.5 !border-2 !border-white !bg-[#789082]"
      />
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl border ${presentation.color}`}
      >
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-black tracking-wide text-[#849087] uppercase">
          {presentation.label}
        </span>
        <strong className="block truncate text-sm text-[#334039]">
          {workflowNode.name}
        </strong>
        {workflowNode.type === 'HUMAN_TASK' ? (
          <span className="block truncate text-[10px] text-[#7D8880]">
            SLA {(slaMinutes / 60).toLocaleString('vi-VN')} giờ
          </span>
        ) : null}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-2.5 !border-2 !border-white !bg-emerald-600"
      />
    </div>
  );
});

function WorkflowMiniMapNode({
  id,
  x,
  y,
  width,
  height,
  color,
  strokeColor,
  strokeWidth,
  selected,
  onClick,
}: MiniMapNodeProps) {
  return (
    <rect
      x={x}
      y={y}
      width={Math.max(width, workflowNodeWidth)}
      height={Math.max(height, workflowNodeHeight)}
      rx={12}
      ry={12}
      fill={color ?? '#3B82F6'}
      fillOpacity={selected ? 1 : 0.86}
      stroke={selected ? '#064E3B' : (strokeColor ?? '#FFFFFF')}
      strokeWidth={selected ? 6 : strokeWidth}
      vectorEffect="non-scaling-stroke"
      onClick={onClick ? (event) => onClick(event, id) : undefined}
    />
  );
}

const nodeTypes = {
  workflowNode: WorkflowFlowNodeCard,
};

function createFlowNode(
  node: WorkflowNode,
  nodeMeta: Record<WorkflowNodeType, WorkflowNodePresentation>,
  selectedNodeKey: string,
  editable: boolean,
): WorkflowFlowNode {
  return {
    id: node.key,
    type: 'workflowNode',
    position: {
      x: Number(node.uiPosition.x ?? 0),
      y: Number(node.uiPosition.y ?? 0),
    },
    initialWidth: workflowNodeWidth,
    initialHeight: workflowNodeHeight,
    data: {
      workflowNode: node,
      presentation: nodeMeta[node.type],
    },
    selected: node.key === selectedNodeKey,
    draggable: editable,
    selectable: true,
    ariaLabel: `${nodeMeta[node.type].label}: ${node.name}`,
  };
}

function getMiniMapNodeColor(node: WorkflowFlowNode) {
  return miniMapNodeColors[node.data.workflowNode.type];
}

function WorkflowFlowCanvasInner({
  nodes,
  transitions,
  nodeMeta,
  selectedNodeKey,
  editable,
  onNodeSelect,
  onNodePositionsChange,
  onAddNode,
}: WorkflowFlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow<WorkflowFlowNode, Edge>();
  const [interactionNodes, setInteractionNodes] = useState<WorkflowFlowNode[]>(() =>
    nodes.map((node) =>
      createFlowNode(node, nodeMeta, selectedNodeKey, editable),
    ),
  );
  const [dropActive, setDropActive] = useState(false);

  const flowNodes = useMemo<WorkflowFlowNode[]>(() => {
    const interactionById = new Map(
      interactionNodes.map((node) => [node.id, node]),
    );
    return nodes.map((workflowNode) => {
      const existing = interactionById.get(workflowNode.key);
      const projected = createFlowNode(
        workflowNode,
        nodeMeta,
        selectedNodeKey,
        editable,
      );

      if (
        existing &&
        existing.data.workflowNode === workflowNode &&
        existing.selected === projected.selected &&
        existing.draggable === projected.draggable
      ) {
        return existing;
      }

      return existing
        ? {
            ...existing,
            ...projected,
            position:
              existing.data.workflowNode === workflowNode
                ? existing.position
                : projected.position,
          }
        : projected;
    });
  }, [editable, interactionNodes, nodeMeta, nodes, selectedNodeKey]);

  const nodeKeys = useMemo(() => new Set(nodes.map((node) => node.key)), [nodes]);
  const flowEdges = useMemo<Edge[]>(
    () =>
      transitions
        .filter(
          (transition) =>
            Boolean(transition.sourceKey) &&
            Boolean(transition.targetKey) &&
            nodeKeys.has(transition.sourceKey ?? '') &&
            nodeKeys.has(transition.targetKey ?? ''),
        )
        .map((transition, index) => ({
          id:
            transition.id ??
            `${transition.sourceKey}-${transition.actionKey}-${index}`,
          source: transition.sourceKey ?? '',
          target: transition.targetKey ?? '',
          type: 'smoothstep',
          label: transition.label,
          selectable: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: '#789082',
          },
          style: { stroke: '#789082', strokeWidth: 2 },
          labelStyle: {
            fill: '#526158',
            fontSize: 11,
            fontWeight: 700,
          },
          labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.92 },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 6,
        })),
    [nodeKeys, transitions],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<WorkflowFlowNode>[]) => {
      setInteractionNodes(() => applyNodeChanges(changes, flowNodes));
    },
    [flowNodes],
  );

  const handleNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: WorkflowFlowNode, movedNodes: WorkflowFlowNode[]) => {
      if (!editable) return;
      const changedNodes = movedNodes.length ? movedNodes : [node];
      onNodePositionsChange(
        changedNodes.map((item) => ({
          key: item.id,
          x: Math.round(item.position.x),
          y: Math.round(item.position.y),
        })),
      );
    },
    [editable, onNodePositionsChange],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!editable) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDropActive(true);
    },
    [editable],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDropActive(false);
      if (!editable) return;

      const rawType =
        event.dataTransfer.getData(WORKFLOW_NODE_DRAG_TYPE) ||
        event.dataTransfer.getData('text/plain');
      if (!Object.hasOwn(nodeMeta, rawType)) return;

      const dropPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onAddNode(rawType as WorkflowNodeType, {
        x: Math.round(dropPosition.x - workflowNodeWidth / 2),
        y: Math.round(dropPosition.y - workflowNodeHeight / 2),
      });
    },
    [editable, nodeMeta, onAddNode, screenToFlowPosition],
  );

  return (
    <div
      className={`relative h-[min(62vh,610px)] min-h-[460px] w-full overflow-hidden rounded-2xl border bg-white shadow-inner transition-[border-color,box-shadow] ${
        dropActive
          ? 'border-emerald-500 ring-4 ring-emerald-100'
          : 'border-[#DCE4DA]'
      }`}
    >
      <ReactFlow<WorkflowFlowNode>
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStart={(_, node) => onNodeSelect(node.id)}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect('')}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleDrop}
        nodesConnectable={false}
        nodesDraggable={editable}
        deleteKeyCode={null}
        minZoom={0.35}
        maxZoom={1.75}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        snapToGrid
        snapGrid={[20, 20]}
        panOnScroll
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        className="bg-[#F7F9F6]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="#D8E1D7"
        />
        <Controls
          showInteractive={false}
          className="!overflow-hidden !rounded-xl !border !border-[#DCE5DB] !shadow-sm"
        />
        {nodes.length > 3 ? (
          <MiniMap<WorkflowFlowNode>
            pannable
            zoomable
            nodeComponent={WorkflowMiniMapNode}
            nodeColor={getMiniMapNodeColor}
            nodeStrokeColor="#FFFFFF"
            nodeStrokeWidth={4}
            nodeBorderRadius={12}
            bgColor="#F1F5F9"
            maskColor="rgba(15, 23, 42, 0.12)"
            maskStrokeColor="#64748B"
            maskStrokeWidth={2}
            ariaLabel="Bản đồ thu nhỏ của quy trình"
            className="!rounded-xl !border !border-slate-300 !shadow-md"
          />
        ) : null}
        {!nodes.length ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-center">
            <div>
              <Route className="mx-auto text-[#9AA69D]" />
              <strong className="mt-3 block text-sm text-[#425047]">
                Chọn hoặc tạo một quy trình
              </strong>
            </div>
          </div>
        ) : null}
      </ReactFlow>

      {dropActive ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
          <span className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg">
            Thả node vào vị trí bạn muốn
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function WorkflowFlowCanvas(props: WorkflowFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

'use client';

import { CheckCircle2, FilePlus2, FileSignature, GripVertical, RotateCcw, Trash2, UserRoundCheck, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type NodeType = 'start' | 'approval' | 'sign' | 'end';

interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  assignee?: string;
  x: number;
  y: number;
}

interface WorkflowEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
}

const dragType = 'application/dakrosa-workflow-node';

const nodeDefinitions: Record<NodeType, { title: string; description: string; label: string; icon: typeof FilePlus2 }> = {
  start: { title: 'Bắt đầu', description: 'Khởi tạo tờ trình hoặc hồ sơ', label: 'Tạo tờ trình mới', icon: FilePlus2 },
  approval: { title: 'Phê duyệt', description: 'Giao người hoặc phòng ban duyệt', label: 'Duyệt hồ sơ', icon: UserRoundCheck },
  sign: { title: 'Ký số', description: 'Bước ký duyệt điện tử', label: 'Phê duyệt & ký số', icon: FileSignature },
  end: { title: 'Kết thúc', description: 'Ban hành và lưu trữ hồ sơ', label: 'Hoàn tất quy trình', icon: CheckCircle2 },
};

const initialNodes: WorkflowNode[] = [
  { id: 'start', type: 'start', label: 'Tạo tờ trình mua sắm', x: 310, y: 42 },
  { id: 'approval', type: 'approval', label: 'Trưởng phòng duyệt', assignee: 'Phòng Kỹ thuật', x: 300, y: 170 },
  { id: 'sign', type: 'sign', label: 'Phê duyệt & ký số', assignee: 'Giám đốc', x: 300, y: 298 },
  { id: 'end', type: 'end', label: 'Hoàn tất & ban hành', x: 310, y: 426 },
];

const initialEdges: WorkflowEdge[] = [
  { id: 'e-start-approval', source: 'start', target: 'approval' },
  { id: 'e-approval-sign', source: 'approval', target: 'sign' },
  { id: 'e-sign-end', source: 'sign', target: 'end' },
];

function nextNodeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function WorkflowCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // Lưu DOM tham chiếu để tính toán vị trí động
  
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => JSON.parse(JSON.stringify(initialNodes)));
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => JSON.parse(JSON.stringify(initialEdges)));

  const [draggedNode, setDraggedNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // State để vẽ đường nối mới
  const [newConnection, setNewConnection] = useState<{
    sourceId: string;
    sourceX: number;
    sourceY: number;
    x: number;
    y: number;
  } | null>(null);

  // Tính tọa độ an toàn trong khung Canvas
  const positionFromEvent = (clientX: number, clientY: number, nodeWidth = 220, nodeHeight = 70) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 120, y: 80 };

    const padding = 12;
    return {
      x: Math.max(padding, Math.min(clientX - bounds.left - nodeWidth / 2, bounds.width - nodeWidth - padding)),
      y: Math.max(padding, Math.min(clientY - bounds.top - nodeHeight / 2, bounds.height - nodeHeight - padding)),
    };
  };

  // Kéo thả từ Sidebar vào Canvas
  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(dragType) as NodeType;
    if (!nodeDefinitions[type]) return;

    const position = positionFromEvent(event.clientX, event.clientY);
    const newNode: WorkflowNode = { id: nextNodeId(), type, label: definition.label, x: position.x, y: position.y };
    setNodes((current) => [...current, newNode]);
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelectedEdgeId(null);
    if ((e.target as HTMLElement).closest('.workflow-node')) return;
  };

  // Di chuyển Node
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedNode) return;
    const nodeEl = nodeRefs.current.get(draggedNode.id);
    const width = nodeEl?.offsetWidth || 220;
    const height = nodeEl?.offsetHeight || 70;

    const position = positionFromEvent(
      event.clientX - draggedNode.offsetX + width / 2,
      event.clientY - draggedNode.offsetY + height / 2,
      width,
      height
    );

    setNodes((current) => current.map((node) => (node.id === draggedNode.id ? { ...node, ...position } : node)));
  };

  // Xóa 1 Node cụ thể
  const deleteNode = (id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    nodeRefs.current.delete(id);
  };

  // Cập nhật thông tin Node (Label / Assignee)
  const updateNode = (id: string, field: 'label' | 'assignee', value: string) => {
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, [field]: value } : node)));
  };

  // Tính toán tọa độ chính xác đường nối (Edge) dựa trên kích thước thực tế của DOM Node
  const getEdgeCoordinates = (sourceId: string, targetId: string) => {
    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === targetId);
    if (!sourceNode || !targetNode) return null;

    const sourceEl = nodeRefs.current.get(sourceId);
    const targetEl = nodeRefs.current.get(targetId);

    const sourceWidth = sourceEl?.offsetWidth || 220;
    const sourceHeight = sourceEl?.offsetHeight || 70;
    const targetWidth = targetEl?.offsetWidth || 220;

    return {
      x1: sourceNode.x + sourceWidth / 2,
      y1: sourceNode.y + sourceHeight,
      x2: targetNode.x + targetWidth / 2,
      y2: targetNode.y,
    };
  };

  // Bắt đầu kéo để tạo kết nối mới
  const handleConnectStart = (event: React.PointerEvent, sourceId: string) => {
    event.stopPropagation();
    const sourceNode = nodes.find((n) => n.id === sourceId);
    const sourceEl = nodeRefs.current.get(sourceId);
    if (!sourceNode || !sourceEl) return;

    const sourceWidth = sourceEl.offsetWidth;
    const sourceHeight = sourceEl.offsetHeight;

    setNewConnection({
      sourceId,
      sourceX: sourceNode.x + sourceWidth / 2,
      sourceY: sourceNode.y + sourceHeight,
      x: event.clientX,
      y: event.clientY,
    });
  };

  // Di chuyển chuột khi đang tạo kết nối
  const handleConnectMove = (event: React.PointerEvent) => {
    if (!newConnection) return;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    setNewConnection((conn) => conn && { ...conn, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  };

  // Thả chuột để hoàn tất kết nối
  const handleConnectEnd = (event: React.PointerEvent, targetId: string) => {
    event.stopPropagation();
    if (!newConnection) return;

    const { sourceId } = newConnection;
    // Không cho nối vào chính nó hoặc nối ngược lại
    if (sourceId === targetId) {
      setNewConnection(null);
      return;
    }
    // Không cho tạo kết nối đã tồn tại
    if (edges.some((edge) => (edge.source === sourceId && edge.target === targetId) || (edge.source === targetId && edge.target === sourceId))) {
      setNewConnection(null);
      return;
    }

    const newEdge: WorkflowEdge = { id: `e-${sourceId}-${targetId}`, source: sourceId, target: targetId };
    setEdges((current) => [...current, newEdge]);
    setNewConnection(null);
  };

  const resetWorkflow = () => {
    setNodes(JSON.parse(JSON.stringify(initialNodes)));
    setEdges(JSON.parse(JSON.stringify(initialEdges)));
  };

  return (
    <section className="workflow-builder" aria-label="Trình thiết kế quy trình">
      {/* SIDEBAR PALETTE */}
      <aside className="workflow-palette">
        <div>
          <span className="eyebrow">Workflow canvas</span>
          <h2>Khối quy trình</h2>
          <p>Kéo một khối rồi thả vào canvas.</p>
        </div>
        <div className="workflow-node-list">
          {(Object.keys(nodeDefinitions) as NodeType[]).map((type) => {
            const definition = nodeDefinitions[type];
            const Icon = definition.icon;
            return (
              <div
                key={type}
                className={`workflow-palette-item workflow-${type}`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(dragType, type);
                  event.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <GripVertical size={16} />
                <Icon size={18} />
                <div>
                  <strong>{definition.title}</strong>
                  <span>{definition.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* WORKSPACE */}
      <div className="workflow-workspace">
        <div className="workflow-toolbar">
          <div>
            <h2>Sơ đồ phê duyệt</h2>
            <p>Kéo các node để sắp xếp lại luồng xử lý hoặc click để chỉnh sửa.</p>
          </div>
          <div className="workflow-actions">
            <Button variant="secondary" onClick={resetWorkflow}>
              <RotateCcw size={15} /> Khôi phục mẫu
            </Button>
            <Button variant="secondary" onClick={() => {
              setNodes([]);
              setEdges([]);
            }}
            >
              <Trash2 size={15} /> Xóa canvas
            </Button>
          </div>
        </div>

        <div
          ref={canvasRef}
          className="workflow-canvas relative"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDraggedNode(null)}
          onPointerLeave={() => setDraggedNode(null)}
          onPointerMove={(e) => {
            onPointerMove(e);
            handleConnectMove(e);
          }}
          onPointerUp={() => {
            setDraggedNode(null);
            setNewConnection(null);
          }}
          onPointerLeave={() => {
            setDraggedNode(null);
            setNewConnection(null);
          }}
          onClick={onCanvasClick}
        >
          {/* VẼ ĐƯỜNG NỐI SVG ĐỘNG */}
          <svg className="workflow-edges pointer-events-none absolute inset-0 w-full h-full" aria-hidden="true">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
            {edges.map(({ id, source, target }) => {
              const coords = getEdgeCoordinates(source, target);
              if (!coords) return null;
              const isSelected = selectedEdgeId === id;
              return (
                <g key={id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedEdgeId(id); }}>
                  <path
                    d={`M${coords.x1},${coords.y1} C${coords.x1},${coords.y1 + 50} ${coords.x2},${coords.y2 - 50} ${coords.x2},${coords.y2}`}
                    stroke={isSelected ? '#3b82f6' : '#94a3b8'}
                    strokeWidth={isSelected ? '3' : '2'}
                    fill="none"
                    className="pointer-events-auto transition-all"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Invisible path for easier clicking */}
                  <path d={`M${coords.x1},${coords.y1} C${coords.x1},${coords.y1 + 50} ${coords.x2},${coords.y2 - 50} ${coords.x2},${coords.y2}`} stroke="transparent" strokeWidth="20" fill="none" />

                  {isSelected && (
                    <foreignObject x={(coords.x1 + coords.x2) / 2 - 12} y={(coords.y1 + coords.y2) / 2 - 12} width="24" height="24">
                      <button
                        type="button"
                        className="pointer-events-auto w-6 h-6 bg-white rounded-full flex items-center justify-center text-red-500 shadow-md hover:bg-red-50"
                        onClick={() => setEdges(current => current.filter(e => e.id !== id))}
                        title="Xóa đường nối"
                      >
                        <X size={14} />
                      </button>
                    </foreignObject>
                  )}
                </g>
              );
            })}
            {/* Vẽ đường nối mới */}
            {newConnection && (
              <path
                d={`M${newConnection.sourceX},${newConnection.sourceY} L${newConnection.x},${newConnection.y}`}
                stroke="#3b82f6" strokeWidth="2" strokeDasharray="4" fill="none"
              />
            })}
          </svg>

          {nodes.length === 0 && <div className="workflow-empty">Kéo khối từ danh sách bên trái vào đây để bắt đầu.</div>}

          {/* RENDER NÚT (NODES) */}
          {nodes.map((node) => {
            const definition = nodeDefinitions[node.type];
            const Icon = definition.icon;
            const isEditing = editingNodeId === node.id;

            return (
              <article
                key={node.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.id, el);
                  else nodeRefs.current.delete(node.id);
                }}
                className={`workflow-node workflow-${node.type} absolute group cursor-grab active:cursor-grabbing border bg-white p-3 rounded-lg shadow-sm flex items-center gap-3 z-10`}
                style={{ left: node.x, top: node.y }}
                onPointerDown={(event) => {
                  // Tránh trigger kéo khi tương tác với Input/Button xóa
                  // Tránh trigger kéo khi tương tác với Input/Button/Handle
                  if ((event.target as HTMLElement).tagName === 'INPUT' || (event.target as HTMLElement).closest('button')) {
                    return;
                  }
                  const bounds = event.currentTarget.getBoundingClientRect();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDraggedNode({ id: node.id, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top });
                }}
              >
                {/* ĐIỂM NỐI (HANDLES) */}
                <div
                  className="workflow-handle workflow-handle-top"
                  onPointerUp={(e) => handleConnectEnd(e, node.id)}
                />
                <div
                  className="workflow-handle workflow-handle-bottom"
                  onPointerDown={(e) => handleConnectStart(e, node.id)}
                />

                <span className="workflow-node-icon">
                  <Icon size={18} />
                </span>

                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex flex-col gap-1" onBlur={() => setEditingNodeId(null)}>
                      <input
                        type="text"
                        className="text-xs border rounded px-1 py-0.5 font-bold"
                        value={node.label}
                        onChange={(e) => updateNode(node.id, 'label', e.target.value)}
                        autoFocus
                      />
                      <input
                        type="text"
                        className="text-xs border rounded px-1 py-0.5"
                        placeholder="Phụ trách..."
                        value={node.assignee || ''}
                        onChange={(e) => updateNode(node.id, 'assignee', e.target.value)}
                      />
                    </div>
                  ) : (
                    <div onClick={() => setEditingNodeId(node.id)}>
                      <strong className="block text-sm cursor-pointer hover:underline">{node.label}</strong>
                      <small className="text-xs text-gray-500">
                        {node.assignee ? `Phụ trách: ${node.assignee}` : definition.description}
                      </small>
                    </div>
                  )}
                </div>

                {/* NÚT XÓA TỪNG NODE (Ẩn/Hiện khi Hover) */}
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                  onClick={() => deleteNode(node.id)}
                  title="Xóa nút này"
                >
                  <X size={14} />
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
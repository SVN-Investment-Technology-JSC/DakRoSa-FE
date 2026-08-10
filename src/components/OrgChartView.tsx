import React, { useState } from 'react';
import { ApiOrgUnitTreeNode } from '../api/orgUnits';
import { API_BASE_URL } from '../api/client';
import {
  useCreateOrgUnit,
  useCreateOrgUnitType,
  useOrgUnitTree,
  useOrgUnitTypes,
} from '../hooks/useOrgUnits';

interface OrgChartViewProps {
  onMenuToggle?: () => void;
}

/**
 * True when the request never reached the server (no HTTP response at all) —
 * axios surfaces this as a bare "Network Error", which is almost always the API
 * simply not running rather than a fault in this screen.
 */
function isOffline(error: unknown): boolean {
  return !!error && !(error as { response?: unknown }).response;
}

const TYPE_COLORS = ['#2563eb', '#007bb9', '#7c3aed', '#059669', '#d97706'];

function typeColorFor(typeId: string, typeIds: string[]): string {
  const idx = typeIds.indexOf(typeId);
  return TYPE_COLORS[idx % TYPE_COLORS.length] ?? '#2563eb';
}

function countNodes(nodes: ApiOrgUnitTreeNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count += 1 + countNodes(n.children ?? []);
  }
  return count;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const OrgChartView: React.FC<OrgChartViewProps> = ({ onMenuToggle }) => {
  const { data: treeRoots, isLoading, isError, error, refetch, isFetching } = useOrgUnitTree();
  const { data: types } = useOrgUnitTypes();
  const createOrgUnitMutation = useCreateOrgUnit();
  const createOrgUnitTypeMutation = useCreateOrgUnitType();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newNodeTypeName, setNewNodeTypeName] = useState('');
  const [addChildModalParentId, setAddChildModalParentId] = useState<string | null | undefined>(
    undefined,
  );
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeTypeId, setNewNodeTypeId] = useState('');

  const typeIds = (types ?? []).map((t) => t.id);

  const openAddNodeModal = (parentId: string | null) => {
    setAddChildModalParentId(parentId);
    setNewNodeTitle('');
    setNewNodeTypeId(types?.[0]?.id ?? '');
  };

  const handleCreateNode = async () => {
    if (!newNodeTitle.trim() || !newNodeTypeId) return;
    await createOrgUnitMutation.mutateAsync({
      parentId: addChildModalParentId ?? undefined,
      typeId: newNodeTypeId,
      title: newNodeTitle.trim(),
    });
    setAddChildModalParentId(undefined);
    setNewNodeTitle('');
  };

  const handleAddNodeType = async () => {
    if (!newNodeTypeName.trim()) return;
    const code = slugify(newNodeTypeName) || `type-${Date.now()}`;
    await createOrgUnitTypeMutation.mutateAsync({
      code,
      name: newNodeTypeName.trim(),
      hexColor: '#545f73',
    });
    setNewNodeTypeName('');
    setShowAddTypeModal(false);
  };

  const renderTreeNode = (node: ApiOrgUnitTreeNode, isRoot = false) => {
    const color = typeColorFor(node.typeId, typeIds);
    return (
      <div key={node.id} className={isRoot ? 'relative' : 'tree-line relative mb-4'}>
        <div
          className={`group relative bg-white border border-slate-200 rounded-2xl w-80 shadow-xs transition-all hover:shadow-md ${
            node.isActive ? 'ring-2 ring-blue-600 ring-offset-1' : ''
          }`}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
            style={{ backgroundColor: color }}
          />

          <div className="p-4 pl-5 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color }}
                >
                  {node.type?.name ?? 'Level ' + node.level}
                </span>
                <h4 className="text-sm font-bold text-slate-800">{node.title}</h4>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                <button
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-md"
                  title="Add Child Node"
                  onClick={() => openAddNodeModal(node.id)}
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                </button>
              </div>
            </div>

            {node.head ? (
              <div className="flex items-center gap-2.5 mt-1 pt-2.5 border-t border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {node.head.avatarInitials || node.head.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-slate-800 leading-tight font-bold truncate">
                    {node.head.fullName}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 truncate">
                    {node.head.email}
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[9px] rounded-md border border-blue-200 shrink-0">
                  HEAD
                </span>
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic mt-1 pt-2.5 border-t border-slate-100">
                No Head Assigned
              </div>
            )}
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="ml-8 mt-4 relative">
            {node.children.map((child) => renderTreeNode(child, false))}
          </div>
        )}
      </div>
    );
  };

  const totalNodesCount = treeRoots ? countNodes(treeRoots) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white border-b border-slate-200 flex justify-between items-center px-4 md:px-8 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 md:hidden text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
            WorkflowEngine
          </h1>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="relative max-w-md w-full hidden sm:block">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search org chart..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-xs transition-colors placeholder:text-slate-400"
            />
          </div>
        </div>
      </header>

      <main className="mt-16 flex-1 h-[calc(100vh-4rem)] bg-slate-50 flex overflow-hidden">
        <section className="w-64 md:w-80 border-r border-slate-200 bg-white flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Node Types
            </h3>
            <button
              onClick={() => setShowAddTypeModal(true)}
              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              title="Add Node Type"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
            {(types ?? []).map((type) => (
              <div
                key={type.id}
                className="group flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: type.hexColor ?? '#545f73' }}
                  />
                  <span className="text-xs font-bold text-slate-800">{type.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-xs relative z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold text-slate-800">Organization Hierarchy</h2>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200">
                Total Nodes: {totalNodesCount}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openAddNodeModal(null)}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">add</span> Root Node
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 tree-canvas-bg custom-scrollbar space-y-8">
            {isLoading && <div className="text-sm text-slate-500">Đang tải sơ đồ tổ chức…</div>}
            {isError && (
              <div className="max-w-lg bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
                <p className="text-sm font-bold text-rose-700">Không tải được sơ đồ tổ chức</p>
                <p className="text-xs text-rose-700/90 leading-relaxed">
                  {isOffline(error)
                    ? // axios reports a bare "Network Error" with no response when it
                      // never reached the server at all — almost always the API not
                      // running, not a real fault in this screen.
                      `Không kết nối được tới máy chủ (${API_BASE_URL}). Hãy kiểm tra backend đã chạy chưa: chạy "npm run start:dev" trong thư mục backend/.`
                    : ((error as { response?: { data?: { message?: string } }; message?: string })
                        ?.response?.data?.message ??
                      (error as { message?: string })?.message ??
                      'Lỗi không xác định.')}
                </p>
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 disabled:opacity-50"
                >
                  {isFetching ? 'Đang thử lại…' : 'Thử lại'}
                </button>
              </div>
            )}
            {treeRoots?.map((root) => renderTreeNode(root, true))}
          </div>
        </section>
      </main>

      {/* Add Node Modal (root or child) */}
      {addChildModalParentId !== undefined && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-6 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800">
              {addChildModalParentId ? 'Add Child Node' : 'Add Root Node'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Tổ Kỹ thuật 3"
                value={newNodeTitle}
                onChange={(e) => setNewNodeTitle(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={newNodeTypeId}
                onChange={(e) => setNewNodeTypeId(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none text-xs font-medium"
              >
                {(types ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddChildModalParentId(undefined)}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNode}
                disabled={createOrgUnitMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-60"
              >
                {createOrgUnitMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Node Type Modal */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-6 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800">Add New Node Type</h3>
            <input
              type="text"
              placeholder="e.g. Tiểu ban"
              value={newNodeTypeName}
              onChange={(e) => setNewNodeTypeName(e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none text-xs font-medium"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTypeModal(false)}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNodeType}
                disabled={createOrgUnitTypeMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-60"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

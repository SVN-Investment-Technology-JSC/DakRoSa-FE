'use client';

import { useState, useEffect } from 'react';
import { workflowApi } from '@/lib/api-workflow';
import { rolesService } from '@/services/roles.service';
import type { WorkflowDefinition, WorkflowRoleMapping } from '@/types/workflow';
import type { Role } from '@/types/rbac';

import { toast } from 'sonner';
import { MultiSelectVariables } from '@/components/ui/multi-select-variables';
import { MasterBoardSidePanel } from './master-board-side-panel';

export function MasterBoardMatrix() {
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [mappings, setMappings] = useState<WorkflowRoleMapping[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [boardData, rolesData] = await Promise.all([
        workflowApi.getGlobalMasterBoard(),
        rolesService.getRoles(),
      ]);
      setDefinitions(boardData.definitions || []);
      setMappings(boardData.mappings || []);
      setRoles(rolesData || []);
    } catch {
      toast.error('Lỗi khi tải dữ liệu Master Board');
    } finally {
      setLoading(false);
    }
  }

  const getCellVariables = (workflowId: string, roleId: string) => {
    return mappings
      .filter(m => m.definitionId === workflowId && m.mappedType === 'ROLE' && m.mappedValue === roleId)
      .map(m => m.variableKey);
  };

  const handleCellChange = async (workflowId: string, roleId: string, oldKeys: string[], newKeys: string[]) => {

    const added = newKeys.filter(k => !oldKeys.includes(k));
    const removed = oldKeys.filter(k => !newKeys.includes(k));

    if (added.length === 0 && removed.length === 0) return;

    try {
      const promises: Promise<unknown>[] = [];

      for (const key of added) {
        promises.push(
          workflowApi.updateMasterBoardCell(workflowId, key, 'ROLE', roleId)
        );
      }

      for (const key of removed) {
        promises.push(
          workflowApi.updateMasterBoardCell(workflowId, key, 'ROLE', '__remove__' + roleId)
        );
      }

      await Promise.all(promises);
      toast.success('Đã lưu cấu hình phân vai');

      loadData();
    } catch {
      toast.error('Lỗi khi lưu cấu hình');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải Ma trận RACI...</div>;
  }

  const selectedDef = definitions.find(d => d.id === selectedDefId);

  return (
    <div className="flex h-[calc(100vh-140px)] w-full bg-[#FAFCFA] border-t border-[#DDE5DC]">
      <div className="flex-1 overflow-auto p-6">
        <h2 className="text-lg font-bold text-[#2A342E] mb-4">Ma trận Master</h2>

        <div className="rounded-xl border border-[#DDE5DC] bg-white overflow-hidden shadow-sm h-full max-h-[800px]">
          <div className="overflow-auto h-full">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F0F5F1] text-[#46534B]">
                <tr>
                  <th className="px-4 py-3 font-semibold border-b border-r border-[#DDE5DC] w-64 bg-gray-50 sticky left-0 z-10 top-0">
                    Tên Quy trình
                  </th>
                  {roles.map(role => (
                    <th key={role.id} className="px-4 py-3 font-semibold border-b border-r border-[#DDE5DC] min-w-[120px] text-center sticky top-0 bg-gray-50 z-0">
                      {role.code}
                      <div className="text-[10px] font-normal text-gray-500 mt-1 truncate max-w-[120px] mx-auto">{role.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {definitions.length === 0 && (
                  <tr>
                    <td colSpan={roles.length + 1} className="px-4 py-8 text-center text-gray-400">
                      Chưa có quy trình nào.
                    </td>
                  </tr>
                )}
                {definitions.map((def) => {
                  const requiredVars = new Set<string>();
                  const activeVersion = [...(def.versions || [])].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0))[0];
                  activeVersion?.nodes?.forEach(node => {
                    const doers = (node.config?.doers as string[]) || [];
                    const reporters = (node.config?.reporters as string[]) || [];
                    doers.forEach(d => requiredVars.add(d));
                    reporters.forEach(r => requiredVars.add(r));
                  });

                  const mappedVars = new Set(
                    mappings
                      .filter(m => m.definitionId === def.id && m.mappedType === 'ROLE' && roles.some(r => r.id === m.mappedValue))
                      .map(m => m.variableKey)
                  );

                  const isMissing = Array.from(requiredVars).some(v => !mappedVars.has(v));
                  const allVarsForDropdown = Array.from(new Set([...Array.from(requiredVars), ...Array.from(mappedVars)])).sort((a,b) => parseInt(a) - parseInt(b));
                  const isSelected = selectedDefId === def.id;

                  let rowBg = 'bg-white hover:bg-blue-50/50';
                  if (isSelected) rowBg = 'bg-blue-50 hover:bg-blue-50';
                  else if (isMissing) rowBg = 'bg-red-50 hover:bg-red-100/80';

                  let nameColBg = isSelected ? 'bg-blue-50 text-blue-700' : 'bg-white text-[#2A342E]';
                  if (isMissing && !isSelected) nameColBg = 'bg-red-50 text-red-700';

                  return (
                    <tr
                      key={def.id}
                      className={`cursor-pointer transition-colors ${rowBg}`}
                      onClick={() => setSelectedDefId(def.id)}
                    >
                      <td className={`px-4 py-3 border-b border-r border-[#DDE5DC] font-medium sticky left-0 z-10 ${nameColBg}`}>
                        {def.name}
                        {isMissing && <div className="text-[10px] font-normal text-red-500 mt-0.5">Thiếu tác nhân gán</div>}
                      </td>
                      {roles.map(role => {
                        const keys = getCellVariables(def.id, role.id);
                        return (
                          <td key={role.id} className="px-2 py-2 border-b border-r border-[#DDE5DC]">
                            <MultiSelectVariables
                              value={keys}
                              options={allVarsForDropdown}
                              placeholder=""
                              onChange={(vals) => {
                                handleCellChange(def.id, role.id, keys, vals);
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-80 border-l border-[#DDE5DC] bg-white h-full flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] overflow-auto">
        {selectedDef ? (
          <MasterBoardSidePanel
            definition={selectedDef}
            mappings={mappings.filter(m => m.definitionId === selectedDef.id)}
            roles={roles}
          />
        ) : (
          <div className="p-8 text-center text-gray-400 text-sm mt-10">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            Chọn một Quy trình ở bảng bên trái để xem chi tiết Bảng tra cứu tác nhân.
          </div>
        )}
      </div>
    </div>
  );
}

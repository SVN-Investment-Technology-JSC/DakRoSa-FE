'use client';

import type { WorkflowDefinition, WorkflowRoleMapping, WorkflowNode } from '@/types/workflow';
import type { Role } from '@/types/rbac';

interface MasterBoardSidePanelProps {
  definition: WorkflowDefinition;
  mappings: WorkflowRoleMapping[];
  roles: Role[];
}

export function MasterBoardSidePanel({ definition, mappings, roles }: MasterBoardSidePanelProps) {
  // Extract all unique variables used in the workflow nodes (from doers and reporters)
  const extractVariables = (nodes: WorkflowNode[]) => {
    const vars = new Set<string>();
    nodes.forEach(node => {
      const doers = (node.config?.doers as string[]) || [];
      const reporters = (node.config?.reporters as string[]) || [];
      doers.forEach(d => vars.add(d));
      reporters.forEach(r => vars.add(r));
    });
    return Array.from(vars).sort();
  };

  const getRoleName = (variableKey: string) => {
    const mapping = mappings.find(m => m.variableKey === String(variableKey) && m.mappedType === 'ROLE');
    if (!mapping) return 'Chưa gán';
    const role = roles.find(r => r.id === mapping.mappedValue);
    return role ? `${role.code} - ${role.name}` : 'Không xác định';
  };

  const nodes = definition.versions?.[0]?.nodes || [];
  const humanTasks = nodes.filter(n => n.type === 'HUMAN_TASK');
  const allVars = extractVariables(nodes);

  return (
    <div className="flex flex-col h-full bg-[#FAFCFA]">
      <div className="p-5 border-b border-[#DDE5DC] bg-white sticky top-0 z-10">
        <h3 className="text-base font-bold text-[#2A342E] leading-tight mb-1">
          {definition.name}
        </h3>
        <p className="text-xs text-gray-500">Bảng tra cứu (Master Map)</p>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-6">
        
        {/* Mapping Dictionary */}
        <section>
          <h4 className="text-sm font-semibold text-[#46534B] mb-3 flex items-center">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full mr-2"></span>
            Biến số tham gia
          </h4>
          {allVars.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có biến số nào được thiết kế.</p>
          ) : (
            <div className="bg-white rounded-lg border border-[#DDE5DC] overflow-hidden">
              <table className="w-full text-xs text-left">
                <tbody>
                  {allVars.map((v, idx) => (
                    <tr key={v} className={idx !== allVars.length - 1 ? "border-b border-gray-100" : ""}>
                      <td className="py-2 px-3 font-mono font-bold text-blue-600 bg-blue-50/30 w-16 text-center border-r border-gray-100">
                        [{v}]
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {getRoleName(v)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Task Analysis */}
        <section>
          <h4 className="text-sm font-semibold text-[#46534B] mb-3 flex items-center">
            <span className="w-1.5 h-4 bg-orange-500 rounded-full mr-2"></span>
            Chi tiết nhiệm vụ theo tác nhân
          </h4>
          
          <div className="space-y-3">
            {allVars.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Không có Node công việc (Human Task).</p>
            ) : (
              allVars.map((v) => {
                const doerTasks = humanTasks.filter(t => (t.config?.doers as string[])?.includes(v));
                const reporterTasks = humanTasks.filter(t => (t.config?.reporters as string[])?.includes(v));

                return (
                  <div key={v} className="bg-white border border-[#DDE5DC] rounded-lg p-3 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded text-xs">[{v}]</span>
                      <h5 className="font-semibold text-sm text-[#2A342E]">{getRoleName(v)}</h5>
                    </div>
                    
                    <div className="space-y-1.5 text-[11px]">
                      {doerTasks.length > 0 && (
                        <div className="flex items-start">
                          <span className="w-16 font-medium text-gray-500 shrink-0">Thực hiện:</span>
                          <span className="text-gray-700 font-medium">
                            {doerTasks.map(t => t.name).join(', ')}
                          </span>
                        </div>
                      )}
                      
                      {reporterTasks.length > 0 && (
                        <div className="flex items-start mt-1">
                          <span className="w-16 font-medium text-gray-500 shrink-0">Báo cáo:</span>
                          <span className="text-gray-700 font-medium">
                            {reporterTasks.map(t => t.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

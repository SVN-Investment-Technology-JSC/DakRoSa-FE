const fs = require('fs');
const file = 'src/components/feature/tenant/maintenance/workflows-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add MasterBoardModal import
content = content.replace(
  "import { WorkflowMiniMap } from '@/components/workflow-minimap';",
  "import { WorkflowMiniMap } from '@/components/workflow-minimap';\nimport { MasterBoardModal } from './master-board-modal';"
);

// 2. Remove assignees property in initialNode block
content = content.replace(/assignees:\s*type === 'HUMAN_TASK'\s*\?\s*\[\s*\{\s*type: 'CREATOR',\s*strategy: 'ANY',\s*config: \{\},\s*\},\s*\]\s*:\s*\[\],/, '');

// 3. Add state for isMasterBoardOpen
content = content.replace(
  "const [isCloneOpen, setCloneOpen] = useState(false);",
  "const [isCloneOpen, setCloneOpen] = useState(false);\n  const [isMasterBoardOpen, setMasterBoardOpen] = useState(false);"
);

// 4. Delete assigneeSubjectOptions useMemo block
content = content.replace(/const assigneeSubjectOptions = useMemo\(\(\) => \{[\s\S]*?\}, \[activeNode\?\.assignees, organization, roles, users\]\);/, '');

// 5. Remove assignees from saveDraft payload
content = content.replace(/assignees: node\.assignees\.map\(\(rule\) => \(\{[\s\S]*?\}\)\),/, '');

// 6. Add Phân quyền tác nhân button
const cloneButtonStr = `<Button variant="outline" className="w-full" onClick={() => void clone()}>\n                  <Copy />\n                  Nhân bản quy trình\n                </Button>\n                {canManage ? (`;
content = content.replace(
  cloneButtonStr,
  cloneButtonStr + `\n                  <Button\n                    variant="outline"\n                    className="mt-2 w-full border-blue-200 text-blue-700 hover:bg-blue-50"\n                    onClick={() => setMasterBoardOpen(true)}\n                  >\n                    <UserRoundCheck />\n                    Phân quyền tác nhân\n                  </Button>\n                ) : null}\n                {canManage ? (`
);

// 7. Replace Assignee UI with Doers and Reporters
const assigneeUIStart = `<Label className="grid gap-1 text-[11px] font-bold text-[#68736B]">\n                      Quy tắc người nhận`;
const assigneeUIEndRegex = /<Label className="grid gap-1 text-\[11px\] font-bold text-\[#68736B\]">\n\s*Chức danh quản lý dự phòng[\s\S]*?<\/Select>\n\s*<\/Label>\n\s*\) : null\}/;

const newUI = `<Label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      Người thực hiện (Doers - Các biến số)
                      <Input
                        value={((activeNode.config?.doers as string[]) || []).join(', ')}
                        disabled={!canManage}
                        placeholder="VD: 1, 2"
                        onChange={(event) =>
                          updateNode(activeNode.key, {
                            config: {
                              ...activeNode.config,
                              doers: event.target.value.split(',').map(s => s.trim()).filter(Boolean),
                            },
                          })
                        }
                      />
                    </Label>
                    <Label className="grid gap-1 text-[11px] font-bold text-[#68736B]">
                      Người quan sát/báo cáo (Reporters)
                      <Input
                        value={((activeNode.config?.reporters as string[]) || []).join(', ')}
                        disabled={!canManage}
                        placeholder="VD: 3, 4"
                        onChange={(event) =>
                          updateNode(activeNode.key, {
                            config: {
                              ...activeNode.config,
                              reporters: event.target.value.split(',').map(s => s.trim()).filter(Boolean),
                            },
                          })
                        }
                      />
                    </Label>`;

// Find the start index of assignee UI
const uiStartIndex = content.indexOf(assigneeUIStart);
if (uiStartIndex > -1) {
  // Find the end index of the old UI
  const endMatch = content.slice(uiStartIndex).match(assigneeUIEndRegex);
  if (endMatch) {
    const uiEndIndex = uiStartIndex + endMatch.index + endMatch[0].length;
    content = content.slice(0, uiStartIndex) + newUI + content.slice(uiEndIndex);
  }
}

// 8. Fix optional chaining in slaMinutes and requiredPermission
content = content.replace(
  "value={Number(activeNode.config.slaMinutes ?? 1440)}",
  "value={Number(activeNode.config?.slaMinutes ?? 1440)}"
);
content = content.replace(
  "value={String(\n                          activeNode.config.requiredPermission ?? '',\n                        )}",
  "value={String(\n                          activeNode.config?.requiredPermission ?? '',\n                        )}"
);

// 9. Add MasterBoardModal
content = content.replace(
  "<Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>",
  `<MasterBoardModal\n        tenantSlug={tenantSlug}\n        definitionId={selected?.id ?? null}\n        isOpen={isMasterBoardOpen}\n        onClose={() => setMasterBoardOpen(false)}\n      />\n\n      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>`
);

fs.writeFileSync(file, content);
console.log('Patched correctly');

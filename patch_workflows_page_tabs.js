const fs = require('fs');
const file = 'src/components/feature/tenant/maintenance/workflows-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
if (!content.includes('import { Tabs, TabsContent, TabsList, TabsTrigger }')) {
  content = content.replace(
    "import { MasterBoardModal } from './master-board-modal';",
    "import { MasterBoardModal } from './master-board-modal';\nimport { MasterBoardMatrix } from './master-board-matrix';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';"
  );
}

// 2. Wrap the grid in Tabs
const gridStart = '<div className="grid min-h-[720px] overflow-hidden rounded-2xl border border-[#DCE5DB] bg-white shadow-sm xl:grid-cols-[250px_minmax(0,1fr)_340px]">';
const tabWrapperStart = `
        <Tabs defaultValue="list" className="w-full">
          <div className="mb-4 flex items-center justify-between">
            <TabsList className="bg-white/50 p-1 border border-[#DDE5DC]">
              <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Danh sách Quy trình</TabsTrigger>
              <TabsTrigger value="matrix" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">Ma trận RACI (Master Board)</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="list" className="mt-0">
            <div className="grid min-h-[720px] overflow-hidden rounded-2xl border border-[#DCE5DB] bg-white shadow-sm xl:grid-cols-[250px_minmax(0,1fr)_340px]">`;

content = content.replace(gridStart, tabWrapperStart);

// 3. Close the TabsContent and add the Matrix Tab
// We need to find where the grid ends.
// Looking at the end of the file:
//         </div>
//       </MaintenanceShell>
//       <MasterBoardModal ... />

const endGridPattern = `        </div>
      </MaintenanceShell>`;

const endGridReplacement = `        </div>
          </TabsContent>
          
          <TabsContent value="matrix" className="mt-0 h-[calc(100vh-140px)]">
            <MasterBoardMatrix />
          </TabsContent>
        </Tabs>
      </MaintenanceShell>`;

content = content.replace(endGridPattern, endGridReplacement);

// 4. Remove the old "Phân quyền tác nhân" button since we have a tab now.
const btnPattern = `<Button
                    variant="outline"
                    className="mt-2 w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => setMasterBoardOpen(true)}
                  >
                    <UserRoundCheck />
                    Phân quyền tác nhân
                  </Button>`;
content = content.replace(btnPattern, '');

fs.writeFileSync(file, content);
console.log('Patched workflows-page.tsx');

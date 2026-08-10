import { useState } from 'react';
import { NavTab } from './types';
import { useAuth } from './auth/AuthContext';
import { LoginView } from './auth/LoginView';
import { INITIAL_CANVAS_NODES } from './data/initialData';

import { SideNavBar } from './components/SideNavBar';
import { RsacieMatrixView } from './components/RsacieMatrixView';
import { OrgChartView } from './components/OrgChartView';
import { AssetTreeView } from './components/AssetTreeView';
import { MaintenanceConfigView } from './components/MaintenanceConfigView';
import { WorkspaceView } from './components/WorkspaceView';
import { MaintenanceDashboardView } from './components/MaintenanceDashboardView';
import { CanvasView } from './components/CanvasView';

export default function App() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('workspace');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Canvas is the last remaining mock-backed view (React Flow deferred).
  const [canvasNodes, setCanvasNodes] = useState(INITIAL_CANVAS_NODES);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Hiding the nav entry is not enough: the tab could still be pointing at an
  // admin view (stale state, a role change mid-session). Fall back to Workspace.
  const ADMIN_TABS: NavTab[] = [
    'raci',
    'org-chart',
    'asset-tree',
    'maintenance-dashboard',
    'maintenance-config',
  ];
  const visibleTab: NavTab = !isAdmin && ADMIN_TABS.includes(currentTab) ? 'workspace' : currentTab;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-on-background font-sans">
      {/* Navigation Sidebar */}
      <SideNavBar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsMobileOpen(false);
        }}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col h-full overflow-hidden min-w-0">
        {visibleTab === 'workspace' && (
          <WorkspaceView onMenuToggle={() => setIsMobileOpen(true)} />
        )}

        {visibleTab === 'canvas' && (
          <CanvasView
            nodes={canvasNodes}
            onUpdateNodes={setCanvasNodes}
            onMenuToggle={() => setIsMobileOpen(true)}
          />
        )}

        {visibleTab === 'maintenance-dashboard' && (
          <MaintenanceDashboardView
            onOpenConfig={() => setCurrentTab('maintenance-config')}
            onMenuToggle={() => setIsMobileOpen(true)}
          />
        )}

        {visibleTab === 'org-chart' && (
          <OrgChartView onMenuToggle={() => setIsMobileOpen(true)} />
        )}

        {visibleTab === 'asset-tree' && (
          <AssetTreeView onMenuToggle={() => setIsMobileOpen(true)} />
        )}

        {visibleTab === 'raci' && (
          <RsacieMatrixView onMenuToggle={() => setIsMobileOpen(true)} />
        )}

        {visibleTab === 'maintenance-config' && (
          <MaintenanceConfigView onMenuToggle={() => setIsMobileOpen(true)} />
        )}
      </div>
    </div>
  );
}

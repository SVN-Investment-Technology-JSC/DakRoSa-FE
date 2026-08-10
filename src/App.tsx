import { useState } from 'react';
import { NavTab } from './types';
import { useAuth } from './auth/AuthContext';
import { LoginView } from './auth/LoginView';
import { INITIAL_CANVAS_NODES } from './data/initialData';

import { SideNavBar } from './components/SideNavBar';
import { RsacieMatrixView } from './components/RsacieMatrixView';
import { OrgChartView } from './components/OrgChartView';
import { MaintenanceConfigView } from './components/MaintenanceConfigView';
import { WorkspaceView } from './components/WorkspaceView';
import { MaintenanceDashboardView } from './components/MaintenanceDashboardView';
import { CanvasView } from './components/CanvasView';

export default function App() {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('workspace');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Canvas is the last remaining mock-backed view (React Flow deferred).
  const [canvasNodes, setCanvasNodes] = useState(INITIAL_CANVAS_NODES);

  if (!isAuthenticated) {
    return <LoginView />;
  }

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
        {currentTab === 'workspace' && (
          <WorkspaceView onMenuToggle={() => setIsMobileOpen(true)} />
        )}

        {currentTab === 'canvas' && (
          <CanvasView
            nodes={canvasNodes}
            onUpdateNodes={setCanvasNodes}
            onMenuToggle={() => setIsMobileOpen(true)}
          />
        )}

        {currentTab === 'maintenance-dashboard' && (
          <MaintenanceDashboardView
            onOpenConfig={() => setCurrentTab('maintenance-config')}
            onMenuToggle={() => setIsMobileOpen(true)}
          />
        )}

        {currentTab === 'org-chart' && (
          <OrgChartView onMenuToggle={() => setIsMobileOpen(true)} />
        )}

        {currentTab === 'raci' && (
          <RsacieMatrixView onMenuToggle={() => setIsMobileOpen(true)} />
        )}

        {currentTab === 'maintenance-config' && (
          <MaintenanceConfigView onMenuToggle={() => setIsMobileOpen(true)} />
        )}
      </div>
    </div>
  );
}

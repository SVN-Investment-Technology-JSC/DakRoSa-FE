import React, { useState } from 'react';
import { CanvasNodeData } from '../types';

interface CanvasViewProps {
  nodes: CanvasNodeData[];
  onUpdateNodes: (nodes: CanvasNodeData[]) => void;
  onMenuToggle?: () => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  nodes,
  onUpdateNodes,
  onMenuToggle,
}) => {
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState<CanvasNodeData | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.15, 2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.15, 0.5));
  const handleResetZoom = () => setScale(1);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    let p = 65;
    const interval = setInterval(() => {
      p += 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setIsSimulating(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);

        onUpdateNodes(
          nodes.map((n) => {
            if (n.id === 'val-202') return { ...n, status: 'Complete', progress: 100 };
            if (n.id === 'apr-303') return { ...n, status: 'Processing', progress: 10 };
            return n;
          })
        );
      } else {
        onUpdateNodes(
          nodes.map((n) =>
            n.id === 'val-202' ? { ...n, progress: p } : n
          )
        );
      }
    }, 300);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
      {/* TopAppBar */}
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white border-b border-slate-200 flex justify-between items-center px-4 md:px-8 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 md:hidden text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
              Workflow Canvas
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">
              {isSimulating ? 'sync' : 'play_arrow'}
            </span>
            {isSimulating ? 'Simulating Step...' : 'Run Simulation'}
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="mt-16 flex-1 relative overflow-hidden canvas-bg">
        {/* Floating Canvas Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-md">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Reset Zoom"
          >
            <span className="material-symbols-outlined text-sm">center_focus_strong</span>
          </button>
        </div>

        {/* Zoom Transform Wrapper */}
        <div
          className="w-full h-full p-12 transition-transform duration-200 ease-out origin-center flex items-center justify-center min-w-[800px]"
          style={{ transform: `scale(${scale})` }}
        >
          <div className="relative w-[850px] h-[500px]">
            {/* Connection SVG Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
                <marker
                  id="arrow-orange"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                </marker>
              </defs>

              {/* Line 1: REQ-101 -> VAL-202 */}
              <line
                x1="220"
                y1="120"
                x2="320"
                y2="120"
                stroke="#cbd5e1"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />

              {/* Line 2: VAL-202 -> APR-303 */}
              <line
                x1="540"
                y1="120"
                x2="640"
                y2="120"
                stroke="#cbd5e1"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />

              {/* Line 3: VAL-202 -> MNT-001 (Derivative Maintenance Path) */}
              <path
                d="M 430 200 L 430 320"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
                markerEnd="url(#arrow-orange)"
              />
            </svg>

            {/* Node 1: Intake Triage (REQ-101) */}
            <div
              onClick={() => setSelectedNode(nodes[0])}
              className="absolute left-0 top-[60px] w-52 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer z-10 hover:border-blue-600"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs text-slate-500 font-bold">
                  REQ-101
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  Complete
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Intake Triage
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Initial submission verified.
              </p>
            </div>

            {/* Node 2: Automated Validation (VAL-202) */}
            <div
              onClick={() => setSelectedNode(nodes[1])}
              className="absolute left-[320px] top-[60px] w-56 bg-white border-2 border-blue-600 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer z-10 pulse-border"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs text-blue-600 font-bold">
                  VAL-202
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Processing
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Automated Validation
              </h4>

              {/* Progress Circle & % */}
              <div className="mt-3 flex items-center gap-3 pt-2.5 border-t border-slate-100">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-8 h-8 transform -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                      fill="transparent"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      stroke="#2563eb"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray="75"
                      strokeDashoffset={75 - (75 * (nodes[1]?.progress || 65)) / 100}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-bold text-blue-600 font-mono">
                    {nodes[1]?.progress || 65}%
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800">
                    Running Rule Engines
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Triggers MNT-001 on flag
                  </p>
                </div>
              </div>
            </div>

            {/* Node 3: Final Approval (APR-303) */}
            <div
              onClick={() => setSelectedNode(nodes[2])}
              className="absolute left-[640px] top-[60px] w-52 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer z-10 hover:border-blue-600 opacity-80"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs text-slate-500 font-bold">
                  APR-303
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {nodes[2]?.status || 'Pending'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Final Approval
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Awaits Checker validation.
              </p>
            </div>

            {/* Node 4: Derivative Maintenance Task (MNT-001) */}
            <div
              onClick={() => setSelectedNode(nodes[3])}
              className="absolute left-[320px] top-[320px] w-56 bg-amber-50/50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer z-10"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs text-amber-700 font-bold">
                  MNT-001
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                  Derivative
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Config Update & Maintenance
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Auto-generated maintenance ticket for system alignment.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Selected Node Details Side Sheet */}
      {selectedNode && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl p-6 z-40 flex flex-col justify-between animate-fade-in">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="font-mono font-bold text-blue-600 text-sm">
                {selectedNode.code}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <h3 className="text-base font-bold text-slate-800">
                {selectedNode.title}
              </h3>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Current Status
                </span>
                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedNode.status}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Execution Path Group
                </span>
                <p className="text-xs font-semibold text-slate-700">
                  {selectedNode.group === 'main'
                    ? 'Primary Core Workflow'
                    : 'Derivative Maintenance Sub-routine'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedNode(null)}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      )}

      {/* Simulation toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 z-50 text-xs font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-blue-400 text-lg">
            check_circle
          </span>
          <span>
            Validation completed! Flow progressed to Final Approval.
          </span>
        </div>
      )}
    </div>
  );
};

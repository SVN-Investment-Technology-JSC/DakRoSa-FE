import React, { useState } from 'react';
import { WorkflowRequest } from '../types';

interface SubmitterViewProps {
  onSubmitRequest: (req: WorkflowRequest) => void;
  onMenuToggle?: () => void;
}

export const SubmitterView: React.FC<SubmitterViewProps> = ({
  onSubmitRequest,
  onMenuToggle,
}) => {
  const [workflowType, setWorkflowType] = useState('');
  const [requestTitle, setRequestTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [attachedFileName, setAttachedFileName] = useState<string | undefined>();
  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowType || !requestTitle.trim()) {
      alert('Please fill in required fields (Workflow Type and Request Title).');
      return;
    }

    const newReq: WorkflowRequest = {
      id: `req-${Date.now()}`,
      workflowType,
      title: requestTitle.trim(),
      description: description.trim(),
      priority,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'Initiated',
      attachedFileName,
    };

    onSubmitRequest(newReq);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    // Reset form
    setWorkflowType('');
    setRequestTitle('');
    setDescription('');
    setPriority('normal');
    setAttachedFileName(undefined);
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFileName(e.target.files[0].name);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
      {/* TopAppBar */}
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white border-b border-slate-200 z-30 flex justify-between items-center px-4 md:px-8 w-full shadow-xs">
        <div className="flex items-center md:hidden gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">
            WorkflowEngine
          </h1>
        </div>

        <div className="flex-1 flex justify-end items-center gap-4">
          <div className="relative w-64 hidden sm:block">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium placeholder:text-slate-400"
            />
          </div>

          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-lg">notifications</span>
          </button>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-lg">help_outline</span>
          </button>

          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGqsKtvu-kZ0BLCENQYDmA4s3o5HX0CLPgOuf8rqpeeJV-ITRliv4FP0TafveoyHLV-LqxfBMK1J-f99MSzZ863-CPa2-9RqNzbNQzA3KgEkpOUD-LyrzhwbyRQRpc1d27w0rnrhdnf_pewijz7gN2wyD53o1wy-TCYD7Xh_dRpH97-4w8nnnHxfQcjtf3Y7I5yLZo12UtSVR6OggDwEl00Wr_fe6jVvjpKj-gMHpL3c79ENoHdCweFw"
            alt="Administrator Profile"
            className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0 ml-1"
          />
        </div>
      </header>

      {/* Main Canvas */}
      <main className="mt-16 p-4 md:p-8 flex-1 min-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mb-1">
              New Workflow Request
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Initialize a new process by providing the required operational
              details below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Workflow Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Workflow Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={workflowType}
                      onChange={(e) => setWorkflowType(e.target.value)}
                      required
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-600 font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="" disabled>
                        Select a workflow archetype...
                      </option>
                      <option value="HR Onboarding">HR Onboarding</option>
                      <option value="IT Resource Provisioning">
                        IT Resource Provisioning
                      </option>
                      <option value="CapEx Approval">CapEx Approval</option>
                      <option value="Contract Review">Contract Review</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Request Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Request Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Q3 Server Upgrade Allocation"
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-600 text-slate-800 font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Detailed Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Detailed Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide necessary context and justification for this request..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-600 resize-y text-slate-800 font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Priority & Supporting Documents */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Priority Level */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Priority Level
                    </label>
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value="low"
                          checked={priority === 'low'}
                          onChange={() => setPriority('low')}
                          className="peer sr-only"
                        />
                        <div className="px-3 py-2 border border-slate-200 rounded-xl text-center text-xs text-slate-600 peer-checked:bg-slate-100 peer-checked:text-slate-900 peer-checked:border-slate-400 peer-checked:font-bold transition-all hover:bg-slate-50">
                          Low
                        </div>
                      </label>

                      <label className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value="normal"
                          checked={priority === 'normal'}
                          onChange={() => setPriority('normal')}
                          className="peer sr-only"
                        />
                        <div className="px-3 py-2 border border-slate-200 rounded-xl text-center text-xs text-slate-600 peer-checked:bg-blue-50 peer-checked:text-blue-700 peer-checked:border-blue-300 peer-checked:font-bold transition-all hover:bg-slate-50">
                          Normal
                        </div>
                      </label>

                      <label className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value="high"
                          checked={priority === 'high'}
                          onChange={() => setPriority('high')}
                          className="peer sr-only"
                        />
                        <div className="px-3 py-2 border border-slate-200 rounded-xl text-center text-xs text-slate-600 peer-checked:bg-rose-50 peer-checked:text-rose-700 peer-checked:border-rose-300 peer-checked:font-bold transition-all hover:bg-slate-50">
                          High
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Supporting Documents */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Supporting Documents
                    </label>
                    <label className="border border-dashed border-slate-300 rounded-xl p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 group relative">
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileDrop}
                      />
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-600 transition-colors text-xl">
                        cloud_upload
                      </span>
                      <span className="text-[11px] text-slate-600 font-semibold truncate max-w-[180px]">
                        {attachedFileName ? attachedFileName : 'Click to browse or drag file'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkflowType('');
                      setRequestTitle('');
                      setDescription('');
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs active:scale-[0.98]"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>

            {/* Context Sidebar */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-blue-600 text-lg">
                    info
                  </span>
                  <h3 className="text-xs font-bold text-slate-800">
                    Submission Context
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Submitting this form initiates <strong className="text-slate-700">Step 1</strong> of the
                  selected workflow logic.
                </p>

                <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                  <div className="relative">
                    <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[1.35rem] top-0.5 border-2 border-white" />
                    <h4 className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                      CURRENT: INITIATION
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Request is drafted and submitted to the engine.
                    </p>
                  </div>

                  <div className="relative opacity-60">
                    <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[1.35rem] top-0.5 border-2 border-white" />
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      NEXT: TRIAGE
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      System routing based on priority and type parameters.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-bold text-white mb-2">
                  Need Assistance?
                </h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  If you are unsure which workflow archetype to select, consult
                  the RACI Matrix or contact your department admin.
                </p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Consult RACI Matrix tab in the sidebar.');
                  }}
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold text-xs"
                >
                  View Documentation{' '}
                  <span className="material-symbols-outlined text-[14px]">
                    arrow_forward
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white border border-slate-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 z-50 text-xs font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-blue-400 text-lg">
            check_circle
          </span>
          <span>Workflow request submitted successfully!</span>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { useTaskActivity } from '../hooks/useActivity';

interface ActivityLogPanelProps {
  taskId: string;
}

/** Icon + màu theo loại thao tác; loại lạ rơi về mặc định trung tính. */
const ACTION_STYLE: Record<string, { icon: string; tone: string }> = {
  'task.created': { icon: 'add_circle', tone: 'text-blue-600 bg-blue-50 border-blue-200' },
  'task.work_order_created': { icon: 'build', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  'step.approved': { icon: 'check_circle', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'step.approved_partial': { icon: 'hourglass_top', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'step.rejected': { icon: 'cancel', tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  'step.delegated': { icon: 'swap_horiz', tone: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'step.escalated': { icon: 'arrow_upward', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  'subtasks.replaced': { icon: 'checklist', tone: 'text-violet-700 bg-violet-50 border-violet-200' },
  'subtask.attachment_added': { icon: 'attach_file', tone: 'text-slate-600 bg-slate-50 border-slate-200' },
  'subtask.submitted': { icon: 'task_alt', tone: 'text-violet-700 bg-violet-50 border-violet-200' },
};

const DEFAULT_STYLE = { icon: 'history', tone: 'text-slate-600 bg-slate-50 border-slate-200' };

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ taskId }) => {
  const { data: entries = [], isLoading } = useTaskActivity(taskId);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500">history</span>
          Nhật ký thao tác
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
          Toàn bộ diễn biến của đơn này, theo thứ tự thời gian.
        </p>
      </div>

      {isLoading && <p className="text-xs text-slate-500">Đang tải…</p>}
      {!isLoading && entries.length === 0 && (
        <p className="text-xs text-slate-500 py-4 text-center bg-slate-50 rounded-xl border border-slate-200">
          Chưa có thao tác nào được ghi nhận.
        </p>
      )}

      <ol className="space-y-0">
        {entries.map((entry, index) => {
          const style = ACTION_STYLE[entry.action] ?? DEFAULT_STYLE;
          const isLast = index === entries.length - 1;
          return (
            <li key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <span
                  className={`w-7 h-7 rounded-full border flex items-center justify-center ${style.tone}`}
                >
                  <span className="material-symbols-outlined text-[15px]">{style.icon}</span>
                </span>
                {/* The connector is skipped on the last row so the trail ends cleanly. */}
                {!isLast && <span className="w-px flex-1 bg-slate-200 my-1" />}
              </div>

              <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                <p className="text-xs text-slate-800 leading-relaxed">{entry.summary}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {entry.actor?.fullName ?? 'Hệ thống'} · {formatWhen(entry.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

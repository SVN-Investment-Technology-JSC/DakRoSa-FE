/**
 * Maintenance scheduling arithmetic (BRD 2 Epic 2).
 *
 * Everything here is a PURE function over `YYYY-MM-DD` strings, deliberately
 * kept out of the service so the cron behaviour can be unit-tested without
 * waiting for a scheduler tick or freezing the system clock.
 *
 * Dates are handled as strings, never as `Date`, because the business date is
 * a calendar date in Asia/Ho_Chi_Minh. Round-tripping through a JS `Date`
 * would reinterpret it in the server's timezone and can shift it by a day.
 */

export const MAINTENANCE_FREQUENCIES = ['day', 'week', 'month', 'quarter', 'year'] as const;
export type MaintenanceFrequency = (typeof MAINTENANCE_FREQUENCIES)[number];

/** How many days before the due date a reminder ticket is raised (US 2.1). */
export const REMINDER_LEAD_DAYS = 3;

export const TICKET_STATUSES = ['CRITICAL', 'WARNING', 'ROUTINE'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parse(date: string): { y: number; m: number; d: number } {
  if (!DATE_RE.test(date)) throw new Error(`Ngày không hợp lệ: "${date}" (cần YYYY-MM-DD)`);
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

const pad = (n: number) => String(n).padStart(2, '0');
const format = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addDays(date: string, days: number): string {
  const { y, m, d } = parse(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return format(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

function addMonths(date: string, months: number): string {
  const { y, m, d } = parse(date);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  // Clamp: 31/01 + 1 tháng is 28/02 (or 29/02), not an invalid 31/02.
  return format(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** The next occurrence exactly one cycle after `date`. */
export function addInterval(date: string, frequency: MaintenanceFrequency): string {
  switch (frequency) {
    case 'day':
      return addDays(date, 1);
    case 'week':
      return addDays(date, 7);
    case 'month':
      return addMonths(date, 1);
    case 'quarter':
      return addMonths(date, 3);
    case 'year':
      return addMonths(date, 12);
  }
}

/**
 * First occurrence of the cycle that is still due — i.e. on or after `from`
 * (Q2: the cycle is anchored on `anchor_date`, so a monthly job anchored on
 * the 15th always lands on the 15th, never drifting with when the cron ran).
 *
 * Loop-guarded: a daily schedule anchored years back would otherwise spin.
 */
export function computeNextDueAt(
  anchorDate: string,
  frequency: MaintenanceFrequency,
  from: string,
): string {
  let due = anchorDate;
  let guard = 0;
  while (due < from) {
    due = addInterval(due, frequency);
    if (++guard > 100_000) {
      throw new Error(`Không tính được kỳ hạn kế tiếp cho lịch neo ngày ${anchorDate}`);
    }
  }
  return due;
}

/** Whole days from `from` to `to` (negative when `to` is already past). */
export function daysBetween(from: string, to: string): number {
  const a = parse(from);
  const b = parse(to);
  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86_400_000);
}

/**
 * Urgency of a ticket given how far off its due date is. Matches the three
 * levels the dashboard already renders (CRITICAL / WARNING / ROUTINE).
 */
export function ticketStatusFor(daysUntilDue: number): TicketStatus {
  if (daysUntilDue <= 0) return 'CRITICAL';
  if (daysUntilDue <= 2) return 'WARNING';
  return 'ROUTINE';
}

/** Today's calendar date in Asia/Ho_Chi_Minh, as `YYYY-MM-DD`. */
export function todayInVietnam(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, so no manual re-assembly is needed.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

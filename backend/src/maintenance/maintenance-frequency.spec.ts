import {
  addInterval,
  computeNextDueAt,
  daysBetween,
  ticketStatusFor,
  todayInVietnam,
} from './maintenance-frequency';

describe('addInterval', () => {
  it('advances each frequency by one cycle', () => {
    expect(addInterval('2026-03-10', 'day')).toBe('2026-03-11');
    expect(addInterval('2026-03-10', 'week')).toBe('2026-03-17');
    expect(addInterval('2026-03-10', 'month')).toBe('2026-04-10');
    expect(addInterval('2026-03-10', 'quarter')).toBe('2026-06-10');
    expect(addInterval('2026-03-10', 'year')).toBe('2027-03-10');
  });

  it('rolls over month and year boundaries', () => {
    expect(addInterval('2026-12-31', 'day')).toBe('2027-01-01');
    expect(addInterval('2026-12-28', 'week')).toBe('2027-01-04');
    expect(addInterval('2026-11-30', 'quarter')).toBe('2027-02-28');
  });

  it('clamps to the last day when the target month is shorter', () => {
    // 31/01 + 1 month must be 28/02, not an invalid 31/02 that Date would
    // silently roll forward into March.
    expect(addInterval('2026-01-31', 'month')).toBe('2026-02-28');
    expect(addInterval('2028-01-31', 'month')).toBe('2028-02-29'); // leap year
    expect(addInterval('2026-08-31', 'month')).toBe('2026-09-30');
  });

  it('keeps 29/02 valid a year later by clamping to 28/02', () => {
    expect(addInterval('2028-02-29', 'year')).toBe('2029-02-28');
  });
});

describe('computeNextDueAt', () => {
  it('returns the anchor itself when it has not passed yet', () => {
    expect(computeNextDueAt('2026-09-15', 'month', '2026-08-10')).toBe('2026-09-15');
    expect(computeNextDueAt('2026-08-10', 'month', '2026-08-10')).toBe('2026-08-10');
  });

  it('skips forward past every elapsed cycle', () => {
    expect(computeNextDueAt('2026-01-15', 'month', '2026-08-10')).toBe('2026-08-15');
    expect(computeNextDueAt('2020-03-01', 'year', '2026-08-10')).toBe('2027-03-01');
  });

  it('stays anchored to the day of month instead of drifting', () => {
    // The whole point of Q2: a monthly job anchored on the 15th lands on the
    // 15th every month, no matter when the cron actually ran.
    let due = computeNextDueAt('2026-01-15', 'month', '2026-08-10');
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      seen.push(due);
      due = addInterval(due, 'month');
    }
    expect(seen).toEqual(['2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15']);
  });

  it('survives a daily schedule anchored years in the past', () => {
    expect(computeNextDueAt('2020-01-01', 'day', '2026-08-10')).toBe('2026-08-10');
  });
});

describe('daysBetween', () => {
  it('counts forward, backward and across a leap day', () => {
    expect(daysBetween('2026-08-10', '2026-08-13')).toBe(3);
    expect(daysBetween('2026-08-10', '2026-08-10')).toBe(0);
    expect(daysBetween('2026-08-13', '2026-08-10')).toBe(-3);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2); // 2028 is a leap year
  });
});

describe('ticketStatusFor', () => {
  it('maps lead time to the three dashboard levels', () => {
    expect(ticketStatusFor(-1)).toBe('CRITICAL'); // overdue
    expect(ticketStatusFor(0)).toBe('CRITICAL'); // due today
    expect(ticketStatusFor(1)).toBe('WARNING');
    expect(ticketStatusFor(2)).toBe('WARNING');
    expect(ticketStatusFor(3)).toBe('ROUTINE');
  });
});

describe('todayInVietnam', () => {
  it('uses the Vietnam calendar date, not the server timezone', () => {
    // 23:30 UTC is already the next day in Asia/Ho_Chi_Minh (UTC+7).
    expect(todayInVietnam(new Date('2026-08-10T23:30:00Z'))).toBe('2026-08-11');
    expect(todayInVietnam(new Date('2026-08-10T10:00:00Z'))).toBe('2026-08-10');
  });
});

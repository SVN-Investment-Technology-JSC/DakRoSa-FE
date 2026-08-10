import { BadRequestException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

/**
 * BRD 2 US 2.1 — the daily reminder sweep. The date is injected, so none of
 * this needs a scheduler tick or a frozen clock.
 */
describe('MaintenanceService.runReminderSweep', () => {
  let service: MaintenanceService;
  let schedulesRepository: { find: jest.Mock; update: jest.Mock };
  let ticketsRepository: { findOne: jest.Mock };
  let notificationsService: { createMany: jest.Mock };
  let orgUnitsService: { resolveAssignees: jest.Mock };
  let dataSource: { transaction: jest.Mock; query: jest.Mock };
  let savedTickets: Array<Record<string, unknown>>;

  const schedule = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'sch-1',
    partId: 'part-1',
    frequency: 'month',
    anchorDate: '2026-01-15',
    nextDueAt: '2026-08-15',
    isActive: true,
    part: { id: 'part-1', name: 'Bơm A', orgUnitId: 'ou-1', isActive: true },
    ...over,
  });

  beforeEach(() => {
    savedTickets = [];
    schedulesRepository = { find: jest.fn(), update: jest.fn().mockResolvedValue({}) };
    ticketsRepository = { findOne: jest.fn().mockResolvedValue(null) };
    notificationsService = { createMany: jest.fn().mockResolvedValue([]) };
    orgUnitsService = {
      resolveAssignees: jest.fn().mockResolvedValue([{ userId: 'u-head', isEscalated: false }]),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ nextval: '4001' }]),
      transaction: jest.fn(async (cb: (m: unknown) => Promise<unknown>) =>
        cb({
          create: (_e: unknown, data: Record<string, unknown>) => data,
          save: async (data: Record<string, unknown>) => {
            savedTickets.push(data);
            return { id: 't-1', ...data };
          },
        }),
      ),
    };

    service = new MaintenanceService(
      {} as any,
      schedulesRepository as any,
      ticketsRepository as any,
      orgUnitsService as any,
      notificationsService as any,
      {} as any,
      dataSource as any,
      { record: jest.fn().mockResolvedValue(undefined) } as any, // ActivityService

    );
  });

  it('raises a ticket once the due date is inside the 3-day lead window', async () => {
    schedulesRepository.find.mockResolvedValue([schedule()]);
    const result = await service.runReminderSweep('2026-08-12'); // 3 days out
    expect(result.ticketsCreated).toBe(1);
    expect(savedTickets[0]).toMatchObject({ dueDate: '2026-08-15', ticketNumber: '#4001' });
  });

  it('stays quiet while the due date is still beyond the lead window', async () => {
    schedulesRepository.find.mockResolvedValue([schedule()]);
    const result = await service.runReminderSweep('2026-08-10'); // 5 days out
    expect(result.ticketsCreated).toBe(0);
    expect(savedTickets).toHaveLength(0);
  });

  it('does not raise a second ticket for a cycle already ticketed', async () => {
    // This is what makes a server restart (or a manual re-run) harmless.
    schedulesRepository.find.mockResolvedValue([schedule()]);
    ticketsRepository.findOne.mockResolvedValue({ id: 't-existing' });
    const result = await service.runReminderSweep('2026-08-12');
    expect(result.ticketsCreated).toBe(0);
    expect(savedTickets).toHaveLength(0);
  });

  it('swallows a unique-violation from a concurrent sweep instead of failing', async () => {
    schedulesRepository.find.mockResolvedValue([schedule()]);
    dataSource.transaction.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
    await expect(service.runReminderSweep('2026-08-12')).resolves.toMatchObject({
      ticketsCreated: 0,
    });
  });

  it('re-raises any error that is not a unique violation', async () => {
    schedulesRepository.find.mockResolvedValue([schedule()]);
    dataSource.transaction.mockRejectedValue(new Error('mất kết nối'));
    await expect(service.runReminderSweep('2026-08-12')).rejects.toThrow('mất kết nối');
  });

  it('notifies whoever the part’s org unit resolves to, escalation included', async () => {
    schedulesRepository.find.mockResolvedValue([schedule()]);
    orgUnitsService.resolveAssignees.mockResolvedValue([
      { userId: 'u-boss', isEscalated: true }, // empty seat → escalated upward
    ]);
    await service.runReminderSweep('2026-08-12');
    const [inputs] = notificationsService.createMany.mock.calls[0];
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ userId: 'u-boss', type: 'maintenance_due' });
  });

  it('rolls the schedule forward to the cycle after the one just ticketed', async () => {
    schedulesRepository.find.mockResolvedValue([schedule()]);
    await service.runReminderSweep('2026-08-12');
    expect(schedulesRepository.update).toHaveBeenCalledWith('sch-1', { nextDueAt: '2026-09-15' });
  });

  it('recovers a stale nextDueAt left behind by a cron that did not run', async () => {
    // Anchored in January but nextDueAt was never advanced past February: the
    // sweep must re-derive from the anchor, not fire on the stale value.
    schedulesRepository.find.mockResolvedValue([schedule({ nextDueAt: '2026-02-15' })]);
    const result = await service.runReminderSweep('2026-08-10');
    expect(result.ticketsCreated).toBe(0);
    expect(schedulesRepository.update).toHaveBeenCalledWith('sch-1', { nextDueAt: '2026-08-15' });
  });

  it('skips schedules whose part has been deactivated', async () => {
    schedulesRepository.find.mockResolvedValue([
      schedule({ part: { id: 'part-1', name: 'Bơm A', orgUnitId: 'ou-1', isActive: false } }),
    ]);
    const result = await service.runReminderSweep('2026-08-12');
    expect(result.ticketsCreated).toBe(0);
  });
});

describe('MaintenanceService.createWorkOrder', () => {
  const build = (ticket: Record<string, unknown>, tasksService: unknown, isManager = true) => {
    const ticketsRepository = {
      findOne: jest.fn().mockResolvedValue(ticket),
      update: jest.fn().mockResolvedValue({}),
    };
    const orgUnitsService = { hasSubordinates: jest.fn().mockResolvedValue(isManager) };
    const service = new MaintenanceService(
      {} as any,
      {} as any,
      ticketsRepository as any,
      orgUnitsService as any,
      {} as any,
      tasksService as any,
      {} as any,
      { record: jest.fn().mockResolvedValue(undefined) } as any, // ActivityService

    );
    return { service, ticketsRepository, orgUnitsService };
  };

  const ticket = (over: Record<string, unknown> = {}) => ({
    id: 'tk-1',
    ticketNumber: '#4002',
    dueDate: '2026-08-15',
    priority: 'High',
    note: null,
    resultingTaskId: null,
    part: { code: 'PART-1', name: 'Bơm A', orgUnitId: 'ou-1' },
    schedule: { workflowId: 'wf-exec' },
    ...over,
  });

  it('makes the person who clicked the Node E owner (US 2.3)', async () => {
    const tasksService = { create: jest.fn().mockResolvedValue({ id: 'task-1' }) };
    const { service, ticketsRepository } = build(ticket(), tasksService);

    await service.createWorkOrder('tk-1', 'u-clicker');

    const [, initiator, meta] = tasksService.create.mock.calls[0];
    expect(initiator).toBe('u-clicker');
    expect(meta).toMatchObject({
      origin: 'work_order',
      parentMaintenanceTicketId: 'tk-1',
      nodeEOwnerUserId: 'u-clicker',
    });
    expect(ticketsRepository.update).toHaveBeenCalledWith('tk-1', { resultingTaskId: 'task-1' });
  });

  it('refuses a second Work Order for the same ticket', async () => {
    const tasksService = { create: jest.fn() };
    const { service } = build(ticket({ resultingTaskId: 'task-existing' }), tasksService);
    await expect(service.createWorkOrder('tk-1', 'u-clicker')).rejects.toThrow(BadRequestException);
    expect(tasksService.create).not.toHaveBeenCalled();
  });

  it('refuses a staff-level clicker — they would end up holding a Node E (US 1.2)', async () => {
    // Without this, the Work Order path would be a back door around the
    // manager-only rule that RaciService enforces at design time.
    const tasksService = { create: jest.fn() };
    const { service } = build(ticket(), tasksService, false);
    await expect(service.createWorkOrder('tk-1', 'u-staff')).rejects.toThrow(/cấp Quản lý/);
    expect(tasksService.create).not.toHaveBeenCalled();
  });

  it('refuses when the schedule has no Execution Flow attached', async () => {
    const tasksService = { create: jest.fn() };
    const { service } = build(ticket({ schedule: { workflowId: null } }), tasksService);
    await expect(service.createWorkOrder('tk-1', 'u-clicker')).rejects.toThrow(
      /chưa gắn Luồng Thực thi/,
    );
    expect(tasksService.create).not.toHaveBeenCalled();
  });
});

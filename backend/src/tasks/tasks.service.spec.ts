import { TasksService } from './tasks.service';

/**
 * Spawning linked sub-flows. The guard conditions matter more than the happy
 * path — a wrong guard either duplicates real work orders or silently never
 * spawns. Idempotency is per STEP, so a task whose steps carry several links
 * opens several children, but never the same one twice.
 */
describe('TasksService.spawnSubFlowsForCompletedSteps', () => {
  let service: TasksService;
  let tasksRepository: { findOne: jest.Mock };
  let stepsRepository: { find: jest.Mock; update: jest.Mock };
  let workflowsService: { findOne: jest.Mock };
  let createSpy: jest.SpyInstance;

  const parentTaskId = 'parent-1';

  const makeParent = (overrides: Record<string, unknown> = {}) => ({
    id: parentTaskId,
    status: 'Completed',
    workflowId: 'wf-parent',
    orgUnitId: 'org-1',
    priority: 'Normal',
    title: 'Duyệt CapEx',
    taskCode: 'WF-CAPEX-0001',
    description: 'mô tả',
    initiatorUserId: 'user-initiator',
    ...overrides,
  });

  /** Template steps; only those with a link can ever spawn. */
  const template = (links: Array<string | null>) => ({
    id: 'wf-parent',
    steps: links.map((linkedSubFlowId, i) => ({
      id: `tmpl-${i + 1}`,
      stepOrder: i + 1,
      stepName: `Bước ${i + 1}`,
      linkedSubFlowId,
    })),
  });

  /** Run-time steps of the task. */
  const instances = (
    rows: Array<{ tmpl: string; status: string; linkedSubFlowTaskId?: string | null }>,
  ) =>
    rows.map((r, i) => ({
      id: `inst-${i + 1}`,
      stepOrder: i + 1,
      workflowStepId: r.tmpl,
      status: r.status,
      linkedSubFlowTaskId: r.linkedSubFlowTaskId ?? null,
    }));

  beforeEach(() => {
    tasksRepository = { findOne: jest.fn().mockResolvedValue(makeParent()) };
    stepsRepository = { find: jest.fn().mockResolvedValue([]), update: jest.fn() };
    workflowsService = { findOne: jest.fn() };

    service = new TasksService(
      tasksRepository as any,
      stepsRepository as any,
      {} as any,
      workflowsService as any,
      {} as any,
      { record: jest.fn().mockResolvedValue(undefined) } as any, // ActivityService
      {} as any, // UsersService
    );

    createSpy = jest.spyOn(service, 'create').mockResolvedValue({ id: 'child-1' } as any);
  });

  it('spawns from a completed step that carries a link, with parent link and origin', async () => {
    workflowsService.findOne.mockResolvedValue(template([null, 'wf-exec']));
    stepsRepository.find.mockResolvedValue(
      instances([
        { tmpl: 'tmpl-1', status: 'Completed' },
        { tmpl: 'tmpl-2', status: 'Completed' },
      ]),
    );

    const spawned = await service.spawnSubFlowsForCompletedSteps(parentTaskId);

    expect(spawned).toHaveLength(1);
    const [dto, initiator, meta] = createSpy.mock.calls[0];
    expect(dto).toMatchObject({ workflowId: 'wf-exec', orgUnitId: 'org-1' });
    expect(initiator).toBe('user-initiator');
    expect(meta).toMatchObject({ parentTaskId, origin: 'auto_from_parent' });
    // The child records which step opened it, so a retry cannot duplicate it.
    expect(stepsRepository.update).toHaveBeenCalledWith('inst-2', {
      linkedSubFlowTaskId: 'child-1',
    });
  });

  it('does not spawn from a step that has not completed yet', async () => {
    workflowsService.findOne.mockResolvedValue(template([null, 'wf-exec']));
    stepsRepository.find.mockResolvedValue(
      instances([
        { tmpl: 'tmpl-1', status: 'Completed' },
        { tmpl: 'tmpl-2', status: 'In Progress' },
      ]),
    );

    await expect(service.spawnSubFlowsForCompletedSteps(parentTaskId)).resolves.toEqual([]);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('never spawns the same step twice', async () => {
    workflowsService.findOne.mockResolvedValue(template([null, 'wf-exec']));
    stepsRepository.find.mockResolvedValue(
      instances([
        { tmpl: 'tmpl-1', status: 'Completed' },
        { tmpl: 'tmpl-2', status: 'Completed', linkedSubFlowTaskId: 'child-existing' },
      ]),
    );

    await expect(service.spawnSubFlowsForCompletedSteps(parentTaskId)).resolves.toEqual([]);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('spawns one child per linked step — an execution flow may link several', async () => {
    // This is the Bảng 2 case: any node may carry a sub-flow.
    workflowsService.findOne.mockResolvedValue(template(['wf-a', null, 'wf-b']));
    stepsRepository.find.mockResolvedValue(
      instances([
        { tmpl: 'tmpl-1', status: 'Completed' },
        { tmpl: 'tmpl-2', status: 'Completed' },
        { tmpl: 'tmpl-3', status: 'Completed' },
      ]),
    );

    const spawned = await service.spawnSubFlowsForCompletedSteps(parentTaskId);

    expect(spawned).toHaveLength(2);
    expect(createSpy.mock.calls.map((c) => c[0].workflowId)).toEqual(['wf-a', 'wf-b']);
  });

  it('does nothing when no step carries a link', async () => {
    workflowsService.findOne.mockResolvedValue(template([null, null]));

    await expect(service.spawnSubFlowsForCompletedSteps(parentTaskId)).resolves.toEqual([]);
    // Cheap exit: the run-time steps are not even queried.
    expect(stepsRepository.find).not.toHaveBeenCalled();
  });

  it('does nothing for an ad-hoc task with no workflow', async () => {
    tasksRepository.findOne.mockResolvedValue(makeParent({ workflowId: null }));

    await expect(service.spawnSubFlowsForCompletedSteps(parentTaskId)).resolves.toEqual([]);
    expect(workflowsService.findOne).not.toHaveBeenCalled();
  });
});

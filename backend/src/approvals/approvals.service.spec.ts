import { BadRequestException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let stepsRepository: { findOne: jest.Mock; find: jest.Mock };
  let raciRepository: { findOne: jest.Mock };
  let approvalActionsRepository: Record<string, jest.Mock>;
  let tasksService: { findOne: jest.Mock };
  let orgUnitsService: {
    findSubordinates: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let manager: {
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };

  const taskId = 'task-1';

  const makeStep = (overrides: Partial<any> = {}) => ({
    id: 'step-1',
    taskId,
    workflowStepId: 'wf-step-1',
    stepOrder: 2,
    stepName: 'Step 2',
    status: 'In Progress',
    ...overrides,
  });

  beforeEach(() => {
    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    manager = {
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0), // default: rollback target is not a Node E
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]), // default: no R assignees found -> single-approver path
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    dataSource = {
      transaction: jest.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)),
    };
    stepsRepository = { findOne: jest.fn(), find: jest.fn() };
    raciRepository = { findOne: jest.fn() };
    approvalActionsRepository = {};
    tasksService = { findOne: jest.fn().mockResolvedValue({ id: taskId }) };
    orgUnitsService = {
      // Candidate resolution itself is covered in org-units.service.spec.ts.
      findSubordinates: jest.fn().mockResolvedValue([]),
    };

    service = new ApprovalsService(
      approvalActionsRepository as any,
      stepsRepository as any,
      {} as any, // assigneesRepository — AND-logic queries go through `manager` inside the transaction
      raciRepository as any,
      tasksService as any,
      orgUnitsService as any,
      dataSource as any,
      { record: jest.fn().mockResolvedValue(undefined) } as any, // ActivityService

    );
  });

  describe('approveStep', () => {
    it('rejects when the step is not In Progress', async () => {
      stepsRepository.findOne.mockResolvedValue(makeStep({ status: 'Pending' }));

      await expect(
        service.approveStep(taskId, 'step-1', 'user-1', ['R'], {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires an explicit roleLetter when the actor holds multiple letters', async () => {
      stepsRepository.findOne.mockResolvedValue(makeStep());

      await expect(
        service.approveStep(taskId, 'step-1', 'user-1', ['R', 'I'], {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves, completes the step, and advances to the next step', async () => {
      const step = makeStep({ stepOrder: 1 });
      stepsRepository.findOne.mockResolvedValue(step);
      manager.findOne.mockResolvedValue({ id: 'step-2', taskId, stepOrder: 2 });

      await service.approveStep(taskId, 'step-1', 'user-1', ['S'], { notes: 'ok' });

      expect(manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'APPROVE', roleLetterActedAs: 'S', targetStepInstanceId: null }),
      );
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), step.id, {
        status: 'Completed',
        progress: 100,
      });
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'step-2', { status: 'In Progress' });
    });

    it('marks the task Completed when approving the last step', async () => {
      const step = makeStep({ stepOrder: 4 });
      stepsRepository.findOne.mockResolvedValue(step);
      manager.findOne.mockResolvedValue(null); // no next step

      await service.approveStep(taskId, 'step-1', 'user-1', ['A'], {});

      expect(manager.update).toHaveBeenCalledWith(expect.anything(), taskId, { status: 'Completed' });
    });

    it('AND-logic: a step with multiple R holders stays In Progress until all of them approve', async () => {
      const step = makeStep({ stepOrder: 2 });
      stepsRepository.findOne.mockResolvedValue(step);
      manager.find.mockImplementation((entity: any, opts: any) => {
        if (opts.where.roleLetter === 'R' && !opts.where.action) {
          // the two R-lettered task_step_assignees for this step
          return Promise.resolve([
            { userId: 'user-r1', roleLetter: 'R' },
            { userId: 'user-r2', roleLetter: 'R' },
          ]);
        }
        // approval_actions so far: only user-r1 has approved as R
        return Promise.resolve([{ actorUserId: 'user-r1', roleLetterActedAs: 'R' }]);
      });

      await service.approveStep(taskId, 'step-1', 'user-r1', ['R'], {});

      // step is NOT marked Completed, and the next step is NOT advanced
      expect(manager.update).not.toHaveBeenCalledWith(
        expect.anything(),
        step.id,
        expect.objectContaining({ status: 'Completed' }),
      );
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), step.id, { progress: 50 });
    });

    it('AND-logic: completes and advances once every R holder has approved', async () => {
      const step = makeStep({ stepOrder: 2 });
      stepsRepository.findOne.mockResolvedValue(step);
      manager.find.mockImplementation((entity: any, opts: any) => {
        if (opts.where.roleLetter === 'R' && !opts.where.action) {
          return Promise.resolve([
            { userId: 'user-r1', roleLetter: 'R' },
            { userId: 'user-r2', roleLetter: 'R' },
          ]);
        }
        // both R holders have now approved (this call's own action + the earlier one)
        return Promise.resolve([
          { actorUserId: 'user-r1', roleLetterActedAs: 'R' },
          { actorUserId: 'user-r2', roleLetterActedAs: 'R' },
        ]);
      });
      manager.findOne.mockResolvedValue({ id: 'step-3', taskId, stepOrder: 3 });

      await service.approveStep(taskId, 'step-1', 'user-r2', ['R'], {});

      expect(manager.update).toHaveBeenCalledWith(expect.anything(), step.id, {
        status: 'Completed',
        progress: 100,
      });
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'step-3', { status: 'In Progress' });
    });
  });

  describe('rejectStep — Role differentiation (the core A vs C behavior)', () => {
    it('blocks rejection when the actor holds no A or C letter', async () => {
      stepsRepository.findOne.mockResolvedValue(makeStep());

      await expect(
        service.rejectStep(taskId, 'step-1', 'user-1', ['R', 'I'], { notes: 'x' }),
      ).rejects.toThrow('Only Role A (Approve) or Role C (Checker) can reject a step');
    });

    it('Role C: ignores any client-supplied targetStepId and uses the fixed rollback target', async () => {
      const step = makeStep({ stepOrder: 2, workflowStepId: 'wf-step-2' });
      stepsRepository.findOne
        .mockResolvedValueOnce(step) // findStepOrThrow
        .mockResolvedValueOnce({ id: 'target-step-1', taskId, stepOrder: 1 }); // resolved fixed rollback step
      raciRepository.findOne.mockResolvedValue({ roleLetter: 'C', fixedRollbackStepId: 'wf-step-1' });

      await service.rejectStep(taskId, 'step-1', 'user-1', ['C'], {
        notes: 'not good',
        targetStepId: 'attacker-supplied-step-id', // must be ignored
      });

      expect(raciRepository.findOne).toHaveBeenCalledWith({
        where: { stepId: 'wf-step-2', roleLetter: 'C' },
      });
      expect(manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'REJECT',
          roleLetterActedAs: 'C',
          targetStepInstanceId: null, // C never records a target on the audit row
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'target-step-1', {
        status: 'In Progress',
        progress: 0,
      });
    });

    it('Role C: throws if the workflow step has no configured fixed rollback', async () => {
      const step = makeStep();
      stepsRepository.findOne.mockResolvedValue(step);
      raciRepository.findOne.mockResolvedValue({ roleLetter: 'C', fixedRollbackStepId: null });

      await expect(
        service.rejectStep(taskId, 'step-1', 'user-1', ['C'], { notes: 'x' }),
      ).rejects.toThrow('No fixed rollback target is configured for this Role C step');
    });

    it('Role A: requires targetStepId in the payload', async () => {
      stepsRepository.findOne.mockResolvedValue(makeStep());

      await expect(
        service.rejectStep(taskId, 'step-1', 'user-1', ['A'], { notes: 'x' }),
      ).rejects.toThrow('targetStepId is required when rejecting as Role A');
    });

    it('Role A: rejects a target that does not precede the current step', async () => {
      const step = makeStep({ stepOrder: 2 });
      stepsRepository.findOne
        .mockResolvedValueOnce(step)
        .mockResolvedValueOnce({ id: 'later-step', taskId, stepOrder: 3 });

      await expect(
        service.rejectStep(taskId, 'step-1', 'user-1', ['A'], { notes: 'x', targetStepId: 'later-step' }),
      ).rejects.toThrow('Target step must precede the step being rejected');
    });

    it('Role A: accepts a valid prior target chosen live and records it on the audit row', async () => {
      const step = makeStep({ stepOrder: 4 });
      const target = { id: 'target-step', taskId, stepOrder: 2 };
      stepsRepository.findOne.mockResolvedValueOnce(step).mockResolvedValueOnce(target);

      await service.rejectStep(taskId, 'step-1', 'user-1', ['A'], {
        notes: 'missing legal docs',
        targetStepId: 'target-step',
      });

      expect(manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'REJECT',
          roleLetterActedAs: 'A',
          targetStepInstanceId: 'target-step', // A's live choice IS recorded
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'target-step', {
        status: 'In Progress',
        progress: 0,
      });
      // Steps strictly after target up to and including the rejecting step reset to Pending.
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('step_order > :targetOrder', { targetOrder: 2 });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('step_order <= :rejectOrder', { rejectOrder: 4 });
    });
  });

  describe('Rework (BRD 2 US 1.5 AC2)', () => {
    it('sends the rollback target to Rework when it is a Node E', async () => {
      const step = makeStep({ stepOrder: 4 });
      const target = { id: 'node-e-step', taskId, stepOrder: 2 };
      stepsRepository.findOne.mockResolvedValueOnce(step).mockResolvedValueOnce(target);
      manager.count.mockResolvedValue(1); // target has an E assignee

      await service.rejectStep(taskId, 'step-1', 'user-1', ['A'], {
        notes: 'làm lại',
        targetStepId: 'node-e-step',
      });

      expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'node-e-step', {
        status: 'Rework',
        progress: 0,
      });
    });

    it('uses plain In Progress when the rollback target is not a Node E', async () => {
      const step = makeStep({ stepOrder: 4 });
      const target = { id: 'plain-step', taskId, stepOrder: 2 };
      stepsRepository.findOne.mockResolvedValueOnce(step).mockResolvedValueOnce(target);
      manager.count.mockResolvedValue(0);

      await service.rejectStep(taskId, 'step-1', 'user-1', ['A'], {
        notes: 'x',
        targetStepId: 'plain-step',
      });

      expect(manager.update).toHaveBeenCalledWith(expect.anything(), 'plain-step', {
        status: 'In Progress',
        progress: 0,
      });
    });

    it('a step in Rework is still actionable — the manager can resubmit it', async () => {
      const step = makeStep({ stepOrder: 1, status: 'Rework' });
      stepsRepository.findOne.mockResolvedValue(step);
      manager.findOne.mockResolvedValue({ id: 'step-2', taskId, stepOrder: 2 });

      await service.approveStep(taskId, 'step-1', 'user-1', ['E'], {});

      expect(manager.update).toHaveBeenCalledWith(expect.anything(), step.id, {
        status: 'Completed',
        progress: 100,
      });
    });
  });

  describe('delegateStep', () => {
    it('blocks delegation when the caller holds neither R nor C', async () => {
      stepsRepository.findOne.mockResolvedValue(makeStep());

      await expect(
        service.delegateStep(taskId, 'step-1', 'caller-1', ['I', 'S'], { toUserId: 'someone' }),
      ).rejects.toThrow('Only Role R (Review) or Role C (Checker) holders can delegate a step');
    });

    it('rejects a toUserId that is not a valid subordinate candidate', async () => {
      stepsRepository.findOne.mockResolvedValue(makeStep());
      orgUnitsService.findSubordinates.mockResolvedValue([]);

      await expect(
        service.delegateStep(taskId, 'step-1', 'caller-1', ['R'], { toUserId: 'not-a-subordinate' }),
      ).rejects.toThrow('is not a valid delegation target');
    });

    it('moves the assignee row from the caller to the delegate and records provenance', async () => {
      const step = makeStep();
      stepsRepository.findOne.mockResolvedValue(step);
      orgUnitsService.findSubordinates.mockResolvedValue([
        {
          id: 'subordinate-1',
          email: 'sub@x.com',
          fullName: 'Sub',
          positionName: 'Nhân viên',
          orgUnitTitle: 'Tổ Backend',
        },
      ]);

      await service.delegateStep(taskId, 'step-1', 'caller-1', ['R'], { toUserId: 'subordinate-1' });

      expect(manager.delete).toHaveBeenCalledWith(expect.anything(), {
        taskStepInstanceId: step.id,
        userId: 'caller-1',
        roleLetter: 'R',
      });
      expect(manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          taskStepInstanceId: step.id,
          userId: 'subordinate-1',
          roleLetter: 'R',
          delegatedFromUserId: 'caller-1',
        }),
      );
    });
  });
});

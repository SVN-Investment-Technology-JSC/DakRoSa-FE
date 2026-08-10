import { BadRequestException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

/**
 * BRD 2 Rule 4 / US 1.5 AC1 — a Node E must be immediately followed by a Node C.
 * Enforced when a workflow is started, not while it is being designed.
 */
describe('WorkflowsService.validate (Node E → Node C adjacency)', () => {
  let service: WorkflowsService;
  let workflowsRepository: { findOne: jest.Mock };

  const step = (order: number, letters: string[], code = String(order)) => ({
    id: `s${order}`,
    stepOrder: order,
    stepCode: code,
    stepName: `Bước ${order}`,
    raciAssignments: letters.map((l) => ({ roleLetter: l })),
  });

  const givenSteps = (steps: unknown[]) =>
    workflowsRepository.findOne.mockResolvedValue({ id: 'wf', steps });

  beforeEach(() => {
    workflowsRepository = { findOne: jest.fn() };
    service = new WorkflowsService(workflowsRepository as any, {} as any);
  });

  it('accepts a workflow with no Node E at all', async () => {
    givenSteps([step(1, ['S']), step(2, ['R', 'C'])]);
    await expect(service.validate('wf')).resolves.toEqual({ valid: true, errors: [] });
  });

  it('accepts E immediately followed by C', async () => {
    givenSteps([step(1, ['E']), step(2, ['C'])]);
    await expect(service.validate('wf')).resolves.toEqual({ valid: true, errors: [] });
  });

  it('rejects E followed by a step without C', async () => {
    givenSteps([step(1, ['E']), step(2, ['R'])]);
    const result = await service.validate('wf');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Node E bắt buộc phải được theo sau bởi một Node C');
  });

  it('rejects E on the very last step — there is nothing after it to check', async () => {
    givenSteps([step(1, ['S']), step(2, ['E'])]);
    await expect(service.validate('wf')).resolves.toMatchObject({ valid: false });
  });

  it('a C two steps later is not good enough — it must be immediately adjacent', async () => {
    givenSteps([step(1, ['E']), step(2, ['R']), step(3, ['C'])]);
    await expect(service.validate('wf')).resolves.toMatchObject({ valid: false });
  });

  it('reports every offending step, not just the first', async () => {
    givenSteps([step(1, ['E']), step(2, ['R']), step(3, ['E']), step(4, ['I'])]);
    const result = await service.validate('wf');
    expect(result.errors).toHaveLength(2);
  });

  it('checks adjacency by step order, not array order', async () => {
    // Repository order deliberately scrambled.
    givenSteps([step(2, ['C']), step(1, ['E'])]);
    await expect(service.validate('wf')).resolves.toEqual({ valid: true, errors: [] });
  });

  it('assertExecutable throws so an invalid workflow can never be started', async () => {
    givenSteps([step(1, ['E']), step(2, ['R'])]);
    await expect(service.assertExecutable('wf')).rejects.toThrow(BadRequestException);
  });
});

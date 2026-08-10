import { EntityManager } from 'typeorm';
import { TaskInstance } from './task-instance.entity';
import { TaskStepInstance } from './task-step-instance.entity';

/**
 * Marks a step done and hands the run to the next one — or finishes the task if
 * there is no next step.
 *
 * Shared on purpose: a step can now complete either by approval (Node R/C/A…)
 * or by every E(x) sub-task reaching 100% weight. Both must progress the run
 * identically, and duplicating these four statements is how the two paths would
 * quietly drift apart.
 *
 * Must be called inside a transaction — the caller owns the `manager`.
 */
export async function completeStepAndAdvance(
  manager: EntityManager,
  taskId: string,
  step: { id: string; stepOrder: number },
): Promise<void> {
  await manager.update(TaskStepInstance, step.id, { status: 'Completed', progress: 100 });

  const nextStep = await manager.findOne(TaskStepInstance, {
    where: { taskId, stepOrder: step.stepOrder + 1 },
  });

  if (nextStep) {
    await manager.update(TaskStepInstance, nextStep.id, { status: 'In Progress' });
  } else {
    await manager.update(TaskInstance, taskId, { status: 'Completed' });
  }
}

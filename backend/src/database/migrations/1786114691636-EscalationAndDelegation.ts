import { MigrationInterface, QueryRunner } from "typeorm";

export class EscalationAndDelegation1786114691636 implements MigrationInterface {
    name = 'EscalationAndDelegation1786114691636'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Note: TypeORM's schema diff doesn't recognize the raw-SQL partial unique
        // index from the previous migration (IDX_raci_assignments_one_c_per_step) —
        // it is intentionally left untouched here, not dropped/regenerated.
        await queryRunner.query(`ALTER TABLE "task_step_assignees" ADD "is_escalated" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "task_step_assignees" ADD "delegated_from_user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "task_step_assignees" ADD CONSTRAINT "FK_7009ec603ad21ad0104af5a8a4e" FOREIGN KEY ("delegated_from_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_step_assignees" DROP CONSTRAINT "FK_7009ec603ad21ad0104af5a8a4e"`);
        await queryRunner.query(`ALTER TABLE "task_step_assignees" DROP COLUMN "delegated_from_user_id"`);
        await queryRunner.query(`ALTER TABLE "task_step_assignees" DROP COLUMN "is_escalated"`);
    }

}

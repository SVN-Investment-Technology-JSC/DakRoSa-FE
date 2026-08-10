import { MigrationInterface, QueryRunner } from "typeorm";

export class StepStatusRework1786301163222 implements MigrationInterface {
    name = 'StepStatusRework1786301163222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 4th occurrence: TypeORM's differ cannot see the two raw-SQL indexes on
        // raci_assignments and keeps emitting DROPs for them with no matching
        // CREATE in up(). Removed on purpose — dropping them would destroy the
        // "max 1 Checker per step" rule and the duplicate-tag guard.
        await queryRunner.query(`ALTER TYPE "public"."task_step_instances_status_enum" RENAME TO "task_step_instances_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."task_step_instances_status_enum" AS ENUM('Completed', 'In Progress', 'Pending', 'Rejected', 'Rework')`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ALTER COLUMN "status" TYPE "public"."task_step_instances_status_enum" USING "status"::"text"::"public"."task_step_instances_status_enum"`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ALTER COLUMN "status" SET DEFAULT 'Pending'`);
        await queryRunner.query(`DROP TYPE "public"."task_step_instances_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."task_step_instances_status_enum_old" AS ENUM('Completed', 'In Progress', 'Pending', 'Rejected')`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ALTER COLUMN "status" TYPE "public"."task_step_instances_status_enum_old" USING "status"::"text"::"public"."task_step_instances_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ALTER COLUMN "status" SET DEFAULT 'Pending'`);
        await queryRunner.query(`DROP TYPE "public"."task_step_instances_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."task_step_instances_status_enum_old" RENAME TO "task_step_instances_status_enum"`);
    }

}

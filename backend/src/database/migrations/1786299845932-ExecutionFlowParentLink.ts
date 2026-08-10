import { MigrationInterface, QueryRunner } from "typeorm";

export class ExecutionFlowParentLink1786299845932 implements MigrationInterface {
    name = 'ExecutionFlowParentLink1786299845932'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // NOTE (3rd occurrence): TypeORM's differ cannot see the two raw-SQL
        // indexes on raci_assignments and keeps trying to DROP them here without
        // recreating them in up(). Dropping would silently destroy the BRD rules
        // "max 1 Checker per step" and "no duplicate tag per target". Both DROP
        // lines were removed on purpose — do not let them back in.
        await queryRunner.query(`ALTER TABLE "task_instances" DROP CONSTRAINT "FK_5e61ea8b3c8bccdd8136e66ce52"`);
        // derivative_task_id was a dead column (verified: 0 of 9 rows populated,
        // no code ever wrote it). Superseded by parent_task_id (child → parent).
        await queryRunner.query(`ALTER TABLE "task_instances" DROP COLUMN "derivative_task_id"`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD "parent_task_id" uuid`);
        await queryRunner.query(`CREATE TYPE "public"."task_instances_origin_enum" AS ENUM('manual', 'auto_from_parent', 'work_order')`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD "origin" "public"."task_instances_origin_enum" NOT NULL DEFAULT 'manual'`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD CONSTRAINT "FK_cf9cb4a42186f1d5e940036edb4" FOREIGN KEY ("parent_task_id") REFERENCES "task_instances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_instances" DROP CONSTRAINT "FK_cf9cb4a42186f1d5e940036edb4"`);
        await queryRunner.query(`ALTER TABLE "task_instances" DROP COLUMN "origin"`);
        await queryRunner.query(`DROP TYPE "public"."task_instances_origin_enum"`);
        await queryRunner.query(`ALTER TABLE "task_instances" DROP COLUMN "parent_task_id"`);
        // The two raci_assignments indexes are never dropped in up(), so they are
        // not recreated here.
        await queryRunner.query(`ALTER TABLE "task_instances" ADD "derivative_task_id" uuid`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD CONSTRAINT "FK_5e61ea8b3c8bccdd8136e66ce52" FOREIGN KEY ("derivative_task_id") REFERENCES "task_instances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

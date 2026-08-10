import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskActivityLog1786327043327 implements MigrationInterface {
    name = 'TaskActivityLog1786327043327'

    // !!! HAND-EDITED — 7th time. The TypeORM differ cannot express either of
    // the two raw-SQL indexes on `raci_assignments` (a partial index, and one
    // using NULLS NOT DISTINCT), so it reads them as drift and tries to DROP
    // them on every single generated migration. Both DROPs removed from up(),
    // matching CREATEs removed from down(). Inspect by eye, every time.
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "task_id" uuid NOT NULL, "step_id" uuid, "actor_user_id" uuid, "action" character varying NOT NULL, "summary" text NOT NULL, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_29843bf17728b498584c43be54d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_task_activity_logs_task_created" ON "task_activity_logs" ("task_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "task_activity_logs" ADD CONSTRAINT "FK_b028fe98d89151f76239100ddc3" FOREIGN KEY ("task_id") REFERENCES "task_instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_activity_logs" ADD CONSTRAINT "FK_da26bbe3dc30f4ec508371eb71f" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_activity_logs" DROP CONSTRAINT "FK_da26bbe3dc30f4ec508371eb71f"`);
        await queryRunner.query(`ALTER TABLE "task_activity_logs" DROP CONSTRAINT "FK_b028fe98d89151f76239100ddc3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_task_activity_logs_task_created"`);
        await queryRunner.query(`DROP TABLE "task_activity_logs"`);
    }

}

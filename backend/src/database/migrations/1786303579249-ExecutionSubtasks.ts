import { MigrationInterface, QueryRunner } from "typeorm";

export class ExecutionSubtasks1786303579249 implements MigrationInterface {
    name = 'ExecutionSubtasks1786303579249'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 5th occurrence — see the note in ExecutionFlowParentLink. TypeORM keeps
        // emitting DROPs for the two raw-SQL raci_assignments indexes it cannot
        // introspect. Removed: dropping them kills the "max 1 Checker per step"
        // rule and the duplicate-tag guard, with no CREATE to restore them.
        await queryRunner.query(`CREATE TABLE "execution_attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subtask_id" uuid NOT NULL, "file_name" character varying NOT NULL, "mime_type" character varying NOT NULL, "size_bytes" bigint NOT NULL, "object_key" character varying NOT NULL, "uploaded_by_user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bb8d86783bf77590aaba0343d31" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."execution_subtasks_status_enum" AS ENUM('Pending', 'Submitted')`);
        await queryRunner.query(`CREATE TABLE "execution_subtasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "task_step_instance_id" uuid NOT NULL, "assignee_user_id" uuid NOT NULL, "title" character varying NOT NULL, "weight" numeric(5,2) NOT NULL, "status" "public"."execution_subtasks_status_enum" NOT NULL DEFAULT 'Pending', "submitted_at" TIMESTAMP, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5758f8cfa0fe8059bc93581919e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_784a02bac89b324e7e4224e7c8" ON "execution_subtasks" ("task_step_instance_id", "assignee_user_id", "title") `);
        await queryRunner.query(`ALTER TABLE "execution_attachments" ADD CONSTRAINT "FK_3fddb9bfd0510e06e2b9bdaa26d" FOREIGN KEY ("subtask_id") REFERENCES "execution_subtasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "execution_attachments" ADD CONSTRAINT "FK_9a0f475aee45e304316f050daeb" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "execution_subtasks" ADD CONSTRAINT "FK_2bb0ad2746dc5aedb7e9d6eb74a" FOREIGN KEY ("task_step_instance_id") REFERENCES "task_step_instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "execution_subtasks" ADD CONSTRAINT "FK_c4c87565d62552b0798cb698c68" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "execution_subtasks" DROP CONSTRAINT "FK_c4c87565d62552b0798cb698c68"`);
        await queryRunner.query(`ALTER TABLE "execution_subtasks" DROP CONSTRAINT "FK_2bb0ad2746dc5aedb7e9d6eb74a"`);
        await queryRunner.query(`ALTER TABLE "execution_attachments" DROP CONSTRAINT "FK_9a0f475aee45e304316f050daeb"`);
        await queryRunner.query(`ALTER TABLE "execution_attachments" DROP CONSTRAINT "FK_3fddb9bfd0510e06e2b9bdaa26d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_784a02bac89b324e7e4224e7c8"`);
        await queryRunner.query(`DROP TABLE "execution_subtasks"`);
        await queryRunner.query(`DROP TYPE "public"."execution_subtasks_status_enum"`);
        await queryRunner.query(`DROP TABLE "execution_attachments"`);
    }

}

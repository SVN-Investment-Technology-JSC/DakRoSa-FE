import { MigrationInterface, QueryRunner } from "typeorm";

export class InitWorkflowRequests1786093197365 implements MigrationInterface {
    name = 'InitWorkflowRequests1786093197365'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."workflow_requests_workflow_kind_enum" AS ENUM('process', 'maintenance_linked', 'maintenance_direct')`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_requests_priority_enum" AS ENUM('low', 'normal', 'high')`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_requests_status_enum" AS ENUM('Initiated', 'Triage', 'In Progress', 'Completed')`);
        await queryRunner.query(`CREATE TABLE "workflow_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workflow_kind" "public"."workflow_requests_workflow_kind_enum" NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "priority" "public"."workflow_requests_priority_enum" NOT NULL DEFAULT 'normal', "status" "public"."workflow_requests_status_enum" NOT NULL DEFAULT 'Initiated', "attached_file_name" character varying, "submitted_by_user_id" uuid NOT NULL, "resulting_task_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d5a35a69fea18a28866667a79a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "workflow_requests" ADD CONSTRAINT "FK_cfb242afc3e2ac15183b51c83b8" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workflow_requests" ADD CONSTRAINT "FK_584fb48153326d1a9d7c2adc789" FOREIGN KEY ("resulting_task_id") REFERENCES "task_instances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_requests" DROP CONSTRAINT "FK_584fb48153326d1a9d7c2adc789"`);
        await queryRunner.query(`ALTER TABLE "workflow_requests" DROP CONSTRAINT "FK_cfb242afc3e2ac15183b51c83b8"`);
        await queryRunner.query(`DROP TABLE "workflow_requests"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_requests_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_requests_workflow_kind_enum"`);
    }

}

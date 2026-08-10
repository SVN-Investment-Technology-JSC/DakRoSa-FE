import { MigrationInterface, QueryRunner } from "typeorm";

export class InitTasksApprovals1786092649924 implements MigrationInterface {
    name = 'InitTasksApprovals1786092649924'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."task_instances_workflow_kind_enum" AS ENUM('process', 'maintenance_linked', 'maintenance_direct')`);
        await queryRunner.query(`CREATE TYPE "public"."task_instances_status_enum" AS ENUM('Active', 'Pending', 'Completed', 'Rejected')`);
        await queryRunner.query(`CREATE TYPE "public"."task_instances_priority_enum" AS ENUM('High', 'Normal', 'Low')`);
        await queryRunner.query(`CREATE TABLE "task_instances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workflow_id" uuid, "workflow_kind" "public"."task_instances_workflow_kind_enum" NOT NULL, "title" character varying NOT NULL, "reference_code" character varying, "reference_title" character varying, "status" "public"."task_instances_status_enum" NOT NULL DEFAULT 'Active', "due_date" date, "initiator_user_id" uuid NOT NULL, "org_unit_id" uuid NOT NULL, "priority" "public"."task_instances_priority_enum" NOT NULL DEFAULT 'Normal', "task_code" character varying NOT NULL, "description" text, "checker_role" character varying, "derivative_task_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e51505eabb6f969fe8382550583" UNIQUE ("task_code"), CONSTRAINT "PK_55f6cfde0152600685a7419e9d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."task_step_instances_status_enum" AS ENUM('Completed', 'In Progress', 'Pending', 'Rejected')`);
        await queryRunner.query(`CREATE TABLE "task_step_instances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "task_id" uuid NOT NULL, "workflow_step_id" uuid, "step_order" integer NOT NULL, "step_name" character varying NOT NULL, "role_assigned_summary" character varying, "status" "public"."task_step_instances_status_enum" NOT NULL DEFAULT 'Pending', "progress" integer NOT NULL DEFAULT '0', "is_derivative" boolean NOT NULL DEFAULT false, "linked_sub_flow_task_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_896b89a29ac63eb847c31dadaeb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f80a6293ed71058c19b70533f3" ON "task_step_instances" ("task_id", "step_order") `);
        await queryRunner.query(`CREATE TYPE "public"."task_step_assignees_role_letter_enum" AS ENUM('R', 'A', 'C', 'S', 'I', 'E')`);
        await queryRunner.query(`CREATE TABLE "task_step_assignees" ("task_step_instance_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_letter" "public"."task_step_assignees_role_letter_enum" NOT NULL, CONSTRAINT "PK_d694ca9f2dff26a98d804734ecd" PRIMARY KEY ("task_step_instance_id", "user_id", "role_letter"))`);
        await queryRunner.query(`CREATE TYPE "public"."approval_actions_action_enum" AS ENUM('APPROVE', 'REJECT')`);
        await queryRunner.query(`CREATE TYPE "public"."approval_actions_role_letter_acted_as_enum" AS ENUM('R', 'A', 'C', 'S', 'I', 'E')`);
        await queryRunner.query(`CREATE TABLE "approval_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "task_step_instance_id" uuid NOT NULL, "actor_user_id" uuid NOT NULL, "action" "public"."approval_actions_action_enum" NOT NULL, "role_letter_acted_as" "public"."approval_actions_role_letter_acted_as_enum" NOT NULL, "target_step_instance_id" uuid, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dcf156731ecc8b420b6c39d22c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD CONSTRAINT "FK_096b316137cdaccdbba39e512d3" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD CONSTRAINT "FK_35254b7df627471637658a923ec" FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD CONSTRAINT "FK_8dd3d1f8bc189c3a6f7b835d08c" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD CONSTRAINT "FK_5e61ea8b3c8bccdd8136e66ce52" FOREIGN KEY ("derivative_task_id") REFERENCES "task_instances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ADD CONSTRAINT "FK_9d90931d41751c47a8d96b52096" FOREIGN KEY ("task_id") REFERENCES "task_instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ADD CONSTRAINT "FK_6588351cfcff649d3e5537bd168" FOREIGN KEY ("workflow_step_id") REFERENCES "workflow_steps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" ADD CONSTRAINT "FK_048eba03a4bcce407eaafc65fc5" FOREIGN KEY ("linked_sub_flow_task_id") REFERENCES "task_instances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_step_assignees" ADD CONSTRAINT "FK_d2f9f34de0489864e4f88d0ffbc" FOREIGN KEY ("task_step_instance_id") REFERENCES "task_step_instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_step_assignees" ADD CONSTRAINT "FK_370a789e7a79cc472b6de594304" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "approval_actions" ADD CONSTRAINT "FK_0214063d3e7a05e606871ff01e5" FOREIGN KEY ("task_step_instance_id") REFERENCES "task_step_instances"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "approval_actions" ADD CONSTRAINT "FK_31c08ce16825393796a5cc60c0d" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "approval_actions" ADD CONSTRAINT "FK_8c404e3701964b48b7641448bec" FOREIGN KEY ("target_step_instance_id") REFERENCES "task_step_instances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "approval_actions" DROP CONSTRAINT "FK_8c404e3701964b48b7641448bec"`);
        await queryRunner.query(`ALTER TABLE "approval_actions" DROP CONSTRAINT "FK_31c08ce16825393796a5cc60c0d"`);
        await queryRunner.query(`ALTER TABLE "approval_actions" DROP CONSTRAINT "FK_0214063d3e7a05e606871ff01e5"`);
        await queryRunner.query(`ALTER TABLE "task_step_assignees" DROP CONSTRAINT "FK_370a789e7a79cc472b6de594304"`);
        await queryRunner.query(`ALTER TABLE "task_step_assignees" DROP CONSTRAINT "FK_d2f9f34de0489864e4f88d0ffbc"`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" DROP CONSTRAINT "FK_048eba03a4bcce407eaafc65fc5"`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" DROP CONSTRAINT "FK_6588351cfcff649d3e5537bd168"`);
        await queryRunner.query(`ALTER TABLE "task_step_instances" DROP CONSTRAINT "FK_9d90931d41751c47a8d96b52096"`);
        await queryRunner.query(`ALTER TABLE "task_instances" DROP CONSTRAINT "FK_5e61ea8b3c8bccdd8136e66ce52"`);
        await queryRunner.query(`ALTER TABLE "task_instances" DROP CONSTRAINT "FK_8dd3d1f8bc189c3a6f7b835d08c"`);
        await queryRunner.query(`ALTER TABLE "task_instances" DROP CONSTRAINT "FK_35254b7df627471637658a923ec"`);
        await queryRunner.query(`ALTER TABLE "task_instances" DROP CONSTRAINT "FK_096b316137cdaccdbba39e512d3"`);
        await queryRunner.query(`DROP TABLE "approval_actions"`);
        await queryRunner.query(`DROP TYPE "public"."approval_actions_role_letter_acted_as_enum"`);
        await queryRunner.query(`DROP TYPE "public"."approval_actions_action_enum"`);
        await queryRunner.query(`DROP TABLE "task_step_assignees"`);
        await queryRunner.query(`DROP TYPE "public"."task_step_assignees_role_letter_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f80a6293ed71058c19b70533f3"`);
        await queryRunner.query(`DROP TABLE "task_step_instances"`);
        await queryRunner.query(`DROP TYPE "public"."task_step_instances_status_enum"`);
        await queryRunner.query(`DROP TABLE "task_instances"`);
        await queryRunner.query(`DROP TYPE "public"."task_instances_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."task_instances_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."task_instances_workflow_kind_enum"`);
    }

}

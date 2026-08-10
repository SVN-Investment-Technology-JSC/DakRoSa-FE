import { MigrationInterface, QueryRunner } from "typeorm";

export class InitWorkflowsRaci1786091700041 implements MigrationInterface {
    name = 'InitWorkflowsRaci1786091700041'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."raci_assignments_role_letter_enum" AS ENUM('R', 'A', 'C', 'S', 'I', 'E')`);
        await queryRunner.query(`CREATE TABLE "raci_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "step_id" uuid NOT NULL, "column_org_unit_id" uuid NOT NULL, "target_org_unit_id" uuid, "role_letter" "public"."raci_assignments_role_letter_enum" NOT NULL, "fixed_rollback_step_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_6bb836f762477ccc85032a599a" CHECK ("role_letter" <> 'A' OR "fixed_rollback_step_id" IS NULL), CONSTRAINT "CHK_f896d0f111b02c1f5f44d8a377" CHECK ("role_letter" <> 'C' OR "fixed_rollback_step_id" IS NOT NULL), CONSTRAINT "PK_9b78379d2d28379f5e20c1717e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b2c54d9864c5d51f137814e53c" ON "raci_assignments" ("step_id", "column_org_unit_id", "target_org_unit_id", "role_letter") `);
        await queryRunner.query(`CREATE TABLE "workflow_steps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workflow_id" uuid NOT NULL, "step_order" integer NOT NULL, "step_code" character varying NOT NULL, "step_name" character varying NOT NULL, "icon" character varying, "linked_sub_flow_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b602e5ecb22943db11c96a7f31c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d8c59329012b7bf1f54625b930" ON "workflow_steps" ("workflow_id", "step_order") `);
        await queryRunner.query(`CREATE TYPE "public"."workflows_kind_enum" AS ENUM('process', 'maintenance_linked', 'maintenance_direct')`);
        await queryRunner.query(`CREATE TABLE "workflows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "description" text, "kind" "public"."workflows_kind_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9b82c92e22d337a8c76109b348e" UNIQUE ("code"), CONSTRAINT "PK_5b5757cc1cd86268019fef52e0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."role_letter_allowlist_workflow_kind_enum" AS ENUM('process', 'maintenance_linked', 'maintenance_direct')`);
        await queryRunner.query(`CREATE TYPE "public"."role_letter_allowlist_role_letter_enum" AS ENUM('R', 'A', 'C', 'S', 'I', 'E')`);
        await queryRunner.query(`CREATE TABLE "role_letter_allowlist" ("workflow_kind" "public"."role_letter_allowlist_workflow_kind_enum" NOT NULL, "role_letter" "public"."role_letter_allowlist_role_letter_enum" NOT NULL, CONSTRAINT "PK_e4fd07609c95f2b099ad2d759dc" PRIMARY KEY ("workflow_kind", "role_letter"))`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_b18beeaa897bbc615fe80c2c485" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_e1ad1b4ea68a480a77f877bdbab" FOREIGN KEY ("column_org_unit_id") REFERENCES "org_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_a7c28ecf94281414636ab3cca13" FOREIGN KEY ("target_org_unit_id") REFERENCES "org_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_b0c018fec3545949c1dc1d5e4c4" FOREIGN KEY ("fixed_rollback_step_id") REFERENCES "workflow_steps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workflow_steps" ADD CONSTRAINT "FK_02f0092e12343bfed27bb65fa89" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workflow_steps" ADD CONSTRAINT "FK_7df24c6387582c187dfe829c532" FOREIGN KEY ("linked_sub_flow_id") REFERENCES "workflows"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workflows" ADD CONSTRAINT "FK_5d7e754199da9d7bf87f810ff17" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflows" DROP CONSTRAINT "FK_5d7e754199da9d7bf87f810ff17"`);
        await queryRunner.query(`ALTER TABLE "workflow_steps" DROP CONSTRAINT "FK_7df24c6387582c187dfe829c532"`);
        await queryRunner.query(`ALTER TABLE "workflow_steps" DROP CONSTRAINT "FK_02f0092e12343bfed27bb65fa89"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_b0c018fec3545949c1dc1d5e4c4"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_a7c28ecf94281414636ab3cca13"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_e1ad1b4ea68a480a77f877bdbab"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_b18beeaa897bbc615fe80c2c485"`);
        await queryRunner.query(`DROP TABLE "role_letter_allowlist"`);
        await queryRunner.query(`DROP TYPE "public"."role_letter_allowlist_role_letter_enum"`);
        await queryRunner.query(`DROP TYPE "public"."role_letter_allowlist_workflow_kind_enum"`);
        await queryRunner.query(`DROP TABLE "workflows"`);
        await queryRunner.query(`DROP TYPE "public"."workflows_kind_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d8c59329012b7bf1f54625b930"`);
        await queryRunner.query(`DROP TABLE "workflow_steps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2c54d9864c5d51f137814e53c"`);
        await queryRunner.query(`DROP TABLE "raci_assignments"`);
        await queryRunner.query(`DROP TYPE "public"."raci_assignments_role_letter_enum"`);
    }

}

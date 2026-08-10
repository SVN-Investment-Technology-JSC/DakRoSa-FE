import { MigrationInterface, QueryRunner } from "typeorm";

export class RaciAssignmentsAnyLevel1786113506884 implements MigrationInterface {
    name = 'RaciAssignmentsAnyLevel1786113506884'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename (not drop+recreate) so existing rows keep their org unit reference.
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_e1ad1b4ea68a480a77f877bdbab"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_a7c28ecf94281414636ab3cca13"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2c54d9864c5d51f137814e53c"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" RENAME COLUMN "column_org_unit_id" TO "org_unit_id"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP COLUMN "target_org_unit_id"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4272cf435939da8fbf5f7a7ca9" ON "raci_assignments" ("step_id", "org_unit_id", "role_letter") `);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_6fb60107e498d91e661ac3f306c" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // BRD Epic 2 AC2: at most 1 "C" (Checker) tag per step, enforced at the DB level.
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_raci_assignments_one_c_per_step" ON "raci_assignments" ("step_id") WHERE "role_letter" = 'C'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_raci_assignments_one_c_per_step"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_6fb60107e498d91e661ac3f306c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4272cf435939da8fbf5f7a7ca9"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD "target_org_unit_id" uuid`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" RENAME COLUMN "org_unit_id" TO "column_org_unit_id"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b2c54d9864c5d51f137814e53c" ON "raci_assignments" ("step_id", "column_org_unit_id", "target_org_unit_id", "role_letter") `);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_a7c28ecf94281414636ab3cca13" FOREIGN KEY ("target_org_unit_id") REFERENCES "org_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_e1ad1b4ea68a480a77f877bdbab" FOREIGN KEY ("column_org_unit_id") REFERENCES "org_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

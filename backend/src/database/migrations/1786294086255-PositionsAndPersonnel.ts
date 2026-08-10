import { MigrationInterface, QueryRunner } from "typeorm";

export class PositionsAndPersonnel1786294086255 implements MigrationInterface {
    name = 'PositionsAndPersonnel1786294086255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Superseded below by a 5-column variant that also covers position/user.
        await queryRunner.query(`DROP INDEX "public"."IDX_4272cf435939da8fbf5f7a7ca9"`);
        // NOTE: IDX_raci_assignments_one_c_per_step is deliberately NOT dropped.
        // TypeORM's differ can't see raw-SQL partial indexes and wants to remove
        // it; doing so would silently kill the BRD "max 1 Checker per step" rule.
        await queryRunner.query(`CREATE TABLE "positions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "rank" integer NOT NULL DEFAULT '100', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e21258bdc3692b44960c623940f" UNIQUE ("code"), CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "org_unit_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "org_unit_id" uuid NOT NULL, "user_id" uuid NOT NULL, "position_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cd2d23f91f21d1922691ad03524" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f939e8740681ae443496cf37d5" ON "org_unit_members" ("org_unit_id", "user_id", "position_id") `);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD "position_id" uuid`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "CHK_262038df77e8904bac308e3b35" CHECK ("position_id" IS NULL OR "user_id" IS NULL)`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_98038ae3e688bf360610bf5ae51" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" ADD CONSTRAINT "FK_072fc7e026a414587c9662b705a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_unit_members" ADD CONSTRAINT "FK_d330a32bb12b8a6d8bb51e24c0f" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_unit_members" ADD CONSTRAINT "FK_686e27e9bde01ef75b8ac056ba6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_unit_members" ADD CONSTRAINT "FK_4edfe5979bebe8a6becf66e0bff" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // One tag per (step, org unit, position, user, letter). NULLS NOT DISTINCT
        // (PG15+) so the two "not narrowed" NULLs still collide as a duplicate —
        // a plain unique index would let identical unit-level tags be inserted twice.
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_raci_assignments_target" ON "raci_assignments" ("step_id", "org_unit_id", "position_id", "user_id", "role_letter") NULLS NOT DISTINCT`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_raci_assignments_target"`);
        await queryRunner.query(`ALTER TABLE "org_unit_members" DROP CONSTRAINT "FK_4edfe5979bebe8a6becf66e0bff"`);
        await queryRunner.query(`ALTER TABLE "org_unit_members" DROP CONSTRAINT "FK_686e27e9bde01ef75b8ac056ba6"`);
        await queryRunner.query(`ALTER TABLE "org_unit_members" DROP CONSTRAINT "FK_d330a32bb12b8a6d8bb51e24c0f"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_072fc7e026a414587c9662b705a"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "FK_98038ae3e688bf360610bf5ae51"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP CONSTRAINT "CHK_262038df77e8904bac308e3b35"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "raci_assignments" DROP COLUMN "position_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f939e8740681ae443496cf37d5"`);
        await queryRunner.query(`DROP TABLE "org_unit_members"`);
        await queryRunner.query(`DROP TABLE "positions"`);
        // one_c_per_step was never dropped in up(), so it is not recreated here.
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4272cf435939da8fbf5f7a7ca9" ON "raci_assignments" ("step_id", "org_unit_id", "role_letter") `);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class InitOrgUnits1786090209947 implements MigrationInterface {
    name = 'InitOrgUnits1786090209947'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "org_unit_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "color_class" character varying, "hex_color" character varying, "default_rank" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5a7739fb47d606065373462bc08" UNIQUE ("code"), CONSTRAINT "PK_0f474f7d3928ed4bf1745206a6b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "org_units" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parent_id" uuid, "type_id" uuid NOT NULL, "title" character varying NOT NULL, "level" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "head_user_id" uuid, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b4a19b7f3756560cd75643be5a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_93e336d1c079edb2cecd9c8f59" ON "org_units" ("parent_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6bd51987100406bbbae03703cc" ON "org_units" ("level", "parent_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cf903d8e29f2eba67907d2e34d" ON "org_units" ("level") `);
        await queryRunner.query(`CREATE TABLE "org_unit_closure" ("ancestor_id" uuid NOT NULL, "descendant_id" uuid NOT NULL, "depth" integer NOT NULL, CONSTRAINT "PK_7cfabaf90d0427b5da886c9e169" PRIMARY KEY ("ancestor_id", "descendant_id"))`);
        await queryRunner.query(`ALTER TABLE "org_units" ADD CONSTRAINT "FK_93e336d1c079edb2cecd9c8f599" FOREIGN KEY ("parent_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_units" ADD CONSTRAINT "FK_9355ca625ab27df27bb0aed600e" FOREIGN KEY ("type_id") REFERENCES "org_unit_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_units" ADD CONSTRAINT "FK_112617d0efa717a51b308679bea" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_unit_closure" ADD CONSTRAINT "FK_d2d433365fd34ef9b2da4bb193c" FOREIGN KEY ("ancestor_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_unit_closure" ADD CONSTRAINT "FK_1a951e7d0984b7c4a46a82ab8a6" FOREIGN KEY ("descendant_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "org_unit_closure" DROP CONSTRAINT "FK_1a951e7d0984b7c4a46a82ab8a6"`);
        await queryRunner.query(`ALTER TABLE "org_unit_closure" DROP CONSTRAINT "FK_d2d433365fd34ef9b2da4bb193c"`);
        await queryRunner.query(`ALTER TABLE "org_units" DROP CONSTRAINT "FK_112617d0efa717a51b308679bea"`);
        await queryRunner.query(`ALTER TABLE "org_units" DROP CONSTRAINT "FK_9355ca625ab27df27bb0aed600e"`);
        await queryRunner.query(`ALTER TABLE "org_units" DROP CONSTRAINT "FK_93e336d1c079edb2cecd9c8f599"`);
        await queryRunner.query(`DROP TABLE "org_unit_closure"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cf903d8e29f2eba67907d2e34d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bd51987100406bbbae03703cc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_93e336d1c079edb2cecd9c8f59"`);
        await queryRunner.query(`DROP TABLE "org_units"`);
        await queryRunner.query(`DROP TABLE "org_unit_types"`);
    }

}

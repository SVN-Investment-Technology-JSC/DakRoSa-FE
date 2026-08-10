import { MigrationInterface, QueryRunner } from "typeorm";

export class MaintenanceModule1786322987516 implements MigrationInterface {
    name = 'MaintenanceModule1786322987516'

    // !!! HAND-EDITED — DO NOT REGENERATE BLINDLY !!!
    // For the 6th time, the TypeORM differ wanted to DROP the two raw-SQL
    // indexes on `raci_assignments` here and never recreate them:
    //   - IDX_raci_assignments_one_c_per_step (partial: max 1 Checker per step)
    //   - IDX_raci_assignments_target         (uses NULLS NOT DISTINCT)
    // It cannot express either clause, so it reads them as drift on every run.
    // Both DROPs were removed from up() and their matching CREATEs from down().
    // Any future migration touching this table must be inspected by eye.
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "body" text, "link" character varying, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_user_created" ON "notifications" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_schedules_frequency_enum" AS ENUM('day', 'week', 'month', 'quarter', 'year')`);
        await queryRunner.query(`CREATE TABLE "maintenance_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "part_id" uuid NOT NULL, "frequency" "public"."maintenance_schedules_frequency_enum" NOT NULL, "anchor_date" date NOT NULL, "next_due_at" date NOT NULL, "workflow_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2ce3383b6ff08ab48a28f515e4f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_maintenance_schedules_part_frequency" ON "maintenance_schedules" ("part_id", "frequency") `);
        await queryRunner.query(`CREATE TABLE "maintenance_parts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "org_unit_id" uuid NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bf920b07dd49ff8ba03e941f97e" UNIQUE ("code"), CONSTRAINT "PK_857612b5819f8fef6b13dbb5226" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_tickets_status_enum" AS ENUM('CRITICAL', 'WARNING', 'ROUTINE')`);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_tickets_priority_enum" AS ENUM('High', 'Normal', 'Low')`);
        await queryRunner.query(`CREATE TABLE "maintenance_tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_number" character varying NOT NULL, "part_id" uuid NOT NULL, "schedule_id" uuid NOT NULL, "due_date" date NOT NULL, "status" "public"."maintenance_tickets_status_enum" NOT NULL DEFAULT 'ROUTINE', "priority" "public"."maintenance_tickets_priority_enum" NOT NULL DEFAULT 'Normal', "note" text, "resulting_task_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0030314e965588647be6ffd77df" UNIQUE ("ticket_number"), CONSTRAINT "PK_6864618af429f4de6b8aede5afa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_maintenance_tickets_schedule_due" ON "maintenance_tickets" ("schedule_id", "due_date") `);
        // Ticket numbers come from a sequence so concurrent sweeps can never
        // be handed the same number (a COUNT(*) would).
        await queryRunner.query(`CREATE SEQUENCE "maintenance_ticket_number_seq" START WITH 4001`);
        await queryRunner.query(`ALTER TABLE "task_instances" ADD "parent_maintenance_ticket_id" uuid`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "FK_1d5cd80beb81aa6ee2260ca191d" FOREIGN KEY ("part_id") REFERENCES "maintenance_parts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "FK_07a2545afee26926b48db858113" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_parts" ADD CONSTRAINT "FK_4ad9dda08bf473aac6977bfbd0b" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "FK_5c4befe67836d868158c66b8d2a" FOREIGN KEY ("part_id") REFERENCES "maintenance_parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "FK_5a0f935d0e6d3337c6f107b6ad1" FOREIGN KEY ("schedule_id") REFERENCES "maintenance_schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "FK_9146afde6c82770e533cf126ae9" FOREIGN KEY ("resulting_task_id") REFERENCES "task_instances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "maintenance_tickets" DROP CONSTRAINT "FK_9146afde6c82770e533cf126ae9"`);
        await queryRunner.query(`ALTER TABLE "maintenance_tickets" DROP CONSTRAINT "FK_5a0f935d0e6d3337c6f107b6ad1"`);
        await queryRunner.query(`ALTER TABLE "maintenance_tickets" DROP CONSTRAINT "FK_5c4befe67836d868158c66b8d2a"`);
        await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP CONSTRAINT "FK_4ad9dda08bf473aac6977bfbd0b"`);
        await queryRunner.query(`ALTER TABLE "maintenance_schedules" DROP CONSTRAINT "FK_07a2545afee26926b48db858113"`);
        await queryRunner.query(`ALTER TABLE "maintenance_schedules" DROP CONSTRAINT "FK_1d5cd80beb81aa6ee2260ca191d"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "task_instances" DROP COLUMN "parent_maintenance_ticket_id"`);
        await queryRunner.query(`DROP SEQUENCE "maintenance_ticket_number_seq"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_tickets_schedule_due"`);
        await queryRunner.query(`DROP TABLE "maintenance_tickets"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_tickets_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_tickets_status_enum"`);
        await queryRunner.query(`DROP TABLE "maintenance_parts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_schedules_part_frequency"`);
        await queryRunner.query(`DROP TABLE "maintenance_schedules"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_schedules_frequency_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_created"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }

}

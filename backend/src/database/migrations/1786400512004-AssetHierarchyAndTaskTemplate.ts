import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BRD 3 — cây cấu trúc tài sản + danh sách nhiệm vụ JSON theo thiết bị + nguồn
 * dữ liệu công việc cho Role E.
 *
 * !!! VIẾT TAY — KHÔNG REGENERATE ĐÈ LÊN !!!
 * Cùng lý do đã ghi ở `MaintenanceModule1786322987516`: bộ differ của TypeORM
 * không đọc được hai index raw-SQL trên `raci_assignments`
 * (`IDX_raci_assignments_one_c_per_step`, `IDX_raci_assignments_target`) nên
 * lần nào cũng đòi DROP chúng. File này cũng đặt tên tay cho các CHECK
 * constraint thay vì để TypeORM băm tên, nên `migration:generate` về sau sẽ
 * thấy chúng là "drift" — phải soi bằng mắt trước khi chạy.
 */
export class AssetHierarchyAndTaskTemplate1786400512004 implements MigrationInterface {
  name = 'AssetHierarchyAndTaskTemplate1786400512004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------ Cây tài sản (Epic 1)
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_parts_asset_kind_enum" AS ENUM('company', 'factory', 'main_equipment', 'part')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_parts_condition_enum" AS ENUM('operating', 'broken', 'standby', 'other')`,
    );
    await queryRunner.query(`ALTER TABLE "maintenance_parts" ADD "parent_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "maintenance_parts" ADD "asset_kind" "public"."maintenance_parts_asset_kind_enum" NOT NULL DEFAULT 'part'`,
    );
    await queryRunner.query(`ALTER TABLE "maintenance_parts" ADD "symbol" character varying`);
    await queryRunner.query(
      `ALTER TABLE "maintenance_parts" ADD "condition" "public"."maintenance_parts_condition_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "maintenance_parts" ADD "location" character varying`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" ADD "specifications" text`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" ADD "manufacturer" character varying`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" ADD "task_template" jsonb`);

    // Node Công ty / Nhà máy không nhất thiết thuộc đơn vị nào. Chỗ cần đơn vị
    // (lên lịch, tạo Lệnh) leo ngược cây tìm — xem MaintenanceService.
    await queryRunner.query(
      `ALTER TABLE "maintenance_parts" ALTER COLUMN "org_unit_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_parts" ADD CONSTRAINT "FK_maintenance_parts_parent" FOREIGN KEY ("parent_id") REFERENCES "maintenance_parts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_parts_parent" ON "maintenance_parts" ("parent_id")`,
    );

    // ------------------------------ JSON đính kèm Lệnh công việc (Epic 2)
    await queryRunner.query(`ALTER TABLE "task_instances" ADD "maintenance_part_id" uuid`);
    await queryRunner.query(`ALTER TABLE "task_instances" ADD "equipment_task_template" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "task_instances" ADD CONSTRAINT "FK_task_instances_maintenance_part" FOREIGN KEY ("maintenance_part_id") REFERENCES "maintenance_parts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // ------------------------------------- Nguồn công việc Role E (Epic 3)
    await queryRunner.query(
      `CREATE TYPE "public"."raci_assignments_e_task_source_enum" AS ENUM('device_default', 'task_list', 'manual')`,
    );
    await queryRunner.query(
      `ALTER TABLE "raci_assignments" ADD "e_task_source" "public"."raci_assignments_e_task_source_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "raci_assignments" ADD "e_task_list" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "raci_assignments" ADD CONSTRAINT "CHK_raci_e_task_source_only_on_e" CHECK ("role_letter" = 'E' OR "e_task_source" IS NULL)`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."task_step_instances_e_task_source_enum" AS ENUM('device_default', 'task_list', 'manual')`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_step_instances" ADD "e_task_source" "public"."task_step_instances_e_task_source_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "task_step_instances" ADD "e_task_list" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task_step_instances" DROP COLUMN "e_task_list"`);
    await queryRunner.query(`ALTER TABLE "task_step_instances" DROP COLUMN "e_task_source"`);
    await queryRunner.query(`DROP TYPE "public"."task_step_instances_e_task_source_enum"`);

    await queryRunner.query(
      `ALTER TABLE "raci_assignments" DROP CONSTRAINT "CHK_raci_e_task_source_only_on_e"`,
    );
    await queryRunner.query(`ALTER TABLE "raci_assignments" DROP COLUMN "e_task_list"`);
    await queryRunner.query(`ALTER TABLE "raci_assignments" DROP COLUMN "e_task_source"`);
    await queryRunner.query(`DROP TYPE "public"."raci_assignments_e_task_source_enum"`);

    await queryRunner.query(
      `ALTER TABLE "task_instances" DROP CONSTRAINT "FK_task_instances_maintenance_part"`,
    );
    await queryRunner.query(`ALTER TABLE "task_instances" DROP COLUMN "equipment_task_template"`);
    await queryRunner.query(`ALTER TABLE "task_instances" DROP COLUMN "maintenance_part_id"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_parts_parent"`);
    await queryRunner.query(
      `ALTER TABLE "maintenance_parts" DROP CONSTRAINT "FK_maintenance_parts_parent"`,
    );
    // Chỉ khôi phục được NOT NULL khi không còn node nào thiếu đơn vị phụ trách.
    await queryRunner.query(
      `UPDATE "maintenance_parts" SET "org_unit_id" = (SELECT "id" FROM "org_units" ORDER BY "level" ASC LIMIT 1) WHERE "org_unit_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_parts" ALTER COLUMN "org_unit_id" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP COLUMN "task_template"`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP COLUMN "manufacturer"`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP COLUMN "specifications"`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP COLUMN "location"`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP COLUMN "condition"`);
    await queryRunner.query(`DROP TYPE "public"."maintenance_parts_condition_enum"`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP COLUMN "symbol"`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP COLUMN "asset_kind"`);
    await queryRunner.query(`DROP TYPE "public"."maintenance_parts_asset_kind_enum"`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP COLUMN "parent_id"`);
  }
}

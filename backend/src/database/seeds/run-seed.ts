import * as bcrypt from 'bcrypt';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../../config/typeorm.config';
import { Permission } from '../../rbac/permission.entity';
import { Role } from '../../rbac/role.entity';
import { User } from '../../users/user.entity';
import { OrgUnitType } from '../../org-units/org-unit-type.entity';
import { OrgUnit } from '../../org-units/org-unit.entity';
import { OrgUnitClosure } from '../../org-units/org-unit-closure.entity';
import { OrgUnitMember } from '../../org-units/org-unit-member.entity';
import { Position } from '../../positions/position.entity';
import { Workflow } from '../../workflows/workflow.entity';
import { WorkflowStep } from '../../workflows/workflow-step.entity';
import { WorkflowKind } from '../../workflows/workflow-kind';
import { RaciAssignment } from '../../raci/raci-assignment.entity';
import { RoleLetterAllowlist } from '../../raci/role-letter-allowlist.entity';
import { RoleLetter } from '../../raci/role-letter';
import type { ETaskSource } from '../../raci/e-task-source';
import { MaintenancePart } from '../../maintenance/maintenance-part.entity';
import { MaintenanceSchedule } from '../../maintenance/maintenance-schedule.entity';
import { MaintenanceFrequency, computeNextDueAt, todayInVietnam } from '../../maintenance/maintenance-frequency';
import type { AssetCondition, AssetKind, EquipmentTaskTemplate } from '../../maintenance/asset';

const SEED_PASSWORD = 'Password123!';

const PERMISSIONS: Array<{ key: string; description: string }> = [
  { key: 'workflow.design', description: 'Create and edit workflow templates and RACI assignments' },
  { key: 'task.approve', description: 'Approve or reject a running task step' },
  { key: 'org.manage', description: 'Create and edit org units and org unit types' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['workflow.design', 'task.approve', 'org.manage'],
  workflow_designer: ['workflow.design'],
  approver: ['task.approve'],
  viewer: [],
};

const USERS: Array<{
  email: string;
  fullName: string;
  avatarInitials: string;
  roles: string[];
  /** Overrides SEED_PASSWORD for this one account, if set. */
  password?: string;
}> = [
  { email: 'vp.eng@company.vn', fullName: 'Nguyễn Văn Tuấn', avatarInitials: 'NT', roles: ['approver', 'workflow_designer'] },
  { email: 'lead.dev@company.vn', fullName: 'Trần Văn Hoàng', avatarInitials: 'TH', roles: ['approver'] },
  { email: 'staff.dev@company.vn', fullName: 'Lê Văn Nam', avatarInitials: 'LN', roles: ['approver'] },
  { email: 'officer@company.vn', fullName: 'Phạm Thị Hà', avatarInitials: 'PH', roles: ['approver'] },
  { email: 'auditor@company.vn', fullName: 'Đỗ Minh Khang', avatarInitials: 'DK', roles: ['approver', 'admin'] },
  // Thêm nhân sự để thử thông báo & phân rã E(x) với nhiều người nhận khác nhau.
  { email: 'ky.thuat1@company.vn', fullName: 'Vũ Thị Mai', avatarInitials: 'VM', roles: ['approver'] },
  { email: 'ky.thuat2@company.vn', fullName: 'Hoàng Đức Anh', avatarInitials: 'HA', roles: ['approver'] },
  { email: 'dien.nuoc@company.vn', fullName: 'Bùi Quốc Việt', avatarInitials: 'BV', roles: ['approver'] },
  { email: 'truong.co.dien@company.vn', fullName: 'Ngô Thanh Sơn', avatarInitials: 'NS', roles: ['approver', 'workflow_designer'] },
  { email: 'truong.van.hanh@company.vn', fullName: 'Đặng Hải Yến', avatarInitials: 'DY', roles: ['approver'] },
  // Quick-access demo admin. Login requires a valid email + password >= 6 chars
  // (class-validator on LoginDto), so a literal "admin"/"admin" pair isn't possible.
  { email: 'admin@company.vn', fullName: 'Quản trị viên (Admin)', avatarInitials: 'AD', roles: ['admin'], password: 'admin123' },
];

async function seedPermissions(): Promise<Map<string, Permission>> {
  const repo = AppDataSource.getRepository(Permission);
  const map = new Map<string, Permission>();
  for (const p of PERMISSIONS) {
    let permission = await repo.findOne({ where: { key: p.key } });
    if (!permission) {
      permission = await repo.save(repo.create(p));
      console.log(`  created permission ${p.key}`);
    }
    map.set(p.key, permission);
  }
  return map;
}

async function seedRoles(permissionMap: Map<string, Permission>): Promise<Map<string, Role>> {
  const repo = AppDataSource.getRepository(Role);
  const map = new Map<string, Role>();
  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    let role = await repo.findOne({ where: { name: roleName } });
    const permissions = permissionKeys.map((key) => permissionMap.get(key)!);
    if (!role) {
      role = await repo.save(repo.create({ name: roleName, permissions }));
      console.log(`  created role ${roleName} [${permissionKeys.join(', ') || 'no permissions'}]`);
    } else {
      role.permissions = permissions;
      await repo.save(role);
    }
    map.set(roleName, role);
  }
  return map;
}

async function seedUsers(roleMap: Map<string, Role>): Promise<Map<string, User>> {
  const repo = AppDataSource.getRepository(User);
  const defaultPasswordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const map = new Map<string, User>();
  for (const u of USERS) {
    let user = await repo.findOne({ where: { email: u.email } });
    const roles = u.roles.map((name) => roleMap.get(name)!);
    const passwordHash = u.password ? await bcrypt.hash(u.password, 10) : defaultPasswordHash;
    if (!user) {
      user = repo.create({
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        avatarInitials: u.avatarInitials,
        roles,
      });
      await repo.save(user);
      console.log(`  created user ${u.email} [${u.roles.join(', ')}]`);
    } else {
      user.roles = roles;
      await repo.save(user);
    }
    map.set(u.email, user);
  }
  return map;
}

const ORG_UNIT_TYPES: Array<{ code: string; name: string; defaultRank: number }> = [
  { code: 'khoi', name: 'Khối', defaultRank: 1 },
  { code: 'ban', name: 'Ban', defaultRank: 2 },
  { code: 'to', name: 'Tổ', defaultRank: 3 },
];

interface OrgUnitSeed {
  key: string;
  title: string;
  typeCode: string;
  parentKey: string | null;
  headEmail: string | null;
}

const ORG_UNITS: OrgUnitSeed[] = [
  { key: 'khoi-ky-thuat', title: 'Khối Kỹ thuật', typeCode: 'khoi', parentKey: null, headEmail: 'vp.eng@company.vn' },
  { key: 'ban-phat-trien', title: 'Ban Phát triển Phần mềm', typeCode: 'ban', parentKey: 'khoi-ky-thuat', headEmail: 'lead.dev@company.vn' },
  { key: 'ban-ha-tang', title: 'Ban Hạ tầng & Vận hành', typeCode: 'ban', parentKey: 'khoi-ky-thuat', headEmail: 'staff.dev@company.vn' },
  { key: 'to-backend', title: 'Tổ Backend', typeCode: 'to', parentKey: 'ban-phat-trien', headEmail: null },
  { key: 'to-qa', title: 'Tổ QA', typeCode: 'to', parentKey: 'ban-phat-trien', headEmail: null },
  { key: 'to-ha-tang-mang', title: 'Tổ Hạ tầng Mạng', typeCode: 'to', parentKey: 'ban-ha-tang', headEmail: 'auditor@company.vn' },
  // Nhánh Cơ điện: có trưởng ban + 2 tổ có trưởng, để thử thông báo bảo trì
  // rơi vào nhiều người khác nhau thay vì dồn hết về một tài khoản.
  { key: 'ban-co-dien', title: 'Ban Cơ điện', typeCode: 'ban', parentKey: 'khoi-ky-thuat', headEmail: 'truong.co.dien@company.vn' },
  { key: 'to-co-khi', title: 'Tổ Cơ khí', typeCode: 'to', parentKey: 'ban-co-dien', headEmail: 'truong.van.hanh@company.vn' },
  { key: 'to-dien', title: 'Tổ Điện & Nước', typeCode: 'to', parentKey: 'ban-co-dien', headEmail: null },
];

async function seedOrgUnitTypes(): Promise<Map<string, OrgUnitType>> {
  const repo = AppDataSource.getRepository(OrgUnitType);
  const map = new Map<string, OrgUnitType>();
  for (const t of ORG_UNIT_TYPES) {
    let type = await repo.findOne({ where: { code: t.code } });
    if (!type) {
      type = await repo.save(repo.create(t));
      console.log(`  created org unit type ${t.code}`);
    }
    map.set(t.code, type);
  }
  return map;
}

async function seedOrgUnits(
  typeMap: Map<string, OrgUnitType>,
  userMap: Map<string, User>,
): Promise<Map<string, OrgUnit>> {
  const unitRepo = AppDataSource.getRepository(OrgUnit);
  const closureRepo = AppDataSource.getRepository(OrgUnitClosure);
  const savedByKey = new Map<string, OrgUnit>();

  for (const spec of ORG_UNITS) {
    const parent = spec.parentKey ? savedByKey.get(spec.parentKey) ?? null : null;
    const level = parent ? parent.level + 1 : 1;

    let unit = await unitRepo.findOne({
      where: { title: spec.title, parentId: parent?.id ?? undefined },
    });

    if (!unit) {
      unit = unitRepo.create({
        parentId: parent?.id ?? null,
        typeId: typeMap.get(spec.typeCode)!.id,
        title: spec.title,
        level,
        headUserId: spec.headEmail ? userMap.get(spec.headEmail)!.id : null,
        isActive: true,
        sortOrder: 0,
      });
      unit = await unitRepo.save(unit);

      const closureRows: OrgUnitClosure[] = [
        closureRepo.create({ ancestorId: unit.id, descendantId: unit.id, depth: 0 }),
      ];
      if (parent) {
        const parentAncestry = await closureRepo.find({ where: { descendantId: parent.id } });
        for (const row of parentAncestry) {
          closureRows.push(
            closureRepo.create({
              ancestorId: row.ancestorId,
              descendantId: unit.id,
              depth: row.depth + 1,
            }),
          );
        }
      }
      await closureRepo.save(closureRows);
      console.log(`  created org unit ${spec.title} (level ${level})`);
    }

    savedByKey.set(spec.key, unit);
  }

  return savedByKey;
}

// --- Danh mục Chức vụ + tầng Nhân sự (BRD Epic 2/3: định tuyến theo chức vụ) ---

const POSITIONS: Array<{ code: string; name: string; rank: number }> = [
  { code: 'truong-don-vi', name: 'Trưởng đơn vị', rank: 10 },
  { code: 'pho-don-vi', name: 'Phó đơn vị', rank: 20 },
  { code: 'nhan-vien', name: 'Nhân viên', rank: 30 },
];

/** Ai làm ở đâu, giữ chức vụ gì. Heads are listed here too so the roster is complete. */
const MEMBERSHIPS: Array<{ orgUnitKey: string; email: string; positionCode: string }> = [
  { orgUnitKey: 'khoi-ky-thuat', email: 'vp.eng@company.vn', positionCode: 'truong-don-vi' },
  { orgUnitKey: 'ban-phat-trien', email: 'lead.dev@company.vn', positionCode: 'truong-don-vi' },
  { orgUnitKey: 'ban-ha-tang', email: 'staff.dev@company.vn', positionCode: 'truong-don-vi' },
  { orgUnitKey: 'to-ha-tang-mang', email: 'auditor@company.vn', positionCode: 'truong-don-vi' },
  // Tổ Backend deliberately has NO head — two staff instead. A RACI tag on the
  // "Nhân viên" position here resolves to BOTH, which is the AND-logic case.
  { orgUnitKey: 'to-backend', email: 'staff.dev@company.vn', positionCode: 'nhan-vien' },
  { orgUnitKey: 'to-backend', email: 'officer@company.vn', positionCode: 'nhan-vien' },
  { orgUnitKey: 'to-qa', email: 'officer@company.vn', positionCode: 'nhan-vien' },
  // Tổ Hạ tầng Mạng gets real staff so its head is a genuine manager: without
  // them he could not hold a Node E (US 1.2) and would have nobody to hand an
  // E(x) to, which made the maintenance Work Order path a dead end.
  { orgUnitKey: 'to-ha-tang-mang', email: 'officer@company.vn', positionCode: 'nhan-vien' },
  { orgUnitKey: 'to-ha-tang-mang', email: 'staff.dev@company.vn', positionCode: 'nhan-vien' },
  { orgUnitKey: 'ban-co-dien', email: 'truong.co.dien@company.vn', positionCode: 'truong-don-vi' },
  { orgUnitKey: 'to-co-khi', email: 'truong.van.hanh@company.vn', positionCode: 'truong-don-vi' },
  { orgUnitKey: 'to-co-khi', email: 'ky.thuat1@company.vn', positionCode: 'nhan-vien' },
  { orgUnitKey: 'to-co-khi', email: 'ky.thuat2@company.vn', positionCode: 'nhan-vien' },
  // Tổ Điện & Nước cố tình KHÔNG có trưởng: phiếu bảo trì của tổ này phải tự
  // đẩy thông báo lên Trưởng Ban Cơ điện (kiểm chứng Escalation).
  { orgUnitKey: 'to-dien', email: 'dien.nuoc@company.vn', positionCode: 'nhan-vien' },
];

async function seedPositions(): Promise<Map<string, Position>> {
  const repo = AppDataSource.getRepository(Position);
  const map = new Map<string, Position>();
  for (const p of POSITIONS) {
    let position = await repo.findOne({ where: { code: p.code } });
    if (!position) {
      position = await repo.save(repo.create(p));
      console.log(`  created position ${p.name}`);
    }
    map.set(p.code, position);
  }
  return map;
}

async function seedMemberships(
  orgUnitsByKey: Map<string, OrgUnit>,
  userMap: Map<string, User>,
  positionMap: Map<string, Position>,
): Promise<void> {
  const repo = AppDataSource.getRepository(OrgUnitMember);
  for (const m of MEMBERSHIPS) {
    const orgUnit = orgUnitsByKey.get(m.orgUnitKey)!;
    const user = userMap.get(m.email)!;
    const position = positionMap.get(m.positionCode)!;
    const existing = await repo.findOne({
      where: { orgUnitId: orgUnit.id, userId: user.id, positionId: position.id },
    });
    if (!existing) {
      await repo.save(
        repo.create({ orgUnitId: orgUnit.id, userId: user.id, positionId: position.id }),
      );
      console.log(`  ${m.email} → ${position.name} @ ${orgUnit.title}`);
    }
  }
}

const ROLE_LETTER_ALLOWLIST: Record<WorkflowKind, RoleLetter[]> = {
  process: ['R', 'A', 'C', 'S', 'I'],
  maintenance_linked: ['R', 'C', 'I', 'E'],
  maintenance_direct: ['R', 'A', 'C', 'S', 'I', 'E'],
};

async function seedRoleLetterAllowlist(): Promise<void> {
  const repo = AppDataSource.getRepository(RoleLetterAllowlist);
  for (const [kind, letters] of Object.entries(ROLE_LETTER_ALLOWLIST) as Array<
    [WorkflowKind, RoleLetter[]]
  >) {
    for (const roleLetter of letters) {
      const existing = await repo.findOne({ where: { workflowKind: kind, roleLetter } });
      if (!existing) {
        await repo.save(repo.create({ workflowKind: kind, roleLetter }));
      }
    }
  }
  console.log('  role letter allowlist seeded');
}

/**
 * Đích của một tag chỉ có hai kiểu: cả ĐƠN VỊ (`orgUnitKey`, mặc định rơi vào
 * trưởng đơn vị) hoặc một CÁ NHÂN (`userEmail`). Cấp "chức vụ" đã bỏ — xem
 * `RaciService.replaceCellAssignments`.
 */
interface RaciAssignmentSeed {
  orgUnitKey: string;
  /** Narrow to one exact person. */
  userEmail?: string;
  roleLetter: RoleLetter;
  fixedRollbackStepKey?: string;
  /** BRD 3 US 3.1 — chỉ có nghĩa với `roleLetter: 'E'`. */
  eTaskSource?: ETaskSource;
}

interface WorkflowStepSeed {
  key: string;
  stepOrder: number;
  stepCode: string;
  stepName: string;
  assignments: RaciAssignmentSeed[];
  /** Code of the workflow to run as this step's Execution Flow (BRD 2 Flow 1). */
  linkedSubFlowCode?: string;
}

interface WorkflowSeed {
  code: string;
  name: string;
  description: string;
  kind: WorkflowKind;
  steps: WorkflowStepSeed[];
}

// BRD reconciliation: raci_assignments now tags an org unit at ANY level directly
// (no more Level-1-only "column" + Level-2/3 "target" split) — matches the BRD's
// TH1 (assign while a dept column is collapsed) / TH2 (assign after drilling down)
// model. This also fixes the earlier deviation where step-1's S was awkwardly
// modeled as column=Khối+target=Ban; it's now directly orgUnitKey: 'ban-phat-trien'.
const WORKFLOWS: WorkflowSeed[] = [
  {
    code: 'WF-CAPEX',
    name: 'Quy trình Phê duyệt CapEx',
    description: 'Quy trình thẩm định và cấp phát vốn đầu tư tài sản cố định.',
    kind: 'process',
    steps: [
      {
        key: 'step-1',
        stepOrder: 1,
        stepCode: '1',
        stepName: 'Khởi tạo Yêu cầu CapEx',
        assignments: [{ orgUnitKey: 'ban-phat-trien', roleLetter: 'S' }],
      },
      {
        key: 'step-2',
        stepOrder: 2,
        stepCode: '2',
        stepName: 'Thẩm định Kỹ thuật & Dự toán',
        assignments: [
          // Hai tag CÁ NHÂN, không phải một tag chức vụ: Tổ Backend chưa có
          // trưởng nên không gán được cho cả tổ, và gán theo chức vụ đã bỏ. Hai
          // người này vẫn giữ nguyên phép thử AND-logic (mọi người giữ R phải
          // duyệt xong bước mới đi tiếp).
          { orgUnitKey: 'to-backend', userEmail: 'staff.dev@company.vn', roleLetter: 'R' },
          { orgUnitKey: 'to-backend', userEmail: 'officer@company.vn', roleLetter: 'R' },
          { orgUnitKey: 'khoi-ky-thuat', roleLetter: 'C', fixedRollbackStepKey: 'step-1' },
        ],
      },
      {
        key: 'step-3',
        stepOrder: 3,
        stepCode: '3',
        stepName: 'Kiểm tra Tuân thủ & Khung Pháp lý',
        assignments: [
          // Trước đây gán cho Tổ QA — tổ này cố tình không có trưởng, nên theo
          // luật mới thì không phải đích gán hợp lệ. Đưa lên Ban Phát triển
          // Phần mềm (Trần Văn Hoàng) để mọi ô trong ma trận demo đều tạo lại
          // được bằng chính giao diện.
          { orgUnitKey: 'ban-phat-trien', roleLetter: 'R' },
          { orgUnitKey: 'khoi-ky-thuat', roleLetter: 'I' },
        ],
      },
      {
        key: 'step-4',
        stepOrder: 4,
        stepCode: '4',
        stepName: 'Phê duyệt Cấp Khối',
        assignments: [{ orgUnitKey: 'khoi-ky-thuat', roleLetter: 'A' }],
        // BRD 2 Flow 1: approving this final step spawns the Execution Flow below.
        linkedSubFlowCode: 'WF-EXEC',
      },
    ],
  },
  {
    // BRD 2 — Luồng Thực thi. Node E sits on the manager of Ban Phát triển
    // (who has subordinates), and is immediately followed by a Node C, which is
    // exactly the adjacency BRD 2 Rule 4 requires.
    code: 'WF-EXEC',
    name: 'Luồng Thực thi & Nghiệm thu',
    description: 'Luồng phái sinh: phân rã công việc E(x) và nghiệm thu kết quả.',
    kind: 'maintenance_direct',
    steps: [
      {
        key: 'exec-step-1',
        stepOrder: 1,
        stepCode: '1',
        stepName: 'Thực thi công việc',
        // BRD 3 US 3.1 — Node E lấy đầu việc từ JSON cấu hình sẵn của thiết bị.
        // Hợp lệ vì `seedMaintenance` (chạy ngay sau hàm này) khai JSON cho các
        // thiết bị đang trỏ vào WF-EXEC.
        assignments: [
          { orgUnitKey: 'ban-phat-trien', roleLetter: 'E', eTaskSource: 'device_default' as const },
        ],
      },
      {
        key: 'exec-step-2',
        stepOrder: 2,
        stepCode: '2',
        stepName: 'Nghiệm thu kết quả',
        assignments: [
          { orgUnitKey: 'khoi-ky-thuat', roleLetter: 'C', fixedRollbackStepKey: 'exec-step-1' },
        ],
      },
    ],
  },
];

async function seedWorkflows(
  orgUnitsByKey: Map<string, OrgUnit>,
  userMap: Map<string, User>,
): Promise<void> {
  const workflowRepo = AppDataSource.getRepository(Workflow);
  const stepRepo = AppDataSource.getRepository(WorkflowStep);
  const raciRepo = AppDataSource.getRepository(RaciAssignment);

  // DB dựng từ trước có thể còn tag gán theo chức vụ. Chúng không sửa được bằng
  // giao diện nữa (ma trận chỉ còn cột đơn vị và cột cá nhân), nên để lại là để
  // lại một ô cấu hình vô hình vẫn định tuyến việc lúc chạy.
  const legacyPositionTags = await raciRepo
    .createQueryBuilder()
    .delete()
    .where('position_id IS NOT NULL')
    .execute();
  if (legacyPositionTags.affected) {
    console.log(`  gỡ ${legacyPositionTags.affected} tag RACI gán theo chức vụ (đã bỏ cấp này)`);
  }

  // Tag gán cho cả một đơn vị chưa có trưởng cũng không còn hợp lệ: gán cho đơn
  // vị nghĩa là gán cho trưởng, mà ghế đang trống. Trước đây chúng vẫn chạy nhờ
  // escalation nên không ai thấy — giờ giao diện chặn tạo mới, để lại sẽ thành ô
  // không thể dựng lại nếu lỡ xoá.
  const headlessUnitTags = await raciRepo
    .createQueryBuilder()
    .delete()
    .where('user_id IS NULL')
    .andWhere(
      'org_unit_id IN (SELECT id FROM org_units WHERE head_user_id IS NULL)',
    )
    .execute();
  if (headlessUnitTags.affected) {
    console.log(
      `  gỡ ${headlessUnitTags.affected} tag RACI trỏ vào đơn vị chưa có trưởng (không còn là đích gán hợp lệ)`,
    );
  }

  // Sub-flow links are resolved in a second pass: a step can point at a workflow
  // that appears later in this list (WF-CAPEX step 4 → WF-EXEC).
  const workflowsByCode = new Map<string, Workflow>();
  const stepsByWorkflowCode = new Map<string, Map<string, WorkflowStep>>();

  for (const wf of WORKFLOWS) {
    let workflow = await workflowRepo.findOne({ where: { code: wf.code } });
    if (!workflow) {
      workflow = await workflowRepo.save(
        workflowRepo.create({
          code: wf.code,
          name: wf.name,
          description: wf.description,
          kind: wf.kind,
        }),
      );
      console.log(`  created workflow ${wf.code}`);
    }

    const stepsByKey = new Map<string, WorkflowStep>();
    for (const stepSeed of wf.steps) {
      let step = await stepRepo.findOne({
        where: { workflowId: workflow.id, stepOrder: stepSeed.stepOrder },
      });
      if (!step) {
        step = await stepRepo.save(
          stepRepo.create({
            workflowId: workflow.id,
            stepOrder: stepSeed.stepOrder,
            stepCode: stepSeed.stepCode,
            stepName: stepSeed.stepName,
          }),
        );
        console.log(`    created step ${stepSeed.stepCode} - ${stepSeed.stepName}`);
      }
      stepsByKey.set(stepSeed.key, step);
    }

    for (const stepSeed of wf.steps) {
      const step = stepsByKey.get(stepSeed.key)!;
      for (const assignment of stepSeed.assignments) {
        const orgUnit = orgUnitsByKey.get(assignment.orgUnitKey)!;
        const targetUser = assignment.userEmail ? userMap.get(assignment.userEmail)! : null;
        const fixedRollbackStep = assignment.fixedRollbackStepKey
          ? stepsByKey.get(assignment.fixedRollbackStepKey)!
          : null;

        const existing = await raciRepo.findOne({
          where: {
            stepId: step.id,
            orgUnitId: orgUnit.id,
            positionId: IsNull(),
            userId: targetUser?.id ?? IsNull(),
            roleLetter: assignment.roleLetter,
          },
        });
        if (!existing) {
          await raciRepo.save(
            raciRepo.create({
              stepId: step.id,
              orgUnitId: orgUnit.id,
              positionId: null,
              userId: targetUser?.id ?? null,
              roleLetter: assignment.roleLetter,
              fixedRollbackStepId: fixedRollbackStep?.id ?? null,
              eTaskSource: assignment.eTaskSource ?? null,
            }),
          );
        } else if ((existing.eTaskSource ?? null) !== (assignment.eTaskSource ?? null)) {
          // Chạy lại seed trên DB có từ trước BRD 3: nâng cấp tag E sẵn có thay
          // vì bỏ qua, nếu không cấu hình nguồn công việc sẽ không bao giờ tới.
          await raciRepo.update(existing.id, { eTaskSource: assignment.eTaskSource ?? null });
        }
      }
    }
    console.log(`  RACI assignments seeded for ${wf.code}`);
    workflowsByCode.set(wf.code, workflow);
    stepsByWorkflowCode.set(wf.code, stepsByKey);
  }

  // Second pass — now every workflow exists, so sub-flow links can resolve.
  for (const wf of WORKFLOWS) {
    for (const stepSeed of wf.steps) {
      if (!stepSeed.linkedSubFlowCode) continue;
      const step = stepsByWorkflowCode.get(wf.code)?.get(stepSeed.key);
      const target = workflowsByCode.get(stepSeed.linkedSubFlowCode);
      if (!step || !target) continue;
      if (step.linkedSubFlowId !== target.id) {
        step.linkedSubFlowId = target.id;
        await stepRepo.save(step);
        console.log(`  linked ${wf.code}/${stepSeed.stepCode} → ${stepSeed.linkedSubFlowCode}`);
      }
    }
  }
}

interface PartSeed {
  code: string;
  name: string;
  orgUnitKey: string;
  /** Every part points at WF-EXEC so a Work Order can be raised right away. */
  schedules: Array<{ frequency: MaintenanceFrequency; anchorDate: string }>;
  /** BRD 3 US 2.1 AC2 — "Danh sách nhiệm vụ" lưu dạng JSON theo thiết bị. */
  taskTemplate?: EquipmentTaskTemplate;
}

/**
 * BRD 3 Epic 1 — cây cấu trúc tài sản mẫu, đặt tên theo đúng "Quy cách đặt tên"
 * của BRD: {Mã cty}-{Mã factory}-{Main part}-{Sub part}-{Thứ tự}.
 *
 * Các thiết bị `PART-*` seed từ BRD 2 được giữ nguyên làm node độc lập ở gốc
 * cây — chúng có lịch bảo trì và phiếu nhắc đang chạy, gán bừa vào một nhánh
 * chỉ để cây trông đẹp là bịa dữ liệu.
 */
interface AssetSeed {
  code: string;
  name: string;
  assetKind: AssetKind;
  parentCode?: string;
  orgUnitKey?: string;
  symbol?: string;
  condition?: AssetCondition;
  location?: string;
  specifications?: string;
  manufacturer?: string;
}

const ASSET_TREE: AssetSeed[] = [
  { code: 'SB', name: 'Công ty Thủy điện Sông Bung', assetKind: 'company' },
  {
    code: 'SB-KD',
    name: 'Nhà máy Khe Diên',
    assetKind: 'factory',
    parentCode: 'SB',
    orgUnitKey: 'khoi-ky-thuat',
    location: 'Quảng Nam',
  },
  {
    code: 'SB-KD-T',
    name: 'Tuabin',
    assetKind: 'main_equipment',
    parentCode: 'SB-KD',
    orgUnitKey: 'ban-co-dien',
    symbol: 'T',
    condition: 'operating',
    location: 'Gian máy - Cao trình 12.5',
    manufacturer: 'Andritz Hydro',
    specifications: 'Tuabin Francis trục đứng, công suất 2 × 4.5 MW, cột nước 96 m',
  },
  {
    code: 'SB-KD-T-S-01',
    name: 'Buồng xoắn',
    assetKind: 'part',
    parentCode: 'SB-KD-T',
    orgUnitKey: 'to-co-khi',
    symbol: 'S',
    condition: 'operating',
    location: 'Gian máy - Cao trình 12.5',
    specifications: 'Thép tấm SS400, đường kính vào 1.8 m, áp lực thiết kế 12 bar',
    manufacturer: 'Andritz Hydro',
  },
  {
    code: 'SB-KD-T-Gu-01',
    name: 'Cánh hướng',
    assetKind: 'part',
    parentCode: 'SB-KD-T',
    orgUnitKey: 'to-co-khi',
    symbol: 'Gu',
    condition: 'operating',
    location: 'Gian máy - Cao trình 12.5',
    specifications: '20 cánh, thép không gỉ 13Cr-4Ni',
  },
  {
    code: 'SB-KD-T-Sh-01',
    name: 'Trục chính',
    assetKind: 'part',
    parentCode: 'SB-KD-T',
    orgUnitKey: 'to-co-khi',
    symbol: 'Sh',
    condition: 'operating',
    specifications: 'Thép rèn 34CrNiMo6, đường kính 420 mm',
  },
  {
    // Lồng thêm một cấp để thấy nhánh Parts đi sâu được (giới hạn 5 cấp).
    code: 'SB-KD-T-Sh-Ro-01',
    name: 'Roăng làm kín trục',
    assetKind: 'part',
    parentCode: 'SB-KD-T-Sh-01',
    orgUnitKey: 'to-co-khi',
    symbol: 'Ro',
    condition: 'standby',
    location: 'Kho vật tư B2',
    specifications: 'Roăng cơ khí kép, cao su NBR, DN 420',
  },
  {
    code: 'SB-KD-G',
    name: 'Máy phát',
    assetKind: 'main_equipment',
    parentCode: 'SB-KD',
    orgUnitKey: 'ban-co-dien',
    symbol: 'G',
    condition: 'operating',
    location: 'Gian máy - Cao trình 12.5',
    specifications: 'Máy phát đồng bộ 3 pha, 5.5 MVA, 6.3 kV',
    manufacturer: 'WEG',
  },
  {
    code: 'SB-KD-G-Be-01',
    name: 'Ổ đỡ hướng trên',
    assetKind: 'part',
    parentCode: 'SB-KD-G',
    orgUnitKey: 'to-co-khi',
    symbol: 'Be',
    condition: 'operating',
    specifications: 'Ổ đỡ bạc babbit, làm mát bằng dầu ISO VG 46',
  },
];

const MAINTENANCE_PARTS: PartSeed[] = [
  {
    // Thiết bị "đầy đủ" của BRD 3: nằm trong cây, có lịch, VÀ có JSON danh sách
    // nhiệm vụ — chính là thứ làm tùy chọn "Mặc định theo thiết bị" của Role E
    // sáng lên ở Ma trận RSACIE.
    code: 'SB-KD-T-S-01',
    name: 'Buồng xoắn',
    orgUnitKey: 'to-co-khi',
    schedules: [
      { frequency: 'month', anchorDate: '2026-01-10' },
      { frequency: 'year', anchorDate: '2026-05-15' },
    ],
    taskTemplate: [
      { title: 'Kiểm tra rò rỉ mặt bích buồng xoắn', durationMinutes: 45 },
      { title: 'Đo độ dày thành buồng bằng siêu âm', durationMinutes: 90, note: 'Đo tại 8 điểm chuẩn' },
      { title: 'Vệ sinh và sơn chống ăn mòn khu vực cửa vào', durationMinutes: 180 },
      { title: 'Lập biên bản nghiệm thu, chụp ảnh hiện trạng', durationMinutes: 30 },
    ],
  },
  {
    code: 'SB-KD-G-Be-01',
    name: 'Ổ đỡ hướng trên',
    orgUnitKey: 'to-co-khi',
    schedules: [{ frequency: 'quarter', anchorDate: '2026-02-20' }],
    taskTemplate: [
      { title: 'Lấy mẫu dầu bôi trơn đi phân tích', durationMinutes: 30 },
      { title: 'Kiểm tra nhiệt độ và độ rung ổ đỡ', durationMinutes: 60 },
      { title: 'Bổ sung / thay dầu ISO VG 46', durationMinutes: 120 },
    ],
  },
  {
    code: 'PART-CNC-01',
    name: 'Cụm trục chính máy CNC',
    orgUnitKey: 'to-ha-tang-mang',
    schedules: [{ frequency: 'month', anchorDate: '2026-01-15' }],
    taskTemplate: [
      { title: 'Kiểm tra độ đảo trục chính', durationMinutes: 60 },
      { title: 'Thay mỡ bôi trơn ổ bi', durationMinutes: 90 },
    ],
  },
  {
    code: 'PART-HYD-02',
    name: 'Lọc bơm thủy lực',
    orgUnitKey: 'ban-ha-tang',
    schedules: [{ frequency: 'week', anchorDate: '2026-01-05' }],
  },
  {
    code: 'PART-CNV-03',
    name: 'Động cơ băng tải',
    orgUnitKey: 'ban-ha-tang',
    schedules: [{ frequency: 'quarter', anchorDate: '2026-02-01' }],
  },
  {
    code: 'PART-SEN-04',
    name: 'Cảm biến nhiệt tủ chính',
    orgUnitKey: 'to-ha-tang-mang',
    schedules: [{ frequency: 'year', anchorDate: '2026-03-20' }],
  },
  {
    code: 'PART-AHU-05',
    name: 'Dàn lạnh AHU khu B',
    orgUnitKey: 'to-co-khi',
    schedules: [{ frequency: 'month', anchorDate: '2026-01-12' }],
  },
  {
    code: 'PART-PMP-06',
    name: 'Bơm nước cứu hoả',
    orgUnitKey: 'to-dien',
    schedules: [{ frequency: 'quarter', anchorDate: '2026-02-11' }],
  },
  {
    code: 'PART-GEN-07',
    name: 'Máy phát điện dự phòng',
    orgUnitKey: 'ban-co-dien',
    schedules: [
      { frequency: 'week', anchorDate: '2026-01-06' },
      { frequency: 'year', anchorDate: '2026-06-01' },
    ],
  },
];

async function seedMaintenance(orgUnitsByKey: Map<string, OrgUnit>): Promise<void> {
  const partRepo = AppDataSource.getRepository(MaintenancePart);
  const scheduleRepo = AppDataSource.getRepository(MaintenanceSchedule);
  const workflowRepo = AppDataSource.getRepository(Workflow);

  const execFlow = await workflowRepo.findOne({ where: { code: 'WF-EXEC' } });
  const today = todayInVietnam();

  // Cây tài sản trước: các thiết bị có lịch bên dưới treo vào nhánh này, nên
  // node cha phải tồn tại trước. ASSET_TREE đã xếp sẵn cha trước con.
  const assetByCode = new Map<string, MaintenancePart>();
  for (const seed of ASSET_TREE) {
    const orgUnit = seed.orgUnitKey ? orgUnitsByKey.get(seed.orgUnitKey) : undefined;
    if (seed.orgUnitKey && !orgUnit) throw new Error(`Unknown org unit key: ${seed.orgUnitKey}`);
    const parent = seed.parentCode ? assetByCode.get(seed.parentCode) : undefined;
    if (seed.parentCode && !parent) throw new Error(`Unknown parent asset: ${seed.parentCode}`);

    const fields = {
      name: seed.name,
      assetKind: seed.assetKind,
      parentId: parent?.id ?? null,
      orgUnitId: orgUnit?.id ?? null,
      symbol: seed.symbol ?? null,
      condition: seed.condition ?? null,
      location: seed.location ?? null,
      specifications: seed.specifications ?? null,
      manufacturer: seed.manufacturer ?? null,
    };

    let asset = await partRepo.findOne({ where: { code: seed.code } });
    if (asset) {
      // Chạy lại seed trên DB đã có dữ liệu BRD 2: nâng cấp node cũ vào đúng chỗ
      // trong cây thay vì bỏ qua, nếu không cây sẽ khuyết nhánh.
      await partRepo.update(asset.id, fields);
      asset = await partRepo.findOneOrFail({ where: { id: asset.id } });
    } else {
      asset = await partRepo.save(partRepo.create({ code: seed.code, ...fields }));
      console.log(`  created asset ${seed.code} (${seed.assetKind})`);
    }
    assetByCode.set(seed.code, asset);
  }

  for (const seed of MAINTENANCE_PARTS) {
    const orgUnit = orgUnitsByKey.get(seed.orgUnitKey);
    if (!orgUnit) throw new Error(`Unknown org unit key: ${seed.orgUnitKey}`);

    let part = await partRepo.findOne({ where: { code: seed.code } });
    if (!part) {
      part = await partRepo.save(
        partRepo.create({ code: seed.code, name: seed.name, orgUnitId: orgUnit.id }),
      );
      console.log(`  created part ${seed.code}`);
    }

    // Ghi đè để chạy lại seed sau khi bổ sung JSON vẫn cập nhật được; thiết bị
    // không khai gì thì giữ nguyên cấu hình đang có trên DB.
    if (seed.taskTemplate) {
      await partRepo.update(part.id, { taskTemplate: seed.taskTemplate });
      console.log(`  task template for ${seed.code}: ${seed.taskTemplate.length} nhiệm vụ`);
    }

    for (const sch of seed.schedules) {
      const existing = await scheduleRepo.findOne({
        where: { partId: part.id, frequency: sch.frequency },
      });
      if (existing) continue;
      await scheduleRepo.save(
        scheduleRepo.create({
          partId: part.id,
          frequency: sch.frequency,
          anchorDate: sch.anchorDate,
          nextDueAt: computeNextDueAt(sch.anchorDate, sch.frequency, today),
          workflowId: execFlow?.id ?? null,
        }),
      );
      console.log(`  scheduled ${seed.code} every ${sch.frequency}`);
    }
  }
}

async function main() {
  await AppDataSource.initialize();
  console.log('Seeding permissions...');
  const permissionMap = await seedPermissions();
  console.log('Seeding roles...');
  const roleMap = await seedRoles(permissionMap);
  console.log('Seeding demo users...');
  const userMap = await seedUsers(roleMap);
  console.log('Seeding org unit types...');
  const typeMap = await seedOrgUnitTypes();
  console.log('Seeding org unit tree...');
  const orgUnitsByKey = await seedOrgUnits(typeMap, userMap);
  console.log('Seeding positions...');
  const positionMap = await seedPositions();
  console.log('Seeding personnel (org unit members)...');
  await seedMemberships(orgUnitsByKey, userMap, positionMap);
  console.log('Seeding role letter allowlist...');
  await seedRoleLetterAllowlist();
  console.log('Seeding CapEx workflow + RACI assignments...');
  await seedWorkflows(orgUnitsByKey, userMap);
  console.log('Seeding maintenance parts + schedules...');
  await seedMaintenance(orgUnitsByKey);
  console.log(`\nDone. All demo users share the password: ${SEED_PASSWORD}`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

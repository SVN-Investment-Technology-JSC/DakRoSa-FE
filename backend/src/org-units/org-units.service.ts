import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgUnit } from './org-unit.entity';
import { OrgUnitClosure } from './org-unit-closure.entity';
import { OrgUnitType } from './org-unit-type.entity';
import { OrgUnitMember } from './org-unit-member.entity';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { CreateOrgUnitTypeDto } from './dto/create-org-unit-type.dto';
import { User } from '../users/user.entity';
import type { RoleLetter } from '../raci/role-letter';

/** A person the caller is allowed to hand work to. */
export interface SubordinateRef {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
  positionName?: string;
  orgUnitTitle?: string;
}
import { CreateOrgUnitMemberDto } from './dto/create-org-unit-member.dto';

export interface OrgUnitTreeNode extends OrgUnit {
  children: OrgUnitTreeNode[];
}

@Injectable()
export class OrgUnitsService {
  constructor(
    @InjectRepository(OrgUnit)
    private readonly orgUnitsRepository: Repository<OrgUnit>,
    @InjectRepository(OrgUnitClosure)
    private readonly closureRepository: Repository<OrgUnitClosure>,
    @InjectRepository(OrgUnitType)
    private readonly orgUnitTypesRepository: Repository<OrgUnitType>,
    @InjectRepository(OrgUnitMember)
    private readonly membersRepository: Repository<OrgUnitMember>,
  ) {}

  // --- Personnel (tầng nhân sự) ---

  /** Roster of one org unit (not including sub-units). */
  findMembers(orgUnitId: string): Promise<OrgUnitMember[]> {
    return this.membersRepository.find({
      where: { orgUnitId },
      relations: ['user', 'position'],
      order: { position: { rank: 'ASC' } },
    });
  }

  /** Every unit `userId` belongs to, either as a rostered member or as its head. */
  async findUnitsOfUser(userId: string): Promise<OrgUnit[]> {
    const memberships = await this.membersRepository.find({
      where: { userId },
      relations: ['orgUnit'],
    });
    const byId = new Map<string, OrgUnit>();
    for (const m of memberships) if (m.orgUnit) byId.set(m.orgUnit.id, m.orgUnit);
    for (const unit of await this.findUnitsHeadedBy(userId)) byId.set(unit.id, unit);
    return [...byId.values()];
  }

  /**
   * The user's SMALLEST unit — deepest level wins, because that is the team a
   * person actually works in. Someone who heads a Ban and is also rostered on a
   * Tổ is scoped to the Tổ.
   */
  async findSmallestUnitOfUser(userId: string): Promise<OrgUnit | null> {
    const units = await this.findUnitsOfUser(userId);
    if (units.length === 0) return null;
    return units.reduce((deepest, u) => (u.level > deepest.level ? u : deepest));
  }

  /** Members holding a specific position inside one org unit — the BRD's position-based routing. */
  findMembersByPosition(orgUnitId: string, positionId: string): Promise<OrgUnitMember[]> {
    return this.membersRepository.find({
      where: { orgUnitId, positionId },
      relations: ['user'],
    });
  }

  /**
   * Everyone `userId` can hand work to: the roster of every unit they head,
   * PLUS everyone in every unit below those, PLUS the heads of those sub-units.
   * The caller themselves is always excluded.
   *
   * Own roster is included on purpose. A department's work belongs to its head,
   * who may pass it down; the head of a LEAF team has no sub-units at all, so a
   * descendants-only rule left them with nobody to hand work to and quietly
   * broke the "trưởng tổ giao xuống nhân viên trong tổ" case.
   *
   * Single source of truth: both delegation (ApprovalsService) and the Node E
   * breakdown (ExecutionService) resolve their candidate lists from here, so
   * the two can never disagree about who counts as a subordinate.
   */
  async findSubordinates(userId: string): Promise<SubordinateRef[]> {
    const byId = new Map<string, SubordinateRef>();
    const remember = (
      user: User | undefined | null,
      positionName?: string,
      orgUnitTitle?: string,
    ) => {
      if (!user || user.id === userId || byId.has(user.id)) return;
      byId.set(user.id, {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarInitials: user.avatarInitials,
        positionName,
        orgUnitTitle,
      });
    };

    for (const unit of await this.findUnitsHeadedBy(userId)) {
      for (const member of await this.findMembers(unit.id)) {
        remember(member.user, member.position?.name, unit.title);
      }
      for (const member of await this.findDescendantMembers(unit.id)) {
        remember(member.user, member.position?.name, member.orgUnit?.title);
      }
      // Heads of sub-units may not appear on any roster of their own.
      for (const descendant of await this.findDescendants(unit.id)) {
        remember(descendant.head, undefined, descendant.title);
      }
    }

    return [...byId.values()];
  }

  /** Everyone working anywhere strictly below `orgUnitId` — real subordinates for delegation. */
  async findDescendantMembers(orgUnitId: string): Promise<OrgUnitMember[]> {
    return this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.position', 'position')
      .leftJoinAndSelect('member.orgUnit', 'orgUnit')
      .innerJoin(OrgUnitClosure, 'closure', 'closure.descendant_id = member.org_unit_id')
      .where('closure.ancestor_id = :orgUnitId', { orgUnitId })
      .andWhere('closure.depth > 0')
      .getMany();
  }

  async addMember(dto: CreateOrgUnitMemberDto): Promise<OrgUnitMember> {
    await this.findOne(dto.orgUnitId);
    const existing = await this.membersRepository.findOne({
      where: { orgUnitId: dto.orgUnitId, userId: dto.userId, positionId: dto.positionId },
    });
    if (existing) {
      throw new BadRequestException('Nhân sự này đã giữ chức vụ đó tại đơn vị này rồi.');
    }
    const member = this.membersRepository.create(dto);
    const saved = await this.membersRepository.save(member);
    return this.membersRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['user', 'position'],
    });
  }

  async removeMember(id: string): Promise<void> {
    const result = await this.membersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Org unit member ${id} not found`);
    }
  }

  // --- Org Unit Types ---

  findAllTypes(): Promise<OrgUnitType[]> {
    return this.orgUnitTypesRepository.find({ order: { defaultRank: 'ASC' } });
  }

  createType(dto: CreateOrgUnitTypeDto): Promise<OrgUnitType> {
    const type = this.orgUnitTypesRepository.create(dto);
    return this.orgUnitTypesRepository.save(type);
  }

  // --- Org Units ---

  async findTree(): Promise<OrgUnitTreeNode[]> {
    const all = await this.orgUnitsRepository.find({
      relations: ['type', 'head'],
      order: { level: 'ASC', sortOrder: 'ASC' },
    });
    const byId = new Map<string, OrgUnitTreeNode>();
    for (const unit of all) {
      byId.set(unit.id, { ...unit, children: [] });
    }
    const roots: OrgUnitTreeNode[] = [];
    for (const unit of byId.values()) {
      if (unit.parentId) {
        byId.get(unit.parentId)?.children.push(unit);
      } else {
        roots.push(unit);
      }
    }
    return roots;
  }

  findByLevel(level: number): Promise<OrgUnit[]> {
    return this.orgUnitsRepository.find({
      where: { level },
      relations: ['type', 'head'],
      order: { sortOrder: 'ASC' },
    });
  }

  /** Org units where the given user is the head — used to scope delegation candidates. */
  findUnitsHeadedBy(userId: string): Promise<OrgUnit[]> {
    return this.orgUnitsRepository.find({ where: { headUserId: userId } });
  }

  /**
   * BRD 2 US 1.2 — "cấp Quản lý" vs "Nhân viên". The data model has no explicit
   * rank flag, so managerial standing is derived: a user manages someone if they
   * head a unit that has sub-units, or staff other than themselves.
   */
  async hasSubordinates(userId: string): Promise<boolean> {
    const headedUnits = await this.findUnitsHeadedBy(userId);
    for (const unit of headedUnits) {
      const children = await this.orgUnitsRepository.count({ where: { parentId: unit.id } });
      if (children > 0) return true;

      // Staff inside the unit itself (excluding the head) still count.
      const ownMembers = await this.membersRepository.find({ where: { orgUnitId: unit.id } });
      if (ownMembers.some((m) => m.userId !== userId)) return true;

      const descendantMembers = await this.findDescendantMembers(unit.id);
      if (descendantMembers.some((m) => m.userId !== userId)) return true;
    }
    return false;
  }

  /**
   * Who a RACI target actually resolves to. Single source of truth shared by
   * task creation (who gets the work) and RACI validation (who *would* get it) —
   * keeping these in one place stops the two from drifting apart.
   *
   *  - user set ....... exactly that person
   *  - position set ... every holder of that position in the unit; if the seat is
   *                     empty, escalate to the unit head
   *  - unit only ...... the unit head, escalating up the tree when it has none
   *
   * Chữ S là ngoại lệ có chủ ý. S = quyền MỞ đơn, không phải quyền xử lý một
   * đơn đang chạy, nên nó không có gì để "giao xuống": dồn S về trưởng đơn vị
   * sẽ biến mọi yêu cầu của nhân viên thành việc của trưởng. Vì vậy gán S cho
   * một đơn vị nghĩa là CẢ đơn vị đó được mở đơn.
   */
  async resolveAssignees(target: {
    orgUnitId: string;
    positionId?: string | null;
    userId?: string | null;
    roleLetter?: RoleLetter;
  }): Promise<Array<{ userId: string; isEscalated: boolean }>> {
    if (target.userId) {
      return [{ userId: target.userId, isEscalated: false }];
    }

    if (!target.positionId && target.roleLetter === 'S') {
      const userIds = new Set<string>();
      for (const m of await this.findMembers(target.orgUnitId)) userIds.add(m.userId);
      const unit = await this.findOne(target.orgUnitId);
      if (unit.headUserId) userIds.add(unit.headUserId);
      // Gán S cho một Ban nghĩa là cả Ban — kể cả các Tổ bên dưới. Chỉ lấy đúng
      // roster của Ban sẽ chỉ ra mỗi trưởng Ban, vì nhân viên đều nằm ở Tổ.
      for (const m of await this.findDescendantMembers(target.orgUnitId)) userIds.add(m.userId);
      for (const d of await this.findDescendants(target.orgUnitId)) {
        if (d.headUserId) userIds.add(d.headUserId);
      }
      // Đơn vị rỗng vẫn phải có người mở được đơn — rơi về quy tắc chung.
      if (userIds.size === 0) {
        const head = await this.resolveUnitHead(target.orgUnitId);
        return head ? [head] : [];
      }
      return [...userIds].map((userId) => ({ userId, isEscalated: false }));
    }

    if (target.positionId) {
      const holders = await this.findMembersByPosition(target.orgUnitId, target.positionId);
      if (holders.length > 0) {
        return holders.map((h) => ({ userId: h.userId, isEscalated: false }));
      }
      const escalated = await this.resolveUnitHead(target.orgUnitId);
      return escalated ? [{ userId: escalated.userId, isEscalated: true }] : [];
    }

    const head = await this.resolveUnitHead(target.orgUnitId);
    return head ? [head] : [];
  }

  /** The unit's head, or the nearest ancestor's head when the seat is empty. */
  private async resolveUnitHead(
    orgUnitId: string,
  ): Promise<{ userId: string; isEscalated: boolean } | null> {
    const unit = await this.findOne(orgUnitId);
    if (unit.headUserId) return { userId: unit.headUserId, isEscalated: false };

    const ancestors = await this.findAncestors(orgUnitId);
    const nearestWithHead = ancestors.find((a) => a.headUserId);
    return nearestWithHead?.headUserId
      ? { userId: nearestWithHead.headUserId, isEscalated: true }
      : null;
  }

  async findDescendants(
    orgUnitId: string,
    minLevel?: number,
    maxLevel?: number,
  ): Promise<OrgUnit[]> {
    const qb = this.orgUnitsRepository
      .createQueryBuilder('unit')
      .leftJoinAndSelect('unit.type', 'type')
      .leftJoinAndSelect('unit.head', 'head')
      .innerJoin(OrgUnitClosure, 'closure', 'closure.descendant_id = unit.id')
      .where('closure.ancestor_id = :orgUnitId', { orgUnitId })
      .andWhere('closure.depth > 0');

    if (minLevel !== undefined) {
      qb.andWhere('unit.level >= :minLevel', { minLevel });
    }
    if (maxLevel !== undefined) {
      qb.andWhere('unit.level <= :maxLevel', { maxLevel });
    }

    return qb.orderBy('unit.level', 'ASC').addOrderBy('unit.sortOrder', 'ASC').getMany();
  }

  /** Ancestors of `orgUnitId`, nearest-first (immediate parent, grandparent, ... root). Excludes self. */
  async findAncestors(orgUnitId: string): Promise<OrgUnit[]> {
    return this.orgUnitsRepository
      .createQueryBuilder('unit')
      .innerJoin(OrgUnitClosure, 'closure', 'closure.ancestor_id = unit.id')
      .where('closure.descendant_id = :orgUnitId', { orgUnitId })
      .andWhere('closure.depth > 0')
      .orderBy('closure.depth', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<OrgUnit> {
    const unit = await this.orgUnitsRepository.findOne({
      where: { id },
      relations: ['type', 'head'],
    });
    if (!unit) {
      throw new NotFoundException(`Org unit ${id} not found`);
    }
    return unit;
  }

  async create(dto: CreateOrgUnitDto): Promise<OrgUnit> {
    let level = 1;
    let parent: OrgUnit | null = null;
    if (dto.parentId) {
      parent = await this.orgUnitsRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new BadRequestException(`Parent org unit ${dto.parentId} not found`);
      }
      level = parent.level + 1;
    }

    const unit = this.orgUnitsRepository.create({
      parentId: dto.parentId ?? null,
      typeId: dto.typeId,
      title: dto.title,
      level,
      headUserId: dto.headUserId ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    const saved = await this.orgUnitsRepository.save(unit);

    // Closure table: self row + one row per ancestor of the parent (depth+1).
    const closureRows: OrgUnitClosure[] = [
      this.closureRepository.create({ ancestorId: saved.id, descendantId: saved.id, depth: 0 }),
    ];
    if (parent) {
      const parentAncestry = await this.closureRepository.find({
        where: { descendantId: parent.id },
      });
      for (const row of parentAncestry) {
        closureRows.push(
          this.closureRepository.create({
            ancestorId: row.ancestorId,
            descendantId: saved.id,
            depth: row.depth + 1,
          }),
        );
      }
    }
    await this.closureRepository.save(closureRows);

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateOrgUnitDto): Promise<OrgUnit> {
    const unit = await this.findOne(id);
    Object.assign(unit, dto);
    await this.orgUnitsRepository.save(unit);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    // FK ON DELETE CASCADE on org_unit_closure handles closure cleanup;
    // child org_units also cascade-delete (parent_id FK is ON DELETE CASCADE).
    await this.orgUnitsRepository.delete(id);
  }
}

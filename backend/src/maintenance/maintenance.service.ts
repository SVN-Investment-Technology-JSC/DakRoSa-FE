import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MaintenancePart } from './maintenance-part.entity';
import { MaintenanceSchedule } from './maintenance-schedule.entity';
import { MaintenanceTicket } from './maintenance-ticket.entity';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { SetSchedulesDto } from './dto/set-schedules.dto';
import { SetTaskTemplateDto } from './dto/set-task-template.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import {
  ASSET_KIND_LABEL,
  isValidChildKind,
  isNonEmptyTemplate,
  MAX_PART_DEPTH,
} from './asset';
import type { AssetKind } from './asset';
import {
  addInterval,
  computeNextDueAt,
  daysBetween,
  REMINDER_LEAD_DAYS,
  ticketStatusFor,
  todayInVietnam,
} from './maintenance-frequency';
import { OrgUnitsService } from '../org-units/org-units.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_TYPES } from '../notifications/notification.entity';
import { TasksService } from '../tasks/tasks.service';
import { ActivityService } from '../activity/activity.service';
import { TaskInstance } from '../tasks/task-instance.entity';

export interface SweepResult {
  ranFor: string;
  ticketsCreated: number;
  schedulesChecked: number;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenancePart)
    private readonly partsRepository: Repository<MaintenancePart>,
    @InjectRepository(MaintenanceSchedule)
    private readonly schedulesRepository: Repository<MaintenanceSchedule>,
    @InjectRepository(MaintenanceTicket)
    private readonly ticketsRepository: Repository<MaintenanceTicket>,
    private readonly orgUnitsService: OrgUnitsService,
    private readonly notificationsService: NotificationsService,
    private readonly tasksService: TasksService,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
  ) {}

  // ---------------------------------------------------------------- Parts

  findParts(): Promise<MaintenancePart[]> {
    return this.partsRepository.find({
      relations: ['orgUnit', 'schedules'],
      order: { code: 'ASC' },
    });
  }

  async findPart(id: string): Promise<MaintenancePart> {
    const part = await this.partsRepository.findOne({
      where: { id },
      relations: ['orgUnit', 'schedules'],
    });
    if (!part) throw new NotFoundException('Không tìm thấy thiết bị.');
    return part;
  }

  /**
   * BRD 3 Epic 1 — cây cấu trúc tài sản, lồng theo `parentId`.
   *
   * Nạp một phát cả bảng rồi ghép cây trong bộ nhớ thay vì đệ quy xuống DB:
   * số node thiết bị của một nhà máy nằm ở thang trăm, nên một query phẳng rẻ
   * hơn hẳn N+1 query theo tầng.
   */
  async findPartsTree(): Promise<MaintenancePart[]> {
    const all = await this.partsRepository.find({
      relations: ['orgUnit', 'schedules'],
      order: { code: 'ASC' },
    });

    const byId = new Map(all.map((p) => [p.id, Object.assign(p, { children: [] as MaintenancePart[] })]));
    const roots: MaintenancePart[] = [];
    for (const part of byId.values()) {
      const parent = part.parentId ? byId.get(part.parentId) : undefined;
      if (parent) parent.children.push(part);
      else roots.push(part);
    }
    return roots;
  }

  async createPart(dto: CreatePartDto): Promise<MaintenancePart> {
    if (dto.orgUnitId) await this.orgUnitsService.findOne(dto.orgUnitId); // 404s if the unit is bogus
    const existing = await this.partsRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`Mã thiết bị "${dto.code}" đã tồn tại.`);

    // `part` là mặc định để lối tạo thiết bị có từ trước BRD 3 (chỉ gửi
    // code/name/orgUnitId) vẫn tạo ra một node hợp lệ, đứng ở gốc cây.
    const assetKind: AssetKind = dto.assetKind ?? 'part';
    const parent = dto.parentId ? await this.findPart(dto.parentId) : null;

    if (parent && !isValidChildKind(parent.assetKind, assetKind)) {
      throw new BadRequestException(
        `Không thể đặt "${ASSET_KIND_LABEL[assetKind]}" bên dưới "${ASSET_KIND_LABEL[parent.assetKind]}".`,
      );
    }
    // Node gốc chỉ được là Công ty — TRỪ `part` đứng lẻ, vốn là hình dạng của
    // mọi thiết bị đã seed trước BRD 3.
    if (!parent && assetKind !== 'company' && assetKind !== 'part') {
      throw new BadRequestException(
        `"${ASSET_KIND_LABEL[assetKind]}" phải nằm dưới một node cha. Chỉ Công ty mới đứng ở gốc cây.`,
      );
    }
    if (parent && assetKind === 'part') {
      const depth = await this.partDepth(parent);
      if (depth >= MAX_PART_DEPTH) {
        throw new BadRequestException(
          `Chỉ được lồng tối đa ${MAX_PART_DEPTH} cấp Bộ phận dưới một Phân hệ thiết bị chính.`,
        );
      }
    }

    const saved = await this.partsRepository.save(
      this.partsRepository.create({
        ...dto,
        assetKind,
        parentId: dto.parentId ?? null,
        orgUnitId: dto.orgUnitId ?? null,
      }),
    );
    return this.findPart(saved.id);
  }

  async updatePart(id: string, dto: UpdatePartDto): Promise<MaintenancePart> {
    const part = await this.findPart(id);
    if (dto.orgUnitId) await this.orgUnitsService.findOne(dto.orgUnitId);
    await this.partsRepository.update(part.id, dto);
    return this.findPart(part.id);
  }

  /**
   * Xoá một node và cả nhánh dưới nó (FK `parent_id` là ON DELETE CASCADE).
   *
   * Chặn khi nhánh còn phiếu bảo trì: phiếu là bằng chứng lịch sử, và
   * `maintenance_tickets.part_id` không cascade — xoá sẽ vỡ ràng buộc khoá
   * ngoại chứ không im lặng mất dữ liệu.
   */
  async deletePart(id: string): Promise<{ deleted: number }> {
    const part = await this.findPart(id);
    const branch = await this.collectBranchIds(part.id);

    const ticketCount = await this.ticketsRepository.count({ where: { partId: In(branch) } });
    if (ticketCount > 0) {
      throw new BadRequestException(
        `Không xoá được: nhánh này còn ${ticketCount} phiếu bảo trì trong lịch sử. Hãy tắt hoạt động thay vì xoá.`,
      );
    }

    await this.partsRepository.delete({ id: part.id });
    return { deleted: branch.length };
  }

  /**
   * BRD 3 US 2.1 AC2 — khai "Danh sách nhiệm vụ" + "Thời gian thực hiện" cho
   * một thiết bị, lưu nguyên dạng JSON gắn với ID thiết bị đó.
   */
  async setTaskTemplate(partId: string, dto: SetTaskTemplateDto): Promise<MaintenancePart> {
    const part = await this.findPart(partId);

    const duplicate = dto.tasks.find(
      (t, i) => dto.tasks.findIndex((o) => o.title.trim() === t.title.trim()) !== i,
    );
    if (duplicate) {
      throw new BadRequestException(`Nhiệm vụ "${duplicate.title}" bị khai hai lần.`);
    }

    await this.partsRepository.update(part.id, {
      // Mảng rỗng lưu thành NULL để "chưa cấu hình" chỉ có đúng một biểu diễn —
      // đây là thứ mà validation của Role E (US 3.1 AC3) hỏi tới.
      taskTemplate: dto.tasks.length > 0 ? dto.tasks : null,
    });
    return this.findPart(part.id);
  }

  /**
   * BRD 3 US 3.1 AC3 — các thiết bị đang trỏ vào luồng này VÀ đã khai JSON
   * danh sách nhiệm vụ. Rỗng ⇒ tùy chọn "Mặc định theo thiết bị" bị vô hiệu ở
   * màn hình thiết kế ma trận.
   */
  async findDeviceTemplateSources(workflowId: string): Promise<
    Array<{ id: string; code: string; name: string; taskCount: number }>
  > {
    const schedules = await this.schedulesRepository.find({
      where: { workflowId },
      relations: ['part'],
    });

    const byPartId = new Map<string, MaintenancePart>();
    for (const schedule of schedules) {
      if (schedule.part && isNonEmptyTemplate(schedule.part.taskTemplate)) {
        byPartId.set(schedule.part.id, schedule.part);
      }
    }
    return [...byPartId.values()].map((part) => ({
      id: part.id,
      code: part.code,
      name: part.name,
      taskCount: part.taskTemplate?.length ?? 0,
    }));
  }

  /**
   * Đơn vị phụ trách thực sự của một thiết bị: của chính nó, hoặc của tổ tiên
   * gần nhất có khai. Một chi tiết nhỏ trong cây thường không tự khai đơn vị —
   * nó thuộc về đơn vị quản lý cả phân hệ chứa nó.
   */
  async resolveOrgUnitId(partId: string): Promise<string | null> {
    let current: MaintenancePart | null = await this.partsRepository.findOne({
      where: { id: partId },
    });
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      if (current.orgUnitId) return current.orgUnitId;
      seen.add(current.id);
      if (!current.parentId) return null;
      current = await this.partsRepository.findOne({ where: { id: current.parentId } });
    }
    return null;
  }

  /** Số tầng `part` đã lồng tính tới `node` (node là `part` thì tính cả nó). */
  private async partDepth(node: MaintenancePart): Promise<number> {
    let depth = 0;
    let current: MaintenancePart | null = node;
    const seen = new Set<string>();
    while (current && current.assetKind === 'part' && !seen.has(current.id)) {
      depth++;
      seen.add(current.id);
      current = current.parentId
        ? await this.partsRepository.findOne({ where: { id: current.parentId } })
        : null;
    }
    return depth;
  }

  private async collectBranchIds(rootId: string): Promise<string[]> {
    const all = await this.partsRepository.find({ select: ['id', 'parentId'] });
    const childrenOf = new Map<string, string[]>();
    for (const part of all) {
      if (!part.parentId) continue;
      childrenOf.set(part.parentId, [...(childrenOf.get(part.parentId) ?? []), part.id]);
    }
    const ids: string[] = [];
    const stack = [rootId];
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (ids.includes(id)) continue;
      ids.push(id);
      stack.push(...(childrenOf.get(id) ?? []));
    }
    return ids;
  }

  // ------------------------------------------------------------ Schedules

  /**
   * Replaces a part's whole row in the maintenance matrix (US 2.1) — the UI
   * sends the full set of ticked frequencies, same wholesale-replace contract
   * as the RACI cell editor.
   */
  async setSchedules(partId: string, dto: SetSchedulesDto): Promise<MaintenancePart> {
    const part = await this.findPart(partId);
    const today = todayInVietnam();

    // Phiếu nhắc phải gửi được tới một người thật, và Lệnh công việc phải mở
    // được dưới một đơn vị thật. Thiết bị không suy ra nổi đơn vị phụ trách
    // (kể cả kế thừa từ cấp trên trong cây) sẽ tạo ra lịch chạy vào hư không.
    if (dto.schedules.length > 0 && !(await this.resolveOrgUnitId(part.id))) {
      throw new BadRequestException(
        `Thiết bị "${part.name}" chưa có đơn vị phụ trách (kể cả kế thừa từ cấp trên trong Sơ đồ thiết bị). Hãy gán đơn vị trước khi lên lịch bảo trì.`,
      );
    }

    const duplicate = dto.schedules.find(
      (s, i) => dto.schedules.findIndex((o) => o.frequency === s.frequency) !== i,
    );
    if (duplicate) {
      throw new BadRequestException(`Tần suất "${duplicate.frequency}" bị khai báo hai lần.`);
    }

    await this.dataSource.transaction(async (manager) => {
      const keptIds: string[] = [];
      for (const input of dto.schedules) {
        const anchorDate = input.anchorDate ?? today;
        // Keep the existing row (and its ticket history) when the frequency is
        // unchanged — deleting it would cascade the tickets away.
        const existing = await manager.findOne(MaintenanceSchedule, {
          where: { partId: part.id, frequency: input.frequency },
        });
        const nextDueAt = computeNextDueAt(anchorDate, input.frequency, today);
        if (existing) {
          await manager.update(MaintenanceSchedule, existing.id, {
            anchorDate,
            nextDueAt,
            workflowId: input.workflowId ?? null,
            isActive: true,
          });
          keptIds.push(existing.id);
        } else {
          const created = await manager.save(
            manager.create(MaintenanceSchedule, {
              partId: part.id,
              frequency: input.frequency,
              anchorDate,
              nextDueAt,
              workflowId: input.workflowId ?? null,
              isActive: true,
            }),
          );
          keptIds.push(created.id);
        }
      }

      const stale = await manager.find(MaintenanceSchedule, { where: { partId: part.id } });
      const toDrop = stale.filter((s) => !keptIds.includes(s.id)).map((s) => s.id);
      if (toDrop.length > 0) {
        await manager.delete(MaintenanceSchedule, { id: In(toDrop) });
      }
    });

    return this.findPart(part.id);
  }

  // -------------------------------------------------------------- Tickets

  async findTickets(openOnly = false): Promise<MaintenanceTicket[]> {
    const tickets = await this.ticketsRepository.find({
      relations: ['part', 'part.orgUnit', 'schedule'],
      order: { dueDate: 'ASC' },
    });
    const today = todayInVietnam();
    // Urgency is a function of *today*, so it is refreshed on read rather than
    // left to whatever the cron stamped days ago.
    for (const ticket of tickets) {
      ticket.status = ticketStatusFor(daysBetween(today, ticket.dueDate));
    }
    return openOnly ? tickets.filter((t) => !t.resultingTaskId) : tickets;
  }

  async findTicket(id: string): Promise<MaintenanceTicket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['part', 'part.orgUnit', 'schedule', 'resultingTask'],
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy phiếu bảo trì.');
    return ticket;
  }

  /** US 2.2 — "Change Maintenance" (move the due date) and "Set Priority". */
  async updateTicket(id: string, dto: UpdateTicketDto): Promise<MaintenanceTicket> {
    const ticket = await this.findTicket(id);
    if (ticket.resultingTaskId) {
      throw new BadRequestException('Phiếu đã tạo Lệnh công việc, không sửa được nữa.');
    }
    const dueDate = dto.dueDate ?? ticket.dueDate;
    await this.ticketsRepository.update(ticket.id, {
      dueDate,
      priority: dto.priority ?? ticket.priority,
      note: dto.note ?? ticket.note,
      status: ticketStatusFor(daysBetween(todayInVietnam(), dueDate)),
    });
    return this.findTicket(ticket.id);
  }

  /**
   * US 2.3 — turn a reminder into real work. The person who clicks becomes the
   * Node E owner of the resulting Execution Flow, overriding whatever the
   * workflow's RACI would have resolved to.
   */
  async createWorkOrder(ticketId: string, callerUserId: string): Promise<TaskInstance> {
    const ticket = await this.findTicket(ticketId);
    if (ticket.resultingTaskId) {
      throw new BadRequestException('Phiếu này đã tạo Lệnh công việc rồi.');
    }
    // BRD 2 US 1.2 applies here too: the clicker is about to become the Node E
    // owner, and only a manager may hold Node E. Without this the Work Order
    // path would be a back door around the rule that RaciService enforces at
    // design time.
    if (!(await this.orgUnitsService.hasSubordinates(callerUserId))) {
      throw new ForbiddenException(
        'Chỉ cấp Quản lý (có cấp dưới) mới được tạo Lệnh công việc, vì người tạo sẽ giữ Node E.',
      );
    }

    const workflowId = ticket.schedule?.workflowId;
    if (!workflowId) {
      throw new BadRequestException(
        'Lịch bảo trì này chưa gắn Luồng Thực thi. Vui lòng cấu hình trước khi tạo Lệnh công việc.',
      );
    }

    const orgUnitId = await this.resolveOrgUnitId(ticket.partId);
    if (!orgUnitId) {
      throw new BadRequestException(
        `Thiết bị "${ticket.part.name}" chưa có đơn vị phụ trách, không mở được Lệnh công việc.`,
      );
    }

    const task = await this.tasksService.create(
      {
        workflowId,
        title: `[Bảo trì] ${ticket.part.name}`,
        referenceCode: ticket.ticketNumber,
        referenceTitle: `Phiếu bảo trì ${ticket.part.code}`,
        orgUnitId,
        priority: ticket.priority,
        dueDate: ticket.dueDate,
        description: ticket.note ?? `Bảo trì định kỳ: ${ticket.part.name}`,
      },
      callerUserId,
      {
        origin: 'work_order',
        parentMaintenanceTicketId: ticket.id,
        nodeEOwnerUserId: callerUserId,
        // BRD 3 US 2.1 AC2 — payload của Lệnh công việc đính kèm nguyên chuỗi
        // JSON đã khai cho thiết bị. Chép sang chứ không tham chiếu: sửa cấu
        // hình thiết bị sau này không được đổi nội dung Lệnh đã phát ra.
        maintenancePartId: ticket.partId,
        equipmentTaskTemplate: ticket.part.taskTemplate ?? null,
      },
    );

    await this.ticketsRepository.update(ticket.id, { resultingTaskId: task.id });
    await this.activityService.record({
      taskId: task.id,
      actorUserId: callerUserId,
      action: 'task.work_order_created',
      summary:
        `Lệnh công việc mở từ phiếu bảo trì ${ticket.ticketNumber} (${ticket.part.name}, hạn ${ticket.dueDate}). Người tạo giữ Node E.` +
        (isNonEmptyTemplate(ticket.part.taskTemplate)
          ? ` Đính kèm ${ticket.part.taskTemplate.length} nhiệm vụ cấu hình sẵn của thiết bị.`
          : ''),
      metadata: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        equipmentTaskCount: ticket.part.taskTemplate?.length ?? 0,
      },
    });
    return task;
  }

  // ----------------------------------------------------------------- Cron

  /**
   * Raises a reminder ticket for every schedule falling due within the lead
   * window, then rolls the schedule on to its next cycle.
   *
   * Safe to run repeatedly for the same day: the unique `(schedule_id,
   * due_date)` index means a re-run is a no-op rather than a duplicate.
   */
  async runReminderSweep(today: string = todayInVietnam()): Promise<SweepResult> {
    const schedules = await this.schedulesRepository.find({
      where: { isActive: true },
      relations: ['part', 'part.orgUnit'],
    });

    let ticketsCreated = 0;
    for (const schedule of schedules) {
      if (!schedule.part?.isActive) continue;
      // Re-derive rather than trusting the cached value: a cron that missed a
      // few days would otherwise keep firing on a stale `nextDueAt`.
      const dueDate = computeNextDueAt(schedule.anchorDate, schedule.frequency, today);
      if (daysBetween(today, dueDate) > REMINDER_LEAD_DAYS) {
        if (schedule.nextDueAt !== dueDate) {
          await this.schedulesRepository.update(schedule.id, { nextDueAt: dueDate });
        }
        continue;
      }

      const created = await this.raiseTicket(schedule, dueDate, today);
      if (created) ticketsCreated++;

      // Roll forward so the dashboard shows the cycle after the one just
      // ticketed, whether or not this run actually created the ticket.
      await this.schedulesRepository.update(schedule.id, {
        nextDueAt: addInterval(dueDate, schedule.frequency),
      });
    }

    this.logger.log(
      `Quét bảo trì ${today}: ${schedules.length} lịch, tạo ${ticketsCreated} phiếu mới.`,
    );
    return { ranFor: today, ticketsCreated, schedulesChecked: schedules.length };
  }

  private async raiseTicket(
    schedule: MaintenanceSchedule,
    dueDate: string,
    today: string,
  ): Promise<MaintenanceTicket | null> {
    const existing = await this.ticketsRepository.findOne({
      where: { scheduleId: schedule.id, dueDate },
    });
    if (existing) return null; // already reminded for this cycle

    // Đơn vị suy ra từ cây, không đọc thẳng cột: một chi tiết nằm sâu thường
    // không tự khai đơn vị mà thừa hưởng của phân hệ chứa nó.
    const orgUnitId = await this.resolveOrgUnitId(schedule.partId);
    if (!orgUnitId) {
      this.logger.warn(
        `Bỏ qua lịch ${schedule.id} (${schedule.part.name}): không suy ra được đơn vị phụ trách.`,
      );
      return null;
    }
    const recipients = await this.orgUnitsService.resolveAssignees({ orgUnitId });

    try {
      return await this.dataSource.transaction(async (manager) => {
        const ticket = await manager.save(
          manager.create(MaintenanceTicket, {
            ticketNumber: await this.nextTicketNumber(),
            partId: schedule.partId,
            scheduleId: schedule.id,
            dueDate,
            status: ticketStatusFor(daysBetween(today, dueDate)),
            priority: 'Normal' as const,
          }),
        );

        await this.notificationsService.createMany(
          recipients.map((r) => ({
            userId: r.userId,
            type: NOTIFICATION_TYPES.MAINTENANCE_DUE,
            title: `Sắp đến hạn bảo trì: ${schedule.part.name}`,
            body: `Phiếu ${ticket.ticketNumber} — hạn ${dueDate}.`,
            link: '/maintenance',
          })),
          manager,
        );

        return ticket;
      });
    } catch (error) {
      // The unique index is the real guard; a concurrent run losing the race
      // is expected, not an error worth failing the whole sweep over.
      if ((error as { code?: string }).code === '23505') return null;
      throw error;
    }
  }

  /**
   * Ticket numbers come from a Postgres sequence, not from `COUNT(*)`: a count
   * would hand the same number to two concurrent sweeps, and would re-issue a
   * number after a ticket is deleted.
   */
  private async nextTicketNumber(): Promise<string> {
    const [{ nextval }] = await this.dataSource.query(
      "SELECT nextval('maintenance_ticket_number_seq') AS nextval",
    );
    return `#${nextval}`;
  }
}

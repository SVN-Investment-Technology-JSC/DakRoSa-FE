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
import { UpdateTicketDto } from './dto/update-ticket.dto';
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

  async createPart(dto: CreatePartDto): Promise<MaintenancePart> {
    await this.orgUnitsService.findOne(dto.orgUnitId); // 404s if the unit is bogus
    const existing = await this.partsRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`Mã thiết bị "${dto.code}" đã tồn tại.`);
    const saved = await this.partsRepository.save(this.partsRepository.create(dto));
    return this.findPart(saved.id);
  }

  async updatePart(id: string, dto: UpdatePartDto): Promise<MaintenancePart> {
    const part = await this.findPart(id);
    if (dto.orgUnitId) await this.orgUnitsService.findOne(dto.orgUnitId);
    await this.partsRepository.update(part.id, dto);
    return this.findPart(part.id);
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

    const task = await this.tasksService.create(
      {
        workflowId,
        title: `[Bảo trì] ${ticket.part.name}`,
        referenceCode: ticket.ticketNumber,
        referenceTitle: `Phiếu bảo trì ${ticket.part.code}`,
        orgUnitId: ticket.part.orgUnitId,
        priority: ticket.priority,
        dueDate: ticket.dueDate,
        description: ticket.note ?? `Bảo trì định kỳ: ${ticket.part.name}`,
      },
      callerUserId,
      {
        origin: 'work_order',
        parentMaintenanceTicketId: ticket.id,
        nodeEOwnerUserId: callerUserId,
      },
    );

    await this.ticketsRepository.update(ticket.id, { resultingTaskId: task.id });
    await this.activityService.record({
      taskId: task.id,
      actorUserId: callerUserId,
      action: 'task.work_order_created',
      summary: `Lệnh công việc mở từ phiếu bảo trì ${ticket.ticketNumber} (${ticket.part.name}, hạn ${ticket.dueDate}). Người tạo giữ Node E.`,
      metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber },
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

    const recipients = await this.orgUnitsService.resolveAssignees({
      orgUnitId: schedule.part.orgUnitId,
    });

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

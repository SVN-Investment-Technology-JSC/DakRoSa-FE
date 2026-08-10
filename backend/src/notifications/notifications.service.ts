import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { Notification } from './notification.entity';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  /**
   * `manager` lets a caller enlist the notification in its own transaction, so
   * a ticket and its reminder are committed together or not at all.
   */
  async createMany(
    inputs: CreateNotificationInput[],
    manager?: EntityManager,
  ): Promise<Notification[]> {
    if (inputs.length === 0) return [];
    const repo = manager ? manager.getRepository(Notification) : this.notificationsRepository;
    return repo.save(inputs.map((input) => repo.create(input)));
  }

  findForUser(userId: string, unreadOnly = false): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: unreadOnly ? { userId, readAt: IsNull() } : { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationsRepository.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo.');
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationsRepository.save(notification);
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationsRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }
}

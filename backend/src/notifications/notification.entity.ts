import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * In-app notification (Q3 — email/push deliberately deferred).
 *
 * `type` is a free-form slug rather than an enum so a new notification kind
 * never needs a migration; the UI falls back to a neutral icon for unknown
 * types.
 */
export const NOTIFICATION_TYPES = {
  MAINTENANCE_DUE: 'maintenance_due',
  TASK_ASSIGNED: 'task_assigned',
} as const;

@Entity('notifications')
@Index('IDX_notifications_user_created', ['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  /** Client-side route the notification points at, e.g. `/maintenance`. */
  @Column({ type: 'varchar', nullable: true })
  link?: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExecutionSubtask } from './execution-subtask.entity';
import { User } from '../users/user.entity';

/**
 * Metadata for a report file attached to an E(x) sub-task (BRD 2 US 1.4 AC1).
 * The bytes live in MinIO; only the object key is kept here.
 */
@Entity('execution_attachments')
export class ExecutionAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subtask_id', type: 'uuid' })
  subtaskId: string;

  @ManyToOne(() => ExecutionSubtask, (subtask) => subtask.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subtask_id' })
  subtask: ExecutionSubtask;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint', transformer: {
    to: (value: number) => value,
    from: (value: string | null) => (value === null ? 0 : Number(value)),
  } })
  sizeBytes: number;

  /** Path inside the bucket — never exposed directly, only via presigned URLs. */
  @Column({ name: 'object_key' })
  objectKey: string;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid' })
  uploadedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

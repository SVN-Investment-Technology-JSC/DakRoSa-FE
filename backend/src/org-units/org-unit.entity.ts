import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrgUnitType } from './org-unit-type.entity';
import { User } from '../users/user.entity';

@Entity('org_units')
@Index(['level'])
@Index(['level', 'parentId'])
export class OrgUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  @Index()
  parentId?: string | null;

  @ManyToOne(() => OrgUnit, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: OrgUnit | null;

  @Column({ name: 'type_id', type: 'uuid' })
  typeId: string;

  @ManyToOne(() => OrgUnitType)
  @JoinColumn({ name: 'type_id' })
  type: OrgUnitType;

  @Column()
  title: string;

  @Column({ type: 'int' })
  level: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'head_user_id', type: 'uuid', nullable: true })
  headUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'head_user_id' })
  head?: User | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

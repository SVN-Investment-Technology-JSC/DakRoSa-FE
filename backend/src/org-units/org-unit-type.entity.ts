import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('org_unit_types')
export class OrgUnitType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'color_class', nullable: true })
  colorClass?: string;

  @Column({ name: 'hex_color', nullable: true })
  hexColor?: string;

  @Column({ name: 'default_rank', type: 'int', nullable: true })
  defaultRank?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

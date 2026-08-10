import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrgUnit } from './org-unit.entity';

@Entity('org_unit_closure')
export class OrgUnitClosure {
  @PrimaryColumn({ name: 'ancestor_id', type: 'uuid' })
  ancestorId: string;

  @PrimaryColumn({ name: 'descendant_id', type: 'uuid' })
  descendantId: string;

  @ManyToOne(() => OrgUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ancestor_id' })
  ancestor: OrgUnit;

  @ManyToOne(() => OrgUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'descendant_id' })
  descendant: OrgUnit;

  @Column({ type: 'int' })
  depth: number;
}

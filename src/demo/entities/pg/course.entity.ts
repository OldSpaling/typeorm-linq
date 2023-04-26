import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('course')
export class CourseEntity extends BaseEntity {
  constructor(model?: Partial<CourseEntity>) {
    super();
    if(model){
        Object.assign(this, model);
    }
  }
  @Column('character varying', { name: 'name', length: 255 })
  name: string;
  @Column('integer', { name: 'ownerI_id' })
  ownerId: number;
}

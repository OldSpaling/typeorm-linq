import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('school')
export class SchoolEntity extends BaseEntity {
  constructor(model?: Partial<SchoolEntity>) {
    super();
    if(model){
        Object.assign(this, model);
    }
  }
  @Column('character varying', { name: 'name', length: 255 })
  name: string;
}

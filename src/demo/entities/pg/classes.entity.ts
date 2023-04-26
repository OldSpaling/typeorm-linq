import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('classes')
export class ClassesEntity extends BaseEntity {
  constructor(model?: Partial<ClassesEntity>) {
    super();
    if(model){
        Object.assign(this, model);
    }
  }
  @Column('character varying', { name: 'name', length: 255 })
  name: string;
  @Column('integer', { name: 'school_id' })
  schoolId: number;
  @Column('integer', { name: 'head_teacher_id' })
  headTeacherId: number;
}

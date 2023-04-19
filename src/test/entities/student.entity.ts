import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('student')
export class StudentEntity extends BaseEntity {
    constructor(model?: Partial<StudentEntity>) {
        super();
        if(model){
            Object.assign(this, model);
        }
      }
  @Column('character varying', { name: 'first_name', length: 255 })
  firstName: string;
  @Column('character varying', { name: 'last_name', length: 255 })
  lastName: string;
  @Column('boolean', { name: 'is_male' })
  isMale: boolean;
  @Column('integer', { name: 'age' })
  age: number;
  @Column('character varying', { name: 'address', length: 255 })
  address: string;
  @Column('boolean', { name: 'is_header' })
  isMonitor: boolean;
  @Column('integer', { name: 'classes_id' })
  classesId: number;
}

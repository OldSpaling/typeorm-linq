import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClassesEntity } from './classes.entity';

@Entity('student')
export class StudentEntity extends BaseEntity {
  constructor(model?: Partial<StudentEntity>) {
    super();
    if (model) {
      Object.assign(this, model);
    }
  }
  @Column('nvarchar', { name: 'first_name', length: 255 })
  firstName: string;
  @Column('nvarchar', { name: 'last_name', length: 255 })
  lastName: string;
  @Column('bit', { name: 'is_male' })
  isMale: boolean;
  @Column('integer', { name: 'age' })
  age: number;
  @Column('nvarchar', { name: 'address', length: 255 })
  address: string;
  @Column('bit', { name: 'is_header' })
  isMonitor: boolean;
  @Column('integer', { name: 'classes_id' })
  classesId: number;
  @JoinColumn({ name: 'classes_id' })
  @ManyToOne(() => ClassesEntity)
  classes: ClassesEntity;
}

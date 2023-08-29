import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('teacher')
export class TeacherEntity extends BaseEntity {
  constructor(model?: Partial<TeacherEntity>) {
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
}

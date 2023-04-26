import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
@Entity('student_course_mapping')
export class StudentCourseMappingEntity extends BaseEntity {
    constructor(model?: Partial<StudentCourseMappingEntity>) {
        super();
        if(model){
            Object.assign(this, model);
        }
      }
  @Column('integer', { name: 'student_id' })
  studentId: number;
  @Column('integer', { name: 'course_id' })
  courseId: number;
}

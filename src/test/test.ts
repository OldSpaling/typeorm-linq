import { init } from '../linq';
import { Demo } from './demo';
import { ClassesEntity } from './entities/classes.entity';
import { CourseEntity } from './entities/course.entity';
import { SchoolEntity } from './entities/school.entity';
import { StudentCourseMappingEntity } from './entities/student-course_mapping.entity';
import { StudentEntity } from './entities/student.entity';
import { TeacherEntity } from './entities/teacher.entity';

export class Test {
  private get demo() {
    return new Demo({
      type: 'postgres',
      host: '192.168.100.46',
      port: 5432,
      username: 'postgres',
      password: 'Win2008',
      schema: 'public',
      database: 'test',
      synchronize: true,
      entities: [
        SchoolEntity,
        ClassesEntity,
        TeacherEntity,
        CourseEntity,
        StudentEntity,
        StudentCourseMappingEntity,
      ],
    });
  }
  async initData() {
    await new Demo({
      type: 'postgres',
      host: '192.168.100.46',
      port: 5432,
      username: 'postgres',
      password: 'Win2008',
      schema: 'public',
      database: 'test',
      synchronize: true,
      entities: [
        SchoolEntity,
        ClassesEntity,
        TeacherEntity,
        CourseEntity,
        StudentEntity,
        StudentCourseMappingEntity,
      ],
    }).initData();
  }
  async testQuery() {
    await this.demo.testJoinQuery();
  }
}
// new Test().initData().then((o) => console.log('init data'));
init({dbType:'postgres'});
new Test().testQuery();
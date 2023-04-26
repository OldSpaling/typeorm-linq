import { init } from '../linq';
import { Demo } from './demo';
import { ClassesEntity } from './entities/pg/classes.entity';
import { CourseEntity } from './entities/pg/course.entity';
import { SchoolEntity } from './entities/pg/school.entity';
import { StudentCourseMappingEntity } from './entities/pg/student-course_mapping.entity';
import { StudentEntity } from './entities/pg/student.entity';
import { TeacherEntity } from './entities/pg/teacher.entity';
import { createConn } from './util';

export class Test {
  get msSqlDemo() {
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
  get mySqlDemo() {
    const ds = createConn();
    return new Demo(ds.options);
    // init({ dbType: 'mysql' });
  }
  async initMSSQLData() {
    await this.msSqlDemo.initData();
  }
  async testQuery(demo: Demo) {
    await demo.testJoinQuery();
  }
  async testMySql() {
    await this.mySqlDemo.testMySql();
  }
}
// new Test().initData().then((o) => console.log('init data'));
init({ dbType: 'mysql' });
const test = new Test();
// test.testQuery(test.mySqlDemo);
test.testMySql();

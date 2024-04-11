import { init } from '../linq';
import { Demo } from './demo';
import { ClassesEntity } from './entities/mssql/classes.entity';
import { CourseEntity } from './entities/mssql/course.entity';
import { SchoolEntity } from './entities/mssql/school.entity';
import { StudentCourseMappingEntity } from './entities/mssql/student-course_mapping.entity';
import { StudentEntity } from './entities/mssql/student.entity';
import { TeacherEntity } from './entities/mssql/teacher.entity';
import { createConn } from './util';

export class Test {
  get pgDemo() {
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
  get mssqlDemo() {
    return new Demo({
      type: 'mssql',
      host: '192.168.100.14',
      port: 1433,
      username: 'cp',
      password: 'Win2008',
      schema: 'dbo',
      database: 'iDoctor',
      synchronize: true,
      logging: true,
      options: {
        encrypt: false,
        // cryptoCredentialsDetails: {
        //   minVersion: 'TLSv1',
        // },
      },
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
    await this.mssqlDemo.initData();
  }
  async testQuery(demo: Demo) {
    await demo.testJoinQuery();
  }
  async testMySql() {
    await this.mySqlDemo.testMySql();
  }
}
// new Test().initData().then((o) => console.log('init data'));
init({ dbType: 'mssql' });
const test = new Test();
console.log('start');
test.testQuery(test.mssqlDemo);
// test.testMySql();

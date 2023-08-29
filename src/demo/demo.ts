import { DataSource, DataSourceOptions } from 'typeorm';
import { SchoolEntity } from './entities/mssql/school.entity';
import { faker } from '@faker-js/faker';
import { TeacherEntity } from './entities/mssql/teacher.entity';
import { ClassesEntity } from './entities/mssql/classes.entity';
import { CourseEntity } from './entities/mssql/course.entity';
import { StudentEntity } from './entities/mssql/student.entity';
import { StudentCourseMappingEntity } from './entities/mssql/student-course_mapping.entity';
import { LinqInferQueryBuilder } from '../linq';
import { ExpressionAggregateFunc } from '../linq/parser/expression-parser';
import { Actor, Film, FilmActor, Language } from './entities/mysql';
export class Demo {
  constructor(private readonly option: DataSourceOptions) {}
  async createConn() {
    const dataSource = await new DataSource(this.option).initialize();
    return dataSource;
  }
  getCourse(number: number) {
    switch (number) {
      case 1:
        return '语文';
      case 2:
        return '数学';
      case 3:
        return '英语';
      case 4:
        return '物理';
      default:
        return '化学';
    }
  }
  async initData() {
    const dataSource = await this.createConn();
    //school
    const school = await dataSource.manager.save(
      new SchoolEntity({
        name: faker.address.secondaryAddress(),
      }),
    );
    console.log('school');
    //teacher
    const teachers: TeacherEntity[] = [];
    for (let i = 0; i < 50; i++) {
      teachers.push(
        new TeacherEntity({
          lastName: faker.name.lastName(),
          firstName: faker.name.firstName(),
          isMale: i % 3 == 0,
          age: +faker.random.numeric(2),
          address: faker.address.secondaryAddress(),
        }),
      );
    }
    await dataSource.manager.save(teachers, { reload: true });
    console.log('teachers');
    //classes
    const classes: ClassesEntity[] = [];
    for (let i = 0; i < 10; i++) {
      classes.push(
        new ClassesEntity({
          name: faker.random.numeric(1),
          schoolId: school.id,
          headTeacherId: teachers.find((o) => o.id == (i + 1) * 2).id,
        }),
      );
    }
    await dataSource.manager.save(classes, { reload: true });
    console.log('classes');
    //course
    const courses: CourseEntity[] = [];
    for (let i = 0; i < 50; i++) {
      courses.push(
        new CourseEntity({
          name: this.getCourse((i + 1) % 5),
          ownerId: i + 1,
        }),
      );
    }
    await dataSource.manager.save(courses, { reload: true });
    console.log('courses');
    //student
    const students: StudentEntity[] = [];
    for (let i = 0; i < 10 * 50; i++) {
      students.push(
        new StudentEntity({
          lastName: faker.name.lastName(),
          firstName: faker.name.firstName(),
          isMale: i % 3 == 0,
          age: +faker.random.numeric(2),
          address: faker.address.secondaryAddress(),
          isMonitor: i % 25 == 0,
          classesId: parseInt(i / 10 + '') + 1,
        }),
      );
    }
    await dataSource.manager.save(students, { reload: true });
    console.log('students');
    //course student mapping
    const mapping: StudentCourseMappingEntity[] = [];
    students.forEach((stu, index) => {
      const i = parseInt(index / 50 + '');
      mapping.push(
        new StudentCourseMappingEntity({
          studentId: stu.id,
          courseId: i * 5 + 1,
        }),
      );
      mapping.push(
        new StudentCourseMappingEntity({
          studentId: stu.id,
          courseId: i * 5 + 2,
        }),
      );
      mapping.push(
        new StudentCourseMappingEntity({
          studentId: stu.id,
          courseId: i * 5 + 3,
        }),
      );
      mapping.push(
        new StudentCourseMappingEntity({
          studentId: stu.id,
          courseId: i * 5 + 4,
        }),
      );
      mapping.push(
        new StudentCourseMappingEntity({
          studentId: stu.id,
          courseId: i * 5 + 5,
        }),
      );
    });
    await dataSource.manager.save(mapping);
    console.log('mapping');
  }
  async testJoinQuery() {
    const dataSource = await this.createConn();
    const schoolFilter = { id: 1 };
    const query = await new LinqInferQueryBuilder<SchoolEntity>(dataSource)
      .create(SchoolEntity, 'sc')
      .innerJoinAndSelect(
        ClassesEntity,
        'cla',
        ({ sc, cla }) => sc.id == cla.schoolId,
      )
      .leftJoinAndSelect(
        StudentEntity,
        'stu',
        ({ stu, cla }) => stu.classesId == cla.id,
      )
      .leftJoinAndSelect(
        TeacherEntity,
        'te',
        ({ cla, te }) => cla.headTeacherId == te.id,
      )
      .where(
        ({ cla, stu }) =>
          (!stu.isMale && ExpressionAggregateFunc.len(cla.name) >= 0) ||
          ExpressionAggregateFunc.subQuery('stu.is_header == true'),
      )
      .andWhere(({ sc }) => sc.id == schoolFilter.id, {
        schoolFilterid: schoolFilter.id, //参数名是单纯层级合并
      })
      .orderBy(({ sc }) => sc.name, 'DESC')
      .select(({ sc, cla, stu, te }) => {
        schoolName: sc.name;
        className: cla.name;
        headTeacher: te.firstName + ' ' + te.lastName;
        stuName: stu.firstName + ' ' + stu.lastName;
      })
      .toSql();
    // .getRawMany<{
    //   schoolName: string;
    //   className: string;
    //   headTeacher: string;
    //   stuName: string;
    // }>();
    console.log(query);
    /**
       * SELECT  "sc"."name" "schoolName", "cla"."name" "className", "te"."first_name"||' '||"te"."last_name" "headTeacher", "stu"."first_name"||' '||"stu"."last_name" "stuName" FROM "public"."school" "sc" INNER JOIN "public"."classes" "cla" ON "sc"."id"="cla"."school_id"  LEFT JOIN "public"."student" "stu" ON 
        "stu"."classes_id"="cla"."id"  LEFT JOIN "public"."teacher" "te" ON "cla"."head_teacher_id"="te"."id" WHERE ( ("stu"."is_male" =false and "cla"."name"='8')  or "stu"."is_header"=true)
       */
  }
  async testMySql() {
    const dataSource = await this.createConn();
    const youngLanguage = 'YOUNG LANGUAGE';
    const query = await new LinqInferQueryBuilder<Film>(dataSource)
      .create(Film, 'f')
      .leftJoinAndSelect(
        FilmActor,
        'fac',
        ({ fac, f }) => fac.filmId == f.filmId,
      )
      .leftJoinAndSelect(
        Actor,
        'ac',
        ({ fac, ac }) => fac.actorId == ac.actorId,
      )
      .leftJoinAndSelect(
        Language,
        'l',
        ({ l, f }) => l.languageId == f.languageId,
      )
      .where(
        ({ f, ac }) =>
          (f.title == 'YOUTH KICK' || f.title == youngLanguage) &&
          ExpressionAggregateFunc.len(ac.firstName + ac.lastName) > 10,
        { youngLanguage },
      )
      .orderBy(({ ac }) => ac.firstName + ac.lastName, 'DESC')
      .select(({ f, ac, l }) => {
        filmName: f.title;
        actorName: ac.firstName + ' ' + ac.lastName;
        language: l.name;
      })
      .getRawMany<{filmName:string,actorName:string,language:string}>();
    console.log(query);
  }
  async testLinqFrom() {
    const dataSource = await this.createConn();
    const query = new LinqInferQueryBuilder<SchoolEntity>(dataSource)
      .create()
      .from((qb: LinqInferQueryBuilder<TeacherEntity>) => {
        //TeacherEntity在此处代表的返回值类型，不需要必须是实体
        const subQuery = qb
          .from(TeacherEntity, 'subtech')
          .where(({ subtech }) => subtech.id == 1);
        return subQuery;
      }, 'from1')
      .where(({ from1 }) => from1.firstName == 'test');
    // return subQuery;
  }
}

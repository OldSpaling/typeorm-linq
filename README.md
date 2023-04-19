# typeorm-linq

typeorm-linq is a library that support linq base on typeorm `SelectQueryBuilder`

## Install

- install typeorm

```cmd
npm install typeorm --save
```

- install typeorm-linq

```cmd
npm install typeorm-linq --save
```

## Usage

```javascript
 //init config when code start
 init({dbType:'postgres'});
 //query db by QueryBuilder
 const query =await new LinqInferQueryBuilder<SchoolEntity>(dataSource)
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
          (!stu.isMale && cla.name == '8') || stu.isMonitor == true,
      )
      .andWhere(({ sc }) => sc.id == schoolFilter.id, {
        schoolFilterid: schoolFilter.id, //just remove '.' as name
      })
      .orderBy(({ sc }) => sc.name, 'DESC')
      .select(({ sc, cla, stu, te }) => {
        schoolName: sc.name;
        className: cla.name;
        headTeacher: te.firstName + ' ' + te.lastName;
        stuName: stu.firstName + ' ' + stu.lastName;
      })
      .getRawMany<{
        schoolName: string;
        className: string;
        headTeacher: string;
        stuName: string;
      }>();
```

## Feature

- Type Inference
  typeorm-linq can dynamic infer function type.
  eg:`cla` and `stu` is a entity alias,but in `where` function,the types of `cla` and `stu` are `ClassesEntity` and `StudentEntity`
  ```js
  //
  where(
    ({ cla, stu }) => (!stu.isMale && cla.name == '8') || stu.isMonitor == true,
  );
  ```
- Cache:Arrow Function will be complied sql string when it is invoked for the first time.The default cache store is `ExpressionCacheMemoryStore`.
  - `ExpressionCacheMemoryStore`(default)
  - `ExpressionCacheFileStore`
  - `ExpressionCacheStore`(custom store base class)
- Support one to many for the relation of alias and entity
  ```js
  queryBuilder
    .create(ClassesEntity, 'cla1')
    .innerJoinAndSelect(
      ClassesEntity,
      'cla2',
      ({ cla1, cla2 }) => sc.id == cla.parentId,
    );
  ```
- Support variable
  - Object:the max deep level is 2.eg:a.b
    ```js
    const school = { id: 2 };
    queryBuilder
      .create(SchoolEntity, 'sc')
      .where(({ sc }) => sc.id == school.id, {
        schoolid: school.id, //param label just remove '.'
      });
    ```
  - Basic Type
    ```js
    const id = 2;
    queryBuilder.create(SchoolEntity, 'sc').where(({ sc }) => sc.id == id, {
      id,
    });
    ```
  - Array:must be end with `Array`
    ```js
    const idArray = [2, 3];
    queryBuilder
      .create(SchoolEntity, 'sc')
      .where(({ sc }) => idArray.includes(sc.id), {
        id,
      });
    ```
  - constant
    ```js
    queryBuilder.create(SchoolEntity, 'sc').where(({ sc }) => sc.id == 5);
    ```
- Support JS Syntax
  - `Array.includes` must be end with `Array`
    ```js
    const idArray = [2, 3];
    queryBuilder
      .create(SchoolEntity, 'sc')
      .where(({ sc }) => idArray.includes(sc.id), {
        idArray,
      });
    ```
  - `string.includes`/`string.startsWith`/`string.endsWith`
  ```js
  const test = 'test';
  queryBuilder
    .create(SchoolEntity, 'sc')
    .where(({ sc }) => sc.name.includes(test), {
      test: OperatorConvert.like(test),
    });
  ```
  - `()`, `==`、`===`、`!==`、`!=`、`||`、`&&`
    ```js
    const test = 'test';
    const test2 = 'test2';
    const idsArray = [2, 4, 5, 7];
    queryBuilder
      .create(SchoolEntity, 'sc')
      .where(
        ({ sc }) =>
          sc.name.includes(test) ||
          (sc.name.includes(test2) && idArray.includes(sc.id)),
        {
          test,
          test2,
          idsArray,
        },
      );
    ```
  - constant
    ```js
    //case1
    queryBuilder.create(SchoolEntity, 'sc').where(({ sc }) => sc.id == 5);
    //case2
    queryBuilder
      .create(SchoolEntity, 'sc')
      .where(({ sc }) => sc.isDeleted == true);
    ```
  - unary operator
    ```js
    queryBuilder.create(SchoolEntity, 'sc').where(({ sc }) => !sc.isDeleted);
    ```
  - `+` operator
    ```js
    queryBuilder.create(TeacherEntity, 'te').select(({ te }) => {
      name: te.firstName + ' ' + te.lastName;
    });
    ```
  - `>`,`<`,`>=`,`<=`
    ```js
    queryBuilder
      .create(TeacherEntity, 'te')
      .where(({ cla, stu }) => ExpressionAggregateFunc.len(cla.name) >= 3);
    ```
  - Aggregate Function:`ExpressionAggregateFunc`
    ```js
    //subQuery
    ExpressionAggregateFunc.subQuery(
      'case when a.name is null then "test" else a.name',
    );
    //len
    queryBuilder
      .create(SchoolEntity, 'sc')
      .where(({ sc }) => ExpressionAggregateFunc.len(sc.name));
    ```
  - complex use
    ```js
    queryBuilder.create(TeacherEntity, 'te').select(({ te }) => {
      name: ExpressionAggregateFunc.len(te.firstName + ' ' + te.lastName);
    });
    ```

## typeorm other feature

- transaction support
  ```js
  queryBuilder.transaction(
    TeacherEntity,
    'te',
    async (manager, queryBuilder) => {
      //if you need ,you can use queryBuilder to select some data.
      //business code
    },
  );
  ```
- from
  ```js
  new LinqInferQueryBuilder() <
    SchoolEntity >
    dataSource
      .create()
      .from((qb: LinqInferQueryBuilder<TeacherEntity>) => {
        //TeacherEntity as the return type,it isn't necessary
        const subQuery = qb
          .from(TeacherEntity, 'subTech')
          .where(({ subTech }) => subTech.id == 1);
        return subQuery;
      }, 'from1')
      .where(({ from1 }) => from1.firstName == 'test');
  ```

## Besides

The Reason of choosing Object Type as Arrow Function Params instead of Tuple is below: Tuple just can infer type,but cannot infer variable name.

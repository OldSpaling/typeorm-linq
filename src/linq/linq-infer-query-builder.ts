import {
  Brackets,
  DataSource,
  EntityManager,
  ObjectLiteral,
  SelectQueryBuilder,
  WhereExpressionBuilder,
} from 'typeorm';
import { ArrowFunctionExpression } from './parser/expression-parser';
import { ExpressionCache } from './expression-cache';
import { parse as acornParse } from 'acorn';
import { ConfigUtil } from './config/config';
// import { RepositoryService } from '../repository.service';
export type ExpressionType<T = any> = (...params: any[]) => T;
/** 对于重复变量，设置替换逻辑 */
export type VerReplacer = {
  /**express 生成的原有变量值 */
  original: string;
  /**修正为新的变量值 */
  new: string;
};
export type MetadataType = Array<{
  name: string;
  aliasNames: string[];
  columns: Array<{ propertyName: string; databaseName: string }>;
}>;
//#region infer begin
type LinqAliasKeyType<KeyType> = KeyType extends string ? KeyType : string;
type LinqAliasInferType<KeyType, Type> = {
  [key in LinqAliasKeyType<KeyType>]: Type;
};
export type ExpressionInferType<T = any, TParams = ObjectLiteral> = (
  params: TParams,
) => T;
//#endregion infer end
export interface ILinqWhereExpression<TEntity> {
  where(
    expression: ExpressionType<boolean> | string,
    params?: ObjectLiteral,
    replacer?: VerReplacer[],
  ): ILinqWhereExpression<TEntity>;
  andWhere(
    expression: ExpressionType<boolean> | string | Brackets,
    params?: ObjectLiteral,
  ): ILinqWhereExpression<TEntity>;
  orWhere(
    expression: ExpressionType<boolean> | string,
    params?: ObjectLiteral,
    replacer?: VerReplacer[],
  ): ILinqWhereExpression<TEntity>;
  getQueryBuilder(): SelectQueryBuilder<TEntity>;
}
export class LinqInferQueryBuilder<
  TEntity,
  TInferType extends ObjectLiteral = ObjectLiteral,
> {
  private queryBuilder!: SelectQueryBuilder<TEntity>;
  private static orginMetaData: MetadataType = [];
  private metaData!: MetadataType;
  private isSelect = true;
  constructor(
    private readonly dataSource: DataSource, // alias: TEntity | string, // isManager = false,
  ) {
    // this.queryBuilder = new LinqQueryBuilder<TEntity>(
    //   repository,
    //   alias,
    //   isManager,
    // );
    // super();
  }
  //!类型推导逻辑由方法内提到返回值位置，为了解决调用linqGetRawMany识别不出是泛型的问题
  //!方法内强转类型后类型推导有问题，识别不出别的泛型方法，感觉性能上直接返回值比推导能性能好点
  create<A extends string>(
    target: { new (): TEntity },
    alias: A,
  ): LinqInferQueryBuilder<
    TEntity,
    TInferType & LinqAliasInferType<A, TEntity>
  >;
  create(): this;
  create<A extends string>(target?: { new (): TEntity }, alias?: A) {
    if (LinqInferQueryBuilder.orginMetaData.length == 0) {
      LinqInferQueryBuilder.orginMetaData = this.dataSource.entityMetadatas.map(
        (o) => {
          return {
            name: o.name,
            aliasNames: [],
            columns: o.columns.map((c) => {
              return {
                propertyName: c.propertyName,
                databaseName: c.databaseName,
              };
            }),
          };
        },
      );
    }
    if (target && alias) {
      this.queryBuilder = this.dataSource
        .getRepository(target)
        .createQueryBuilder(alias);
      this.metaData = JSON.parse(
        JSON.stringify(LinqInferQueryBuilder.orginMetaData),
      );
      //支持一个表连表有多个别名
      this.metaData
        .filter((o) => o.name == target.name)
        .forEach((o) => {
          o.aliasNames.push(alias);
        });
    } else {
      this.queryBuilder = this.dataSource.createQueryBuilder();
    }

    // type TempReturnType = LinqInferQueryBuilder<
    //   TEntity,
    //   TInferType & LinqAliasInferType<A, TEntity>
    // >;
    return this;
  }
  baseLeftJoinAndSelect<T, A>(
    target: new () => T,
    alias: LinqAliasKeyType<A>,
    condition?: string,
    parameters?: ObjectLiteral,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>> {
    this.metaData
      .filter((o) => o.name == target['name'])
      .forEach(
        (o) => !o.aliasNames.includes(alias) && o.aliasNames.push(alias),
      );
    this.queryBuilder.leftJoinAndSelect(target, alias, condition, parameters);
    return this;
  }

  leftJoinAndSelect<T, A>(
    target: { new (): T },
    alias: LinqAliasKeyType<A>,
    expression: ExpressionInferType<
      boolean,
      TInferType & LinqAliasInferType<A, T>
    >,
    params?: ObjectLiteral,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>> {
    const condition = this.parseExpression(
      expression,
      target.name,
      alias || target.name,
    );
    this.queryBuilder.leftJoinAndSelect(
      target,
      alias || target.name,
      condition,
      params,
    );
    // type TempReturnType = LinqInferQueryBuilder<
    //   TEntity,
    //   TInferType & LinqAliasInferType<A, T>
    // >;
    return this;
  }
  baseInnerJoinAndSelect<T, A>(
    target: new () => T,
    alias: LinqAliasKeyType<A>,
    condition?: string,
    parameters?: ObjectLiteral,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>> {
    this.metaData
      .filter((o) => o.name == target['name'])
      .forEach((o) => (o.name = alias));
    this.queryBuilder.innerJoinAndSelect(target, alias, condition, parameters);
    return this;
  }
  innerJoinAndSelect<T, A>(
    target: new () => T,
    alias: LinqAliasKeyType<A>,
    expression: ExpressionInferType<
      boolean,
      TInferType & LinqAliasInferType<A, T>
    >,
    params?: ObjectLiteral,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>> {
    const condition = this.parseExpression(
      expression,
      target.name,
      alias || target.name,
    );
    this.queryBuilder.innerJoinAndSelect(
      target,
      alias || target.name,
      condition,
      params,
    );
    return this;
  }
  baseSubQueryLeftJoinAndSelect<T, A>(
    subQueryFactory: (qb: SelectQueryBuilder<T>) => SelectQueryBuilder<T>,
    alias: LinqAliasKeyType<A>,
    condition?: string,
    parameters?: ObjectLiteral,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>> {
    this.queryBuilder.leftJoinAndSelect(
      subQueryFactory,
      alias,
      condition,
      parameters,
    );
    return this;
  }
  baseSubQueryInnerJoinAndSelect<T, A>(
    subQueryFactory: (qb: SelectQueryBuilder<T>) => SelectQueryBuilder<T>,
    alias: LinqAliasKeyType<A>,
    condition?: string,
    parameters?: ObjectLiteral,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>> {
    this.queryBuilder.innerJoinAndSelect(
      subQueryFactory,
      alias,
      condition,
      parameters,
    );

    return this;
  }
  leftJoinAndMapMany<T, A>(
    mapExpression: string | ExpressionInferType<any, TEntity>,
    entity: { new (): T },
    alias: LinqAliasKeyType<A>,
    condition:
      | string
      | ExpressionInferType<boolean, TInferType & LinqAliasInferType<A, T>>,
    params?: ObjectLiteral,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>> {
    const mapCondition = this.parseExpression(
      mapExpression,
      entity.name,
      alias || entity.name,
    );
    const conditionStr = this.parseExpression(
      condition,
      entity.name,
      alias || entity.name,
    );
    this.queryBuilder.leftJoinAndMapMany(
      mapCondition.replace(/"/g, ''),
      entity,
      alias || entity.name,
      conditionStr,
      params,
    );
    return this;
  }
  leftJoinAndMapOne<T, A>(
    mapOneExpression: ExpressionInferType<any, TEntity> | string,
    entity: { new (): T },
    alias: LinqAliasKeyType<A>,
    condition:
      | string
      | ExpressionInferType<boolean, TInferType & LinqAliasInferType<A, T>>,
    params?: ObjectLiteral,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>> {
    const conditionStr = this.parseExpression(
      condition,
      entity.name,
      alias || entity.name,
    );
    const mapCondition = this.parseExpression(
      mapOneExpression,
      entity.name,
      alias || entity.name,
    );
    // mapCondition = mapCondition.toString().replaceAll('"', '');
    this.queryBuilder.leftJoinAndMapOne(
      mapCondition.replace(/"/g, ''),
      entity,
      alias || entity.name,
      conditionStr,
      params,
    );
    return this;
  }
  from<T, A extends string>(
    entityTarget: (
      qb: LinqInferQueryBuilder<T, TInferType>,
    ) => LinqInferQueryBuilder<T, TInferType>,
    aliasName: LinqAliasKeyType<A>,
  ): LinqInferQueryBuilder<TEntity, TInferType & LinqAliasInferType<A, T>>;
  from<T, A extends string>(
    entityTarget: { new (): T },
    aliasName: LinqAliasKeyType<A>,
  ): LinqInferQueryBuilder<T, TInferType & LinqAliasInferType<A, T>>;
  // linqFrom<A>(
  //   entityTarget: string,
  //   aliasName: LinqAliasKeyType<A>,
  // ): LinqInferQueryBuilder<
  //   TEntity,
  //   TInferType & LinqAliasInferType<A, TEntity>
  // >;
  from<T, A extends string>(
    entityTarget:
      | { new (): T }
      | ((
          qb: LinqInferQueryBuilder<T, TInferType>,
        ) => LinqInferQueryBuilder<T, TInferType>),
    aliasName: A,
  ) {
    // if (typeof entityTarget == 'string') {
    //   this.queryBuilder.from(`(${entityTarget})`, aliasName);
    // } else
    if (this.queryBuilder.connection.hasMetadata(entityTarget)) {
      this.metaData
        .filter((o) => o.name == entityTarget.name)
        .forEach(
          (o) =>
            !o.aliasNames.includes(aliasName) && o.aliasNames.push(aliasName),
        );
      this.queryBuilder.from(entityTarget, aliasName);
    } else {
      const subQuery = entityTarget.call(
        this,
        new LinqInferQueryBuilder(this.dataSource).create(),
      );
      this.queryBuilder
        .from(`(${subQuery.getQueryBuilder().getQuery()})`, aliasName)
        .setParameters(subQuery.getQueryBuilder().getParameters());
    }
    return this;
  }
  // support Brackets whereexpression
  castLinqWhereExpress(whereExpression: WhereExpressionBuilder) {
    // return this.castLinqWhereExpress(whereExpression);
    this.queryBuilder = <any>whereExpression; //WhereExpression根据源码就是SelectQueryBuild
    return <ILinqWhereExpression<TEntity>>this;
  }
  getQueryBuilder() {
    return this.queryBuilder;
  }
  where(
    expression: ExpressionInferType<boolean, TInferType> | string | Brackets,
    params?: ObjectLiteral,
    replacer?: VerReplacer[],
  ) {
    if (expression instanceof Brackets) {
      this.queryBuilder.where(expression, params);
    } else {
      let condition = this.parseExpression(expression);
      if (params && replacer && typeof condition == 'string') {
        replacer.forEach((o) => {
          if (params[o.new]) {
            condition = (<string>condition).replace(
              new RegExp(`:${o.original}`, 'g'),
              `:${o.new}`,
            );
          }
        });
      }
      this.queryBuilder.where(condition, params);
    }
    return this;
  }
  andWhere(
    expression: ExpressionInferType<boolean, TInferType> | string | Brackets,
    params?: ObjectLiteral,
    replacer?: VerReplacer[],
  ) {
    if (expression instanceof Brackets) {
      this.queryBuilder.andWhere(expression, params);
    } else {
      let condition = this.parseExpression(expression);
      if (params && replacer && typeof condition == 'string') {
        replacer.forEach((o) => {
          if (params[o.new]) {
            condition = (<string>condition).replace(
              new RegExp(`:${o.original}`, 'g'),
              `:${o.new}`,
            );
          }
        });
      }
      this.queryBuilder.andWhere(condition, params);
    }

    return this;
  }
  orWhere(
    expression: ExpressionInferType<boolean, TInferType> | string | Brackets,
    params?: ObjectLiteral,
    replacer?: VerReplacer[],
  ) {
    if (expression instanceof Brackets) {
      this.queryBuilder.orWhere(expression, params);
    } else {
      let condition = this.parseExpression(expression);
      if (params && replacer && typeof condition == 'string') {
        replacer.forEach((o) => {
          if (params[o.new]) {
            condition = (<string>condition).replace(
              new RegExp(`:${o.original}`, 'g'),
              `:${o.new}`,
            );
          }
        });
      }
      this.queryBuilder.orWhere(condition, params);
    }
    return this;
  }
  /**
   *
   * @param expression
   * @param params typeorm order by不支持参数，暂时也不支持，对于是否支持o=>o.Id*3 待验证 理论应该可以支持
   * @param collate 当为cn时，按照Chinese_PRC_CS_AS_KS_WS编码排序
   */
  orderBy(
    expression: ExpressionInferType<any, TInferType>,
    order?: 'ASC' | 'DESC',
    nulls?: 'NULLS FIRST' | 'NULLS LAST',
    collate?: 'en' | 'cn',
  ) {
    let condition = this.parseExpression(expression);
    condition = this.generateOrderBy(condition, collate);
    //typeorm 不让用null，只能undefined
    if (!nulls) {
      nulls = undefined;
    }
    this.queryBuilder.orderBy(condition, order, nulls);
    return this;
  }
  /**
   *
   * @param expression
   * @param collate 当为cn时，按照Chinese_PRC_CS_AS_KS_WS编码排序
   */
  baseOrderBy(
    condition: string,
    order?: 'ASC' | 'DESC',
    nulls?: 'NULLS FIRST' | 'NULLS LAST',
    collate?: 'en' | 'cn',
  ) {
    condition = this.generateOrderBy(condition, collate);
    //typeorm 不让用null，只能undefined
    if (!nulls) {
      nulls = undefined;
    }
    this.queryBuilder.orderBy(condition, order, nulls);
    return this;
  }
  /**
   *
   * @param expression
   * @param params typeorm order by不支持参数，暂时也不支持，对于是否支持o=>o.Id*3 待验证 理论应该可以支持
   * @param collate 当为cn时，按照Chinese_PRC_CS_AS_KS_WS编码排序
   */
  addOrderBy(
    expression: ExpressionInferType<any, TInferType>,
    order?: 'ASC' | 'DESC',
    nulls?: 'NULLS FIRST' | 'NULLS LAST',
    collate?: 'en' | 'cn',
  ) {
    let condition = this.parseExpression(expression);
    condition = this.generateOrderBy(condition, collate);
    //typeorm 不让用null，只能undefined
    if (!nulls) {
      nulls = undefined;
    }
    this.queryBuilder.addOrderBy(condition, order, nulls);
    return this;
  }
  /**
   *
   * @param expression
   * @param collate 当为cn时，按照Chinese_PRC_CS_AS_KS_WS编码排序
   */
  baseAddOrderBy(
    condition: string,
    order?: 'ASC' | 'DESC',
    nulls?: 'NULLS FIRST' | 'NULLS LAST',
    collate?: 'en' | 'cn',
  ) {
    condition = this.generateOrderBy(condition, collate);
    //typeorm 不让用null，只能undefined
    if (!nulls) {
      nulls = undefined;
    }
    this.queryBuilder.addOrderBy(condition, order, nulls);
    return this;
  }
  /**
   *
   * @description 不建议参数传空全字段查询
   */
  select(expression?: ExpressionInferType<void, TInferType>) {
    if (expression) {
      const condition = this.parseExpression(expression);
      this.queryBuilder.select(condition);
    } else {
      this.queryBuilder.expressionMap.selects =
        this.queryBuilder.expressionMap.aliases.map((o) => {
          return {
            selection: o.name,
          };
        });
    }
    this.isSelect = false;
    return this;
  }
  addSelect(expression: ExpressionInferType<void, TInferType>) {
    if (this.isSelect) {
      return this.select(expression);
    } else {
      const condition = this.parseExpression(expression);
      this.queryBuilder.addSelect(condition);
      return this;
    }
  }
  distinct(distinct?: boolean) {
    this.queryBuilder.distinct(distinct);
    return this;
  }
  /**
   * 感觉对于多表查询用处不大，不做处理
   * Sets the distinct on clause for Postgres.
   * @param distinctOn
   */
  distinctOn(...expression: Array<ExpressionInferType<void, TInferType>>) {
    const conditions: string[] = [];
    expression.forEach((o) => {
      const condition = this.parseExpression(o);
      conditions.push(condition);
    });
    this.queryBuilder.distinctOn(conditions);
    return this;
  }
  /**
   * 只用支持entity=>entity.Name即可
   */
  groupBy(expression: ExpressionInferType<any, TInferType>) {
    const condition = this.parseExpression(expression);
    this.queryBuilder.groupBy(condition);
    return this;
  }
  /**
   * 只用支持entity=>entity.Name即可
   */
  addGroupBy(expression: ExpressionInferType<any, TInferType>) {
    const condition = this.parseExpression(expression);
    this.queryBuilder.addGroupBy(condition);
    return this;
  }
  /**
   * 只用支持entity=>entity.Name 和 entity=>AggregateFunc(entity.name+entiy.name2) 和 entity=>AggregateFunc(entity.name)
   * @param having
   * @param parameters
   */
  having(
    expression: ExpressionInferType<any, TInferType>,
    parameters?: ObjectLiteral,
  ) {
    const condition = this.parseExpression(expression);
    this.queryBuilder.having(condition, parameters);
    return this;
  }
  andHaving(
    expression: ExpressionInferType<any, TInferType>,
    parameters?: ObjectLiteral,
  ) {
    const condition = this.parseExpression(expression);
    this.queryBuilder.andHaving(condition, parameters);
    return this;
  }
  /**
   * 只用支持entity=>entity.Name 和 entity=>AggregateFunc(entity.name+entiy.name2) 和 entity=>AggregateFunc(entity.name)
   * @param having
   * @param parameters
   */
  //orHaving
  orHaving(
    expression: ExpressionInferType<any, TInferType>,
    parameters?: ObjectLiteral,
  ) {
    const condition = this.parseExpression(expression);
    this.queryBuilder.orHaving(condition, parameters);
    return this;
  }
  offset(offset?: number) {
    this.queryBuilder.offset(offset);
    return this;
  }
  limit(limit?: number) {
    this.queryBuilder.limit(limit);
    return this;
  }
  take(take?: number) {
    this.queryBuilder.take(take);
    return this;
  }
  skip(skip?: number) {
    this.queryBuilder.skip(skip);
    return this;
  }
  withNoLock() {
    this.queryBuilder.setLock('dirty_read');
    return this;
  }
  toSql() {
    return this.queryBuilder.getQueryAndParameters();
  }
  getMany() {
    return this.queryBuilder.clone().getMany();
  }
  getManyAndCount() {
    return this.queryBuilder.clone().getManyAndCount();
  }
  getRawMany<T>() {
    return this.queryBuilder.clone().getRawMany<T>();
  }
  getOne() {
    return this.queryBuilder.clone().limit(1).getOne();
  }
  getRawOne<T>() {
    return this.queryBuilder.clone().limit(1).getRawOne<T>();
  }
  count() {
    return this.queryBuilder.clone().clone().getCount();
  }
  async transaction<TEntity, TResult>(
    target: { new (): TEntity },
    alias: string,
    transactionFunc: (
      entityManager: EntityManager,
      queryBuilder?: LinqInferQueryBuilder<TEntity, TInferType>,
    ) => Promise<TResult>,
  ) {
    return await this.queryBuilder.connection.transaction<TResult>(
      async (entityManager) => {
        const linqQueryBuilder = new LinqInferQueryBuilder<TEntity, TInferType>(
          entityManager.connection,
        ).create(target, alias);
        return await transactionFunc(entityManager, linqQueryBuilder);
      },
    );
  }
  async noDistinctCnt() {
    const result = await this.queryBuilder
      .clone()
      .select('count(1)', 'cnt')
      .getRawOne<{ cnt: string }>();
    return Number.parseInt(result?.cnt || '0');
  }
  async noDistinctOverCnt() {
    const count = await this.queryBuilder
      .clone()
      .select('count(1) over()', 'cnt')
      .limit(1)
      .getRawOne<{ cnt: string }>();
    return Number.parseInt(count?.cnt || '0');
  }
  protected parseExpression(
    expression: Function | string,
    entityName?: string,
    alias?: string,
  ): string;
  protected parseExpression(
    expression: Brackets,
    entityName?: string,
    alias?: string,
  ): Brackets;
  protected parseExpression(
    expression: Function | string | Brackets,
    entityName?: string,
    alias?: string,
  ) {
    const self = this;
    return self.parseExpressionForTuple(
      expression,
      entityName,
      alias,
      (expressionStr) => {
        return expressionStr
          .toString()
          .replace(/\r\n[\s]+/g, '') //去除（和{之间可能存在空格
          .replace(/\([{]/, '(')
          .replace(/[}]\)/, ')');
      },
    );
  }
  /**
   * 解析tuple params 的表达式 eg:(...param)=>any param is entity object
   * @param expression
   * @param entityName
   * @param alias
   * @param expressionReplacer 兼容类型推导逻辑，如果有值就用此函数进行二次处理
   * @returns
   */
  private parseExpressionForTuple(
    expression: Function | string | Brackets,
    entityName?: string,
    alias?: string,
    expressionReplacer?: (expressionStr: string) => string,
  ) {
    //删除换行回车和空格影响
    // let expressionOriginalStr;
    entityName &&
      alias &&
      this.metaData
        .filter((o) => o.name == entityName)
        .forEach(
          (o) => !o.aliasNames.includes(alias) && o.aliasNames.push(alias),
        );
    if (typeof expression == 'string') {
      return expression;
    } else if (expression instanceof Brackets) {
      return expression;
    } else {
      let expressionOriginalStr = expression.toString();
      if (expressionReplacer instanceof Function) {
        expressionOriginalStr = expressionReplacer(expressionOriginalStr);
      }
      const expressKey = expressionOriginalStr.replace(/\r\n[\s]+/g, '');

      //优先从缓存里获取
      if (!ExpressionCache.getByKey(expressKey)) {
        const expressionStr = <ArrowFunctionExpression>(
          (<any>acornParse(expressionOriginalStr, { ecmaVersion: 'latest' }))
            .body[0].expression
        );
        const parseResult = new ArrowFunctionExpression(
          expressionStr,
          this.metaData,
        );
        ConfigUtil.update({
          dbType: this.dataSource.options.type,
        });
        const condition = parseResult.toString();
        ExpressionCache.set(expressKey, condition);
      }
      return ExpressionCache.getByKey(expressKey);
    }
  }
  private generateOrderBy(condition: string, collate?: 'en' | 'cn') {
    if (collate == 'cn') {
      switch (this.queryBuilder.connection.options.type) {
        case 'postgres':
          condition = `convert_to(${condition}, 'UTF8')`; //" collate Chinese_PRC_CS_AS_KS_WS";
          break;
        case 'mssql':
          condition = `${condition} collate chinese_prc_cs_as_ks_ws`;
      }
    }
    return condition;
  }
}

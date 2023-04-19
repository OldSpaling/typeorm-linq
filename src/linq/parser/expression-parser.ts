import { SourceLocation } from 'acorn';
import { ConfigUtil } from '../config/config';
import { MetadataType } from '../linq-infer-query-builder';
import { SqlIdentityMapping } from './sql-identity-mapping';
/***
 * 所有expression 都带有表达式的参数列表，便于识别
 */
export class Expression {
  parentNodeType?: ExpressionType;
  name?: string;
  type: string;
  start: number;
  end: number;
  loc?: SourceLocation;
  sourceFile?: string;
  range?: [number, number];
  /**
   * 箭头函数参数列表
   */
  params?: Expression[];
  entityMetadata: MetadataType;
  constructor(
    node: any,
    entityMetadata: MetadataType,
    params?: Expression[],
    parentNodeType?: ExpressionType,
  ) {
    this.name = node.name;
    this.type = node.type;
    this.start = node.start;
    this.end = node.end;
    this.loc = node.loc;
    this.sourceFile = node.sourceFile;
    this.range = node.range;
    this.params = params;
    this.entityMetadata = entityMetadata;
    this.parentNodeType = parentNodeType;
  }
  toString() {
    return '';
  }
  createInstance(
    node: any,
    entityMetadata: MetadataType,
    params?: Expression[],
    parentNodeType?: ExpressionType,
  ):Expression {
    switch (node.type) {
      case ExpressionType.ArrowFunctionExpression:
        return new ArrowFunctionExpression(node, entityMetadata);
      case ExpressionType.BinaryExpression:
        return new BinaryExpression(node, entityMetadata, params);;
      case ExpressionType.CallExpression:
        return new CallExpression(node, entityMetadata, params, parentNodeType);
      case ExpressionType.LogicalExpression:
        return new LogicalExpression(node, entityMetadata, params);
      case ExpressionType.IdentifierExpression:
        return new IdentityExpression(node, entityMetadata, params);
      case ExpressionType.MemberExpression:
        return new MemberExpression(node, entityMetadata, params);
      case ExpressionType.BlockStatementExpression:
        return new BlockStatementExpression(node, entityMetadata, params);
      case ExpressionType.LabeldStatementExpression:
        return new LabeldStatementExpression(node, entityMetadata, params);
      case ExpressionType.ExpressionStatementExpression:
        return new ExpressionStatementExpression(node, entityMetadata, params);
      case ExpressionType.LiteralExpression:
        return new LiteralExpression(node, entityMetadata, params);
      case ExpressionType.UnaryExpression:
        return new UnaryExpression(node, entityMetadata, params);
      default:
        throw new Error(`not support ${node.type} expression`);
    }
  }
}
/**
 * (a,b)=>a==b a,b为IdentityExpression a,b是不是参数没有关系
 * 对于typeorm，传进来的参数只能是entity的类型，不存在这种类型
 * 故只用考虑外部参数即可
 */
export class IdentityExpression extends Expression {
  value: number;
  constructor(node: any, entityMetadata: MetadataType, params?: Expression[]) {
    super(node, entityMetadata, params);
    this.type = 'Identifier';
    this.value = node.value;
  }
  toString() {
    return `:${this.name}`;
  }
}
/**
 * 参数命名：array[i]-->arrayi sr-->sr
 */
export class ArrowFunctionExpression extends Expression {
  id?: string;
  expression?: boolean;
  generator?: boolean;
  async?: boolean;
  body: Expression;
  constructor(node: any, entityMetadata: MetadataType) {
    super(node, entityMetadata, node.params);
    this.type = 'ArrowFunctionExpression';
    this.id = node.id;
    this.expression = node.expression;
    this.generator = node.generator;
    this.async = node.async;
    this.body = this.createInstance(node.body, entityMetadata, node.params);
  }
  toString() {
    return this.body.toString();
  }
}
/**
 * o=>o&&1
 * operator是||需要添加括号
 */
export class LogicalExpression extends Expression {
  left: Expression;
  operator: string;
  right: Expression;
  constructor(node: any, entityMetadata: MetadataType, params?: Expression[]) {
    super(node, entityMetadata, params);
    this.type = 'LogicalExpression';
    this.left = this.createInstance(node.left, entityMetadata, params);
    this.operator = node.operator;
    this.right = this.createInstance(node.right, entityMetadata, params);
  }
  toString() {
    // ||需要手动添加括号包括，现在处理方式是无论是否是|| 全部用括号包括，
    return ` (${this.left.toString()}${
      OperatorConvertMapping.currentConvert[this.operator]
    }${this.right.toString()}) `;
  }
}
/**
 * o=>[].includes(o)  箭头函数后面即为CallExpresssion
 * callee:[]和includes
 * arguments:o
 * 以下情况最好根据参数化传递参数类型判断类型，但也可以采用命名规则的方式进行约束判断
 * eg：Array-->xxxArray string--->xxxString
 * Array.includes-->in
 * string.includes-->like 暂时不用支持，基本用不到
 * 对于a.b callee里会多一层memberexpression,
 */
export class CallExpression extends Expression {
  callee: MemberExpression;
  arguments!: Expression[];
  parentNodeType?: ExpressionType;
  constructor(
    node: any,
    entityMetadata: MetadataType,
    params?: Expression[],
    parentNodeType?: ExpressionType,
  ) {
    super(node, entityMetadata, params, parentNodeType);
    this.type = ExpressionType.CallExpression;
    this.callee = <typeof this.callee>this.createInstance(node.callee, entityMetadata, params);
    if (node.arguments) {
      this.arguments = (<[]>node.arguments).map((o) =>
        this.createInstance(o, entityMetadata, params),
      );
    }
  }
  toString() {
    //此种类型不能用MemberExpression的toString进行获取，代码和sql脚本顺序相反
    if (this.callee.object?.name?.endsWith('Array')) {
      if (this.callee.property?.name === 'includes') {
        //当前只考虑!运算符
        if (this.parentNodeType == ExpressionType.UnaryExpression) {
          return `${this.arguments[0].toString()} not in (:...${
            this.callee.object.name
          })`;
        }
        return `${this.arguments[0].toString()} in (:...${
          this.callee.object.name
        })`;
      }
    } else {
      //entity.someColumn.includes somevalue
      if (
        this.callee.property.name === 'includes' ||
        this.callee.property.name === 'startsWith' ||
        this.callee.property.name === 'endsWith'
      ) {
        const dbType = <'mssql'>ConfigUtil.get('dbType');
        //this.callee.object MemberExpression
        if (this.parentNodeType == ExpressionType.UnaryExpression) {
          return `${this.callee.object.toString()} not ${
            SqlKeyMapping.like[dbType || 'mssql']
          } ${this.arguments[0].toString()}`;
        }
        return `${this.callee.object.toString()} ${
          SqlKeyMapping.like[dbType || 'mssql']
        } ${this.arguments[0].toString()} ${
          SqlKeyMapping.escape[dbType || 'mssql'] || ''
        }`;
      }
      //聚合函数处理 此处没有指定别名，暂时不能支持select 里使用，需要在ArrowFunc上再虚拟一层，区分不同的 或者在基类里添加操作类型 eg:select where and so on
      if (this.callee.object.name === ExpressionAggregateFunc.name) {
        if (this.callee.property.name === ExpressionAggregateFunc.cast.name) {
          const convertTypeName = (<LiteralExpression>this.arguments[1]).value;
          //fix mssql no mapping:
          //mark:多库支持去掉
          // const { type } = DBMappingSet.mapping[convertTypeName]({
          //   type: convertTypeName,
          // });
          return ` ${
            this.callee.property.name
          }(${this.arguments[0].toString()} as ${convertTypeName}) `;
        } else if (
          this.callee.property.name === ExpressionAggregateFunc.subQuery.name
        ) {
          //直接tostring会将sql片段转为字符串变量 a-->'a'
          return (<LiteralExpression>this.arguments[0]).value.toString();
        } else {
          //支持函数传递多个参数情况
          const argusStr = this.arguments.map((o) => o.toString()).join(',');
          return ` ${ExpressionAggregateFunc[
            this.callee.property.name!
          ]()}(${argusStr}) `;
        }
      }
    }
  }
}
/**
 * (a,b)=>a.Id==b.Id
 * a.Id 和b.Id ,array[i] 无论是否是参数都是此类型
 * entity.Id-->entityId
 * param.Id-->:paramId
 */
export class MemberExpression extends Expression {
  object: Expression;
  property: IdentityExpression;
  computed?: boolean;
  constructor(node: any, entityMetadata: MetadataType, params?: Expression[]) {
    super(node, entityMetadata, params);
    this.type = 'MemberExpression';
    this.object = this.createInstance(node.object, entityMetadata, params);
    this.property = <typeof this.property>this.createInstance(node.property, entityMetadata, params);
    this.computed = node.computed;
    if (this.object && this.object instanceof MemberExpression) {
      //聚合函数处理 name修正
      if (this.object.property.name === ExpressionAggregateFunc.name) {
        this.object.name = ExpressionAggregateFunc.name;
      } else if (!this.object.name) {
        //此处不会调用tostring，一般用于 eg:a.b.includes
        this.object.name = `${this.object.object?.name}.${this.object.property?.name}`;
      }
    }
    //根据typeorm实体映射属性名字到数据库名
    if (
      this.params?.some((o) => o.name == this.object.name) &&
      this.object?.name
    ) {
      const entityMetadata = this.entityMetadata.find((o) =>
        o.aliasNames.includes(this.object.name!),
      );
      const columnName = entityMetadata?.columns.find(
        (o) => o.propertyName === this.property.name,
      )?.databaseName;
      if (columnName) {
        this.property.name = columnName;
      }
    }
  }
  toString() {
    //a.Id情况并且是参数
    if (this.params?.some((o) => o.name == this.object.name)) {
      return `"${this.object.name}"."${SqlIdentityMapping.getColumnName(
        this.property.name!,
      )}"`;
    } else {
      //不是列表参数和外部数组参数
      //eg a.Id-->:aId a[0]-->:a0
      return `:${this.object.name}${this.property.name || this.property.value}`;
    }
  }
}
/**
 * eg a==b
 */
export class BinaryExpression extends Expression {
  left: Expression;
  operator: string;
  right: Expression;
  constructor(node: any, entityMetadata: MetadataType, params?: Expression[]) {
    super(node, entityMetadata, params);
    this.type = 'BinaryExpression';
    this.left = this.createInstance(node.left, entityMetadata, params);
    this.operator = node.operator;
    this.right = this.createInstance(node.right, entityMetadata, params);
  }
  toString() {
    if (this.right instanceof LiteralExpression) {
      if (this.right.value === null || this.right.value === undefined) {
        if (this.operator === '!=' || this.operator === '!==') {
          // return `${this.left.toString()} is not null`;
        } else {
          return `${this.left.toString()} is null`;
        }
      } else if (this.right.value === true || this.right.value === false) {
        const convert = OperatorConvertMapping.currentConvert;
        return `${this.left.toString()}${
          convert[this.operator] ?? this.operator
        }${convert[this.right.value.toString()]}`;
      }
    }

    return `${this.left.toString()}${
      OperatorConvertMapping.currentConvert[this.operator] ?? this.operator
    }${this.right.toString()}`;
  }
}
/**
 * 一元运算符 eg:!test.isdeleted,!string.includes(string),!array.includes(entity.col)
 * operator: eg:!
 */
export class UnaryExpression extends Expression {
  // operator: string;
  argument: MemberExpression | CallExpression;
  constructor(
    node: any,
    entityMetadata: MetadataType,
    params?: Expression[],
    parentNodeType?: ExpressionType,
  ) {
    super(node, entityMetadata, params, parentNodeType);
    this.type = ExpressionType.UnaryExpression;
    this.argument = <typeof this.argument>this.createInstance(
      node.argument,
      entityMetadata,
      params,
      ExpressionType.UnaryExpression,
    );
  }
  toString() {
    //eg:!a.isdeleted
    if (this.argument instanceof MemberExpression) {
      const convert = OperatorConvertMapping.currentConvert;
      return this.argument.toString() + ' =' + convert['false'];
    } else {
      return this.argument.toString();
    }
  }
}
/**
 * 对象解析,用于select(o=>{a:o.name})
 */
export class BlockStatementExpression extends Expression {
  body!: LabeldStatementExpression[];
  constructor(node: any, entityMetadata: MetadataType, params?: Expression[]) {
    super(node, entityMetadata, params);
    this.type = ExpressionType.BlockStatementExpression;
    if (Array.isArray(node.body)) {
      this.body = [];
      (<[]>node.body).forEach((o) => {
        this.body.push(<LabeldStatementExpression>this.createInstance(o, entityMetadata, params));
      });
    }
  }
  toString() {
    return this.body.map((o) => o.toString()).join(',');
  }
}
/**
 * 对象每个属性解析，给属性赋值的话会有BinaryExpression,没有计算赋值是memberExpression
 */
export class LabeldStatementExpression extends Expression {
  label: IdentityExpression;
  body: ExpressionStatementExpression;
  constructor(node: any, entityMetadata: MetadataType, params?: Expression[]) {
    super(node, entityMetadata, params);
    this.type = ExpressionType.LabeldStatementExpression;
    this.label = <typeof this.label>this.createInstance(node.label, entityMetadata, params);
    this.body = <typeof this.body>this.createInstance(node.body, entityMetadata, params);
  }
  toString() {
    // eg mssql entity.name name会报错 修正为entity.name "name"
    return ` ${this.body.toString()} "${this.label.name}"`;
  }
}
export class ExpressionStatementExpression extends Expression {
  expression: BinaryExpression | MemberExpression; //暂时只考虑a+b 和a的情况，
  constructor(node: any, entityMetadata: MetadataType, params?: Expression[]) {
    super(node, entityMetadata, params);
    this.type = ExpressionType.ExpressionStatementExpression;
    this.expression = <typeof this.expression>this.createInstance(
      node.expression,
      entityMetadata,
      params,
    );
  }
  toString() {
    return this.expression.toString();
  }
}
/**
 * 常量解析
 */
export class LiteralExpression extends Expression {
  value: any;
  raw: string;
  constructor(node: any, entityMetadata: MetadataType, params?: Expression[]) {
    super(node, entityMetadata, params);
    this.type = ExpressionType.LiteralExpression;
    this.value = node.value;
    this.raw = node.raw;
  }
  toString() {
    return `'${this.value ?? ''}'`;
  }
}
//#region operator convert
/**
 * 只用处理不同的操作符即可，相同的不做转化,基于mssql做出映射
 */
export class OperatorConvert {
  [key: string]: any;
}
export class MSSQLOperatorConvert extends OperatorConvert {
  '==' = '=';
  '===' = '=';
  '!==' = '<>';
  '!=' = '<>';
  '||' = ' or ';
  '&&' = ' and ';
  'true' = '1';
  'false' = '0';
  like = (value: string) => `%${value}%`;
  startWith = (value: string) => `${value}%`;
  endWith = (value: string) => `%${value}`;
}
export class PostgresOperatorConvert extends OperatorConvert {
  '==' = '=';
  '===' = '=';
  '!==' = '<>';
  '!=' = '<>';
  '||' = ' or ';
  '&&' = ' and ';
  '+' = '||';
  'true' = 'true';
  'false' = 'false';
  like = (value: string) => {
    const dbType = <'postgres'>ConfigUtil.get('dbType');
    const escapeChar = SqlKeyMapping.escapeChar[dbType || 'mssql'] || '';
    const newValue = value.replace(/([_%])/, `${escapeChar}$1`);
    return `%${newValue}%`;
  };
  startWith = (value: string) => `${value}%`;
  endWith = (value: string) => `%${value}`;
  ilike = (value: string) => {
    const dbType = <'postgres'>ConfigUtil.get('dbType');
    const escapeChar = SqlKeyMapping.escapeChar[dbType || 'mssql'] || '';
    const newValue = value.replace(/([_%])/, `${escapeChar}$1`);
    return `%${newValue}%`;
  };
}
/**

 * 以mssql为基准 sql关键字映射

 */

export const SqlKeyMapping = {
  like: {
    mssql: 'like',

    postgres: 'ilike',
  },
  escapeChar: {
    mssql: '/',
    postgres: '/',
  },
  escape: {
    mssql: `escape '/'`,

    postgres: `escape '/'`,
  },
};
/**
 * prop is DATABASE_TYPE
 */
export class OperatorConvertMapping {
  static get currentConvert(): OperatorConvert {
    const dbType = ConfigUtil.get('dbType');
    switch (dbType) {
      case 'postgres':
        return new PostgresOperatorConvert();
      case 'mssql':
        return new MSSQLOperatorConvert();
      default:
        throw new Error(`UnSupport database ${dbType}`);
    }
  }
}
//#endregion
export enum ExpressionType {
  BinaryExpression = 'BinaryExpression',
  MemberExpression = 'MemberExpression',
  CallExpression = 'CallExpression',
  LogicalExpression = 'LogicalExpression',
  ArrowFunctionExpression = 'ArrowFunctionExpression',
  IdentifierExpression = 'Identifier',
  BlockStatementExpression = 'BlockStatement',
  LabeldStatementExpression = 'LabeledStatement',
  ExpressionStatementExpression = 'ExpressionStatement',
  LiteralExpression = 'Literal',
  UnaryExpression = 'UnaryExpression',
}
/**返回转换后的sql 聚合函数，返回any 是为了万一在箭头函数参加运算，类型有冲突*/
export class ExpressionAggregateFunc {
  static [key: string]: Function;
  static count(param: any): any {
    return 'count';
  }
  static sum(param: any): any {
    return 'sum';
  }
  static lower(param: any): any {
    return 'lower';
  }
  static upper(param: any): any {
    return 'upper';
  }
  static len(param: any): any {
    const dbType = ConfigUtil.get('dbType');
    switch (dbType) {
      case 'postgres':
        return 'char_length';
      default:
        return 'len';
    }
  }
  static min(param: any): any {
    return 'min';
  }
  static max(param: any): any {
    return 'max';
  }
  /**
   * 只是让ts语法检查通过，并且标记出需要cast聚合函数转化
   * @param value
   * @param type
   */
  static cast(value: any, type: string) {
    switch (type) {
      case 'int':
        return <number>value;
      case 'decimal':
        return <number>value;
      case 'nvarchar':
        return <string>value;
      case 'varchar':
        return <string>value;
    }
  }
  /**
   * 获取第一个非空值
   * @param params
   */
  static isNUll(...params: any[]): any {
    const dbType = ConfigUtil.get('dbType');
    switch (dbType) {
      case 'postgres':
        return 'COALESCE';
      default:
        return 'isnull';
    }
  }
  /**
   * 兼容一些复杂sql的片段,不能支持多数据库，一般不建议使用
   * @param subQuery query片段，
   */
  static subQuery(subQuery: string) {
    return <any>subQuery;
  }

  static left(value: any, index: number): any {
    return 'left';
  }

  static year(value: Date): any {
    return 'year';
  }

  static month(value: Date): any {
    return 'month';
  }
  static charIndex(source: string, target: string): any {
    return 'charIndex';
  }

  /**
   * 根据指定的日期部分（如小时、天或月）截断时间戳表达式或文字
   * @param type 转换的类型
   * @param param 要转换的字段
   */
  static truncateDate(type: any, param: any): any {
    const dbType = ConfigUtil.get('dbType');
    switch (dbType) {
      case 'postgres':
        return 'date_trunc';
      default:
        return 'convert';
    }
  }
}

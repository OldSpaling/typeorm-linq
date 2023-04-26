import { ConfigUtil } from '../config/config';

export class SqlIdentityMapping {
  private static identities = [
    'order',
    'group',
    'by',
    'select',
    'take',
    'skip',
    'offset',
    'limit',
    'where',
    'having',
    'join',
    'union',
    'left',
    'right',
    'cast',
    'when',
    'else',
    'case',
    'max',
    'min',
    'user',
  ];
  // static getColumnName(name: string) {
  //   const lowerName = name.toLowerCase();
  //   if (SqlIdentityMapping.identities.includes(lowerName)) {
  //     return `"${name}"`;
  //   }
  //   return name;
  // }
  /**
   * 对于一些用sql关键字命名的列，需要用特殊符号引起来，才能调用
   * - MSSQL: 用"
   * - POSTGRES:用"
   * - mysql:用`
   */
  static wrapDBField(field: string) {
    const dbType = ConfigUtil.get('dbType');
    switch (dbType) {
      case 'mysql':
        return `\`${field}\``;
      default:
        return `"${field}"`;
    }
  }
}

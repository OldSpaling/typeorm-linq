/**
 * 对于一些用sql关键字命名的列，需要用双引号引起来，才能调用
 * - MSSQL:对于这些列不区分大小写
 * - POSTGRES:对于这些列区分大小写
 */
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
  static getColumnName(name: string) {
    const lowerName = name.toLowerCase();
    if (SqlIdentityMapping.identities.includes(lowerName)) {
      return `"${name}"`;
    }
    return name;
  }
}

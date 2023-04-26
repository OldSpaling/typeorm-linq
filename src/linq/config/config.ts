import { DataSourceOptions } from 'typeorm';
import { ExpressionCache } from '../expression-cache';
import { ExpressionCacheStore, IDefaultStoreOption } from '../store';

export interface IConfig {
  dbType?: Pick<DataSourceOptions, 'type'>['type'];
  cacheStore?: ExpressionCacheStore<IDefaultStoreOption>;
}
export class ConfigUtil {
  private static _config: IConfig;
  private static supportDB = ['mssql', 'postgres','mysql'];
  static set(config: IConfig) {
    if (config.dbType && !ConfigUtil.supportDB.includes(config.dbType)) {
      throw new Error(`not support database ${config.dbType}`);
    }
    ConfigUtil._config = config;
    ExpressionCache.init(config.cacheStore);
  }
  static update(config: Partial<IConfig>) {
    if (config.dbType && !ConfigUtil.supportDB.includes(config.dbType)) {
      throw new Error(`not support database ${config.dbType}`);
    }
    ConfigUtil._config = { ...ConfigUtil._config, ...config };
    ExpressionCache.init(config.cacheStore);
  }
  static get(key: keyof IConfig) {
    return ConfigUtil._config[key];
  }
}
//config 优化
//代码结构调整
//考虑多库的支持

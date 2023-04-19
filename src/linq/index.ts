import { IConfig, ConfigUtil } from './config/config';

export * from './linq-infer-query-builder';
export * from './config/config';
export * from './store/expression-cache-store';
export * from './store/interfaces/default-store-option';
export * from './store/interfaces/file-store-option';
export * from './store/interfaces/memory-store-option';
export function init(config: IConfig) {
  //初始化cache
  ConfigUtil.set(config);
}

import {
  CacheDataType,
  ExpressionCacheStore,
  IDefaultStoreOption,
} from './store';
import { ExpressionCacheMemoryStore } from './store/expression-cache-memory';
export class ExpressionCache {
  private static cacheData: CacheDataType;
  private static cacheStore: ExpressionCacheStore<IDefaultStoreOption> =
    new ExpressionCacheMemoryStore({
      type: 'memory',
      // path: path.resolve(path.join(process.cwd(), 'expression-cache.json')),
      liveHours: 24 * 10, //10d
    });
  static async init(cacheStore?: ExpressionCacheStore<IDefaultStoreOption>) {
    if (cacheStore) {
      ExpressionCache.cacheStore = cacheStore;
    }
    ExpressionCache.cacheData = ExpressionCache.cacheStore.read();
    for (const prop in ExpressionCache.cacheData) {
      const isExpired =
        new Date() > new Date(ExpressionCache.cacheData[prop]?.expiredTime);
      if (isExpired) {
        delete ExpressionCache.cacheData[prop];
      }
    }
    ExpressionCache.cacheStore.write(ExpressionCache.cacheData);
  }
  static getByKey(key: string) {
    return ExpressionCache.cacheData[key]?.value;
  }
  static set(key: string, value: string) {
    //只会存不存在，不可能存在但是值不同情况
    if (!ExpressionCache.cacheData[key]) {
      const now = new Date();
      ExpressionCache.cacheData[key] = {
        value,
        expiredTime: ExpressionCache.cacheStore
          .getOption()
          .liveHours.toString(),
      };
      ExpressionCache.cacheStore.write(ExpressionCache.cacheData);
    }
    return ExpressionCache.cacheData;
  }
}

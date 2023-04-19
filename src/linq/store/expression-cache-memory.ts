import { ExpressionCacheStore } from './expression-cache-store';
import { IMemoryStoreOption } from './interfaces/memory-store-option';
import { CacheDataType } from './models/store-data-model';

export class ExpressionCacheMemoryStore extends ExpressionCacheStore<IMemoryStoreOption> {
  private cacheData: CacheDataType = {};
  constructor(option: IMemoryStoreOption) {
    super(option);
  }
  read() {
    try {
      return { ...this.cacheData };
    } catch (e) {
      return {};
    }
  }
  write(data: CacheDataType) {
    try {
      this.cacheData = data;
    } catch (e) {}
  }
}

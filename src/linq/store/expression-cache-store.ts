import { IDefaultStoreOption } from "./interfaces/default-store-option";
import { CacheDataType } from "./models/store-data-model";

export abstract class ExpressionCacheStore<T extends IDefaultStoreOption> {
    protected option: T;
    constructor(option: T) {
      this.option = option;
    }
    abstract read(): CacheDataType;
    abstract write(data: CacheDataType): void;
    getOption() {
      return { ...this.option };
    }
  }
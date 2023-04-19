import { CacheDataType } from "../models/store-data-model";

export interface IDefaultStoreOption {
    type: string;
    data?: CacheDataType;
    liveHours: number;
  }
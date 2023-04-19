import { IDefaultStoreOption } from "./default-store-option";

export interface IMemoryStoreOption extends IDefaultStoreOption {
    type: 'memory';
  }
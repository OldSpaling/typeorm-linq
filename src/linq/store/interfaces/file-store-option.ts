import { IDefaultStoreOption } from "./default-store-option";

export interface IFileStoreOption extends IDefaultStoreOption {
    type: 'file';
    path: string;
  }
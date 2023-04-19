import { ExpressionCacheStore } from './expression-cache-store';
import { IFileStoreOption } from './interfaces/file-store-option';
import { CacheDataType } from './models/store-data-model';
import fs from 'fs';

export class ExpressionCacheFileStore extends ExpressionCacheStore<IFileStoreOption> {
  constructor(option: IFileStoreOption) {
    super(option);
  }
  read() {
    try {
      const data = fs.readFileSync(this.option.path, {
        encoding: 'utf8',
      });
      return <CacheDataType>JSON.parse(data || '{}');
    } catch (e) {
      return {};
    }
  }
  write(data: CacheDataType) {
    try {
      fs.writeFileSync(this.option.path, JSON.stringify(data, null, '\t'), {
        encoding: 'utf8',
      });
    } catch (e) {}
  }
}

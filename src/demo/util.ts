import { DataSource, SimpleConsoleLogger } from 'typeorm';
import path from 'path';
import * as entityObj from './entities/mysql';
const entities = Object.keys(entityObj).map((o) => entityObj[o]);
export function createConn() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '1qaz2wsxE',
    // schema: 'sakila',
    database: 'sakila',
    synchronize: false,
    logging: true,
    logger: 'debug',
    entities: [...entities],
  });
  return dataSource;
}

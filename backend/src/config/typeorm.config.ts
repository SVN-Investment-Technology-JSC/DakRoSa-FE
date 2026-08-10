import 'dotenv/config';
import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const typeOrmDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'workflowengine',
  password: process.env.DB_PASSWORD ?? 'workflowengine',
  database: process.env.DB_DATABASE ?? 'workflowengine',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
};

export default registerAs('typeorm', () => typeOrmDataSourceOptions);

export const AppDataSource = new DataSource(typeOrmDataSourceOptions);

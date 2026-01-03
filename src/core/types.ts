import { PoolClient } from 'pg';

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface QueryOptions {
  client?: PoolClient;
}

export interface WhereCondition {
  [key: string]: any;
}

export interface OrderBy {
  column: string;
  direction?: 'ASC' | 'DESC';
}

export interface SelectOptions {
  where?: WhereCondition;
  orderBy?: OrderBy | OrderBy[];
  limit?: number;
  offset?: number;
  client?: PoolClient;
}

export interface UpdateOptions {
  where?: WhereCondition;
  client?: PoolClient;
}

export interface DeleteOptions {
  where?: WhereCondition;
  client?: PoolClient;
}

export type PrimaryKeyType = 'serial' | 'uuid';


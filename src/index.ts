// Main library exports - re-export from core
export {
  Database,
  Model,
  QueryBuilder,
  Transaction,
  transaction,
} from './core';

export * from './core/types';

import { Database } from './core';
import { DatabaseConfig } from './core/types';

// Convenience function to initialize database
export function connect(config: DatabaseConfig): void {
  const database = Database.getInstance();
  database.connect(config);
}

// Convenience function to disconnect database
export async function disconnect(): Promise<void> {
  const database = Database.getInstance();
  await database.disconnect();
}

// Convenience function for raw SQL queries
export async function raw(sql: string, params?: any[], client?: any): Promise<any[]> {
  const database = Database.getInstance();
  const result = await database.query(sql, params, client);
  return result.rows;
}

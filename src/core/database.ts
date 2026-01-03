import { Pool, PoolClient } from 'pg';
import { DatabaseConfig } from './types';

export class Database {
  private static instance: Database;
  private pool: Pool | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  connect(config: DatabaseConfig): void {
    if (this.pool) {
      throw new Error('Database already connected');
    }

    this.pool = new Pool({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl || false,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    });
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async query(text: string, params?: any[], client?: PoolClient): Promise<any> {
    const executor = client || this.getPool();
    return executor.query(text, params);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.getPool().connect();
  }
}


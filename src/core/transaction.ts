import { PoolClient } from 'pg';
import { Database } from './database';

export class Transaction {
  private client: PoolClient;
  private committed: boolean = false;
  private rolledBack: boolean = false;

  constructor(client: PoolClient) {
    this.client = client;
  }

  async begin(): Promise<void> {
    await this.client.query('BEGIN');
  }

  async commit(): Promise<void> {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }
    if (this.rolledBack) {
      throw new Error('Transaction already rolled back');
    }
    await this.client.query('COMMIT');
    this.committed = true;
    this.client.release();
  }

  async rollback(): Promise<void> {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }
    if (this.rolledBack) {
      return; // Already rolled back, no-op
    }
    await this.client.query('ROLLBACK');
    this.rolledBack = true;
    this.client.release();
  }

  getClient(): PoolClient {
    return this.client;
  }

  isCommitted(): boolean {
    return this.committed;
  }

  isRolledBack(): boolean {
    return this.rolledBack;
  }
}

export async function transaction<T>(
  callback: (trx: Transaction) => Promise<T>
): Promise<T> {
  const database = Database.getInstance();
  const client = await database.getClient();
  const trx = new Transaction(client);

  try {
    await trx.begin();
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}


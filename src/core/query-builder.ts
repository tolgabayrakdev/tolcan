import { PoolClient } from 'pg';
import { Database } from './database';
import { WhereCondition, OrderBy, PrimaryKeyType } from './types';
import { randomUUID } from 'crypto';

export class QueryBuilder {
  private database: Database;
  private tableName: string;
  private whereConditions: string[] = [];
  private whereParams: any[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';
  private paramCounter: number = 1;
  private client?: PoolClient;
  private primaryKeyType: PrimaryKeyType;
  private primaryKey: string;

  constructor(database: Database, tableName: string, client?: PoolClient, primaryKeyType: PrimaryKeyType = 'serial', primaryKey: string = 'id') {
    this.database = database;
    this.tableName = tableName;
    this.client = client;
    this.primaryKeyType = primaryKeyType;
    this.primaryKey = primaryKey;
  }

  where(condition: WhereCondition | string, value?: any): this {
    if (typeof condition === 'string') {
      this.whereConditions.push(condition);
      if (value !== undefined) {
        this.whereParams.push(value);
      }
    } else {
      for (const [key, val] of Object.entries(condition)) {
        if (val === null || val === undefined) {
          this.whereConditions.push(`${key} IS NULL`);
        } else if (Array.isArray(val)) {
          const placeholders = val.map(() => `$${this.paramCounter++}`).join(', ');
          this.whereConditions.push(`${key} IN (${placeholders})`);
          this.whereParams.push(...val);
        } else {
          this.whereConditions.push(`${key} = $${this.paramCounter++}`);
          this.whereParams.push(val);
        }
      }
    }
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  orderByMultiple(orders: OrderBy[]): this {
    const orderParts = orders.map(order => 
      `${order.column} ${order.direction || 'ASC'}`
    );
    this.orderByClause = `ORDER BY ${orderParts.join(', ')}`;
    return this;
  }

  limit(count: number): this {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  offset(count: number): this {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  private buildWhereClause(): string {
    if (this.whereConditions.length === 0) {
      return '';
    }
    return `WHERE ${this.whereConditions.join(' AND ')}`;
  }

  async select(columns: string[] = ['*']): Promise<any[]> {
    const columnList = columns.join(', ');
    const whereClause = this.buildWhereClause();
    
    let query = `SELECT ${columnList} FROM ${this.tableName}`;
    if (whereClause) query += ` ${whereClause}`;
    if (this.orderByClause) query += ` ${this.orderByClause}`;
    if (this.limitClause) query += ` ${this.limitClause}`;
    if (this.offsetClause) query += ` ${this.offsetClause}`;

    const result = await this.database.query(query, this.whereParams, this.client);
    return result.rows;
  }

  async insert(data: Record<string, any>): Promise<any> {
    const insertData = { ...data };
    
    // If UUID primary key type and primary key not provided, generate UUID
    if (this.primaryKeyType === 'uuid' && !insertData[this.primaryKey]) {
      // Generate UUID using crypto.randomUUID() (Node.js 14.17.0+)
      insertData[this.primaryKey] = randomUUID();
    }
    
    const columns = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.database.query(query, values, this.client);
    return result.rows[0];
  }

  async update(data: Record<string, any>): Promise<any[]> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const paramOffset = values.length;
    
    // Rebuild where conditions with correct parameter numbers
    const whereConditions: string[] = [];
    let whereParamIndex = paramOffset + 1;
    
    for (const condition of this.whereConditions) {
      if (condition.includes('$')) {
        // Replace parameter placeholders
        const updatedCondition = condition.replace(/\$\d+/g, () => `$${whereParamIndex++}`);
        whereConditions.push(updatedCondition);
      } else {
        whereConditions.push(condition);
      }
    }
    
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    let query = `UPDATE ${this.tableName} SET ${setClause}`;
    if (whereClause) {
      query += ` ${whereClause}`;
    }

    const allParams = [...values, ...this.whereParams];
    const result = await this.database.query(query, allParams, this.client);
    return result.rows;
  }

  async delete(): Promise<number> {
    const whereClause = this.buildWhereClause();
    
    if (!whereClause) {
      throw new Error('Delete operation requires a WHERE clause for safety');
    }

    const query = `DELETE FROM ${this.tableName} ${whereClause}`;
    const result = await this.database.query(query, this.whereParams, this.client);
    return result.rowCount || 0;
  }

  async count(): Promise<number> {
    const whereClause = this.buildWhereClause();
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
    const result = await this.database.query(query, this.whereParams, this.client);
    return parseInt(result.rows[0].count);
  }

  async first(): Promise<any | null> {
    this.limit(1);
    const results = await this.select();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a raw SQL query
   * @param sql - Raw SQL query string with optional parameter placeholders ($1, $2, etc.)
   * @param params - Optional array of parameters for the query
   * @returns Query result rows
   */
  async raw(sql: string, params?: any[]): Promise<any[]> {
    const result = await this.database.query(sql, params, this.client);
    return result.rows;
  }
}


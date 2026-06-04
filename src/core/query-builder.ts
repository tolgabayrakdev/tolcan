import { PoolClient } from 'pg';
import { Database } from './database';
import { WhereCondition, WhereOperators, OrderBy, PrimaryKeyType } from './types';
import { randomUUID } from 'crypto';

/**
 * Validate and quote a SQL identifier (table/column name) to prevent
 * identifier-based SQL injection. Supports dotted identifiers like
 * `schema.table` by quoting each segment independently.
 */
export function quoteIdent(identifier: string): string {
  return identifier
    .split('.')
    .map((part) => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
        throw new Error(`Invalid SQL identifier: "${identifier}"`);
      }
      return `"${part}"`;
    })
    .join('.');
}

type WhereClause =
  | { type: 'raw'; sql: string; params: any[] }
  | { type: 'expr'; column: string; op: string; value: any };

const OPERATOR_KEYS = new Set([
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$in',
  '$nin',
  '$like',
  '$ilike',
  '$null',
]);

function isOperatorObject(val: any): val is WhereOperators {
  if (val === null || typeof val !== 'object') return false;
  if (Array.isArray(val) || val instanceof Date || Buffer.isBuffer(val)) return false;
  const keys = Object.keys(val);
  return keys.length > 0 && keys.every((k) => OPERATOR_KEYS.has(k));
}

export class QueryBuilder {
  private database: Database;
  private tableName: string;
  private whereClauses: WhereClause[] = [];
  private orderByClause: string = '';
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private client?: PoolClient;
  private primaryKeyType: PrimaryKeyType;
  private primaryKey: string;

  constructor(
    database: Database,
    tableName: string,
    client?: PoolClient,
    primaryKeyType: PrimaryKeyType = 'serial',
    primaryKey: string = 'id'
  ) {
    this.database = database;
    this.tableName = tableName;
    this.client = client;
    this.primaryKeyType = primaryKeyType;
    this.primaryKey = primaryKey;
  }

  where(condition: WhereCondition | string, value?: any): this {
    if (typeof condition === 'string') {
      this.whereClauses.push({
        type: 'raw',
        sql: condition,
        params: value !== undefined ? [value] : [],
      });
      return this;
    }

    for (const [column, val] of Object.entries(condition)) {
      if (val === null || val === undefined) {
        this.whereClauses.push({ type: 'expr', column, op: '$null', value: true });
      } else if (Array.isArray(val)) {
        this.whereClauses.push({ type: 'expr', column, op: '$in', value: val });
      } else if (isOperatorObject(val)) {
        for (const [op, opVal] of Object.entries(val)) {
          this.whereClauses.push({ type: 'expr', column, op, value: opVal });
        }
      } else {
        this.whereClauses.push({ type: 'expr', column, op: '$eq', value: val });
      }
    }
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    const dir = direction === 'DESC' ? 'DESC' : 'ASC';
    this.orderByClause = `ORDER BY ${quoteIdent(column)} ${dir}`;
    return this;
  }

  orderByMultiple(orders: OrderBy[]): this {
    const orderParts = orders.map(
      (order) => `${quoteIdent(order.column)} ${order.direction === 'DESC' ? 'DESC' : 'ASC'}`
    );
    this.orderByClause = `ORDER BY ${orderParts.join(', ')}`;
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  /**
   * Render a single column expression for the given operator, starting at
   * parameter index `idx`. Returns the SQL fragment and the params it consumes.
   */
  private renderExpr(
    column: string,
    op: string,
    value: any,
    idx: number
  ): { sql: string; params: any[] } {
    const col = quoteIdent(column);
    switch (op) {
      case '$eq':
        return value === null
          ? { sql: `${col} IS NULL`, params: [] }
          : { sql: `${col} = $${idx}`, params: [value] };
      case '$ne':
        return value === null
          ? { sql: `${col} IS NOT NULL`, params: [] }
          : { sql: `${col} <> $${idx}`, params: [value] };
      case '$gt':
        return { sql: `${col} > $${idx}`, params: [value] };
      case '$gte':
        return { sql: `${col} >= $${idx}`, params: [value] };
      case '$lt':
        return { sql: `${col} < $${idx}`, params: [value] };
      case '$lte':
        return { sql: `${col} <= $${idx}`, params: [value] };
      case '$like':
        return { sql: `${col} LIKE $${idx}`, params: [value] };
      case '$ilike':
        return { sql: `${col} ILIKE $${idx}`, params: [value] };
      case '$null':
        return { sql: value ? `${col} IS NULL` : `${col} IS NOT NULL`, params: [] };
      case '$in': {
        const arr = Array.isArray(value) ? value : [value];
        if (arr.length === 0) return { sql: 'FALSE', params: [] };
        const ph = arr.map((_, i) => `$${idx + i}`).join(', ');
        return { sql: `${col} IN (${ph})`, params: arr };
      }
      case '$nin': {
        const arr = Array.isArray(value) ? value : [value];
        if (arr.length === 0) return { sql: 'TRUE', params: [] };
        const ph = arr.map((_, i) => `$${idx + i}`).join(', ');
        return { sql: `${col} NOT IN (${ph})`, params: arr };
      }
      default:
        throw new Error(`Unsupported where operator: "${op}"`);
    }
  }

  /**
   * Build the WHERE clause, assigning parameter placeholders sequentially
   * starting from `start`. Returns the clause, its params (in order), and the
   * next free parameter index.
   */
  private buildWhere(start: number): { clause: string; params: any[]; next: number } {
    if (this.whereClauses.length === 0) {
      return { clause: '', params: [], next: start };
    }

    const parts: string[] = [];
    const params: any[] = [];
    let idx = start;

    for (const clause of this.whereClauses) {
      if (clause.type === 'raw') {
        // Renumber any placeholders so they remain valid regardless of position.
        const sql = clause.sql.replace(/\$\d+/g, () => `$${idx++}`);
        parts.push(sql);
        params.push(...clause.params);
      } else {
        const rendered = this.renderExpr(clause.column, clause.op, clause.value, idx);
        idx += rendered.params.length;
        parts.push(rendered.sql);
        params.push(...rendered.params);
      }
    }

    return { clause: `WHERE ${parts.join(' AND ')}`, params, next: idx };
  }

  async select(columns: string[] = ['*']): Promise<any[]> {
    const columnList = columns.map((c) => (c === '*' ? '*' : quoteIdent(c))).join(', ');
    const where = this.buildWhere(1);

    let query = `SELECT ${columnList} FROM ${quoteIdent(this.tableName)}`;
    if (where.clause) query += ` ${where.clause}`;
    if (this.orderByClause) query += ` ${this.orderByClause}`;
    if (this.limitValue !== null) query += ` LIMIT ${Number(this.limitValue)}`;
    if (this.offsetValue !== null) query += ` OFFSET ${Number(this.offsetValue)}`;

    const result = await this.database.query(query, where.params, this.client);
    return result.rows;
  }

  async insert(data: Record<string, any>): Promise<any> {
    const insertData = { ...data };

    // If UUID primary key type and primary key not provided, generate one.
    if (this.primaryKeyType === 'uuid' && !insertData[this.primaryKey]) {
      insertData[this.primaryKey] = randomUUID();
    }

    const columns = Object.keys(insertData);
    if (columns.length === 0) {
      throw new Error('Insert requires at least one column');
    }

    const values = Object.values(insertData);
    const quotedColumns = columns.map(quoteIdent).join(', ');
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO ${quoteIdent(this.tableName)} (${quotedColumns}) VALUES (${placeholders}) RETURNING *`;

    const result = await this.database.query(query, values, this.client);
    return result.rows[0];
  }

  async update(data: Record<string, any>): Promise<any[]> {
    const columns = Object.keys(data);
    if (columns.length === 0) {
      throw new Error('Update requires at least one column to set');
    }

    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${quoteIdent(col)} = $${i + 1}`).join(', ');
    const where = this.buildWhere(values.length + 1);

    let query = `UPDATE ${quoteIdent(this.tableName)} SET ${setClause}`;
    if (where.clause) {
      query += ` ${where.clause}`;
    }
    query += ' RETURNING *';

    const allParams = [...values, ...where.params];
    const result = await this.database.query(query, allParams, this.client);
    return result.rows;
  }

  async delete(): Promise<number> {
    const where = this.buildWhere(1);

    if (!where.clause) {
      throw new Error('Delete operation requires a WHERE clause for safety');
    }

    const query = `DELETE FROM ${quoteIdent(this.tableName)} ${where.clause}`;
    const result = await this.database.query(query, where.params, this.client);
    return result.rowCount || 0;
  }

  async count(): Promise<number> {
    const where = this.buildWhere(1);
    let query = `SELECT COUNT(*) as count FROM ${quoteIdent(this.tableName)}`;
    if (where.clause) query += ` ${where.clause}`;
    const result = await this.database.query(query, where.params, this.client);
    return parseInt(result.rows[0].count, 10);
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

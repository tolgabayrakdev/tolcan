import { Database } from './database';
import { QueryBuilder } from './query-builder';
import {
  SelectOptions,
  UpdateOptions,
  DeleteOptions,
  QueryOptions,
  PrimaryKeyType,
} from './types';

/**
 * A concrete Model subclass constructor that also carries Model's statics.
 * Used as the `this` type of static query methods so they can return
 * properly-typed instances of the calling subclass.
 */
export type ModelClass<T extends Model> = (new () => T) & typeof Model;

export abstract class Model {
  static tableName?: string;
  static primaryKey: string = 'id';
  static primaryKeyType: PrimaryKeyType = 'serial';

  abstract getTableName(): string;
  abstract getPrimaryKey(): string;

  static getTableName(): string {
    if (this.tableName) {
      return this.tableName;
    }
    // Derive table name from class name (e.g., User -> users)
    return `${this.name.toLowerCase()}s`;
  }

  static getPrimaryKey(): string {
    return this.primaryKey || 'id';
  }

  static getPrimaryKeyType(): PrimaryKeyType {
    return this.primaryKeyType || 'serial';
  }

  static query(client?: any): QueryBuilder {
    const database = Database.getInstance();
    return new QueryBuilder(
      database,
      this.getTableName(),
      client,
      this.getPrimaryKeyType(),
      this.getPrimaryKey()
    );
  }

  static async find<T extends Model>(
    this: ModelClass<T>,
    id: any,
    options?: QueryOptions
  ): Promise<T | null> {
    const primaryKey = this.getPrimaryKey();
    const result = await this.query(options?.client)
      .where({ [primaryKey]: id })
      .first();

    if (!result) {
      return null;
    }

    return Object.assign(new (this as unknown as new () => T)(), result) as T;
  }

  static async findAll<T extends Model>(
    this: ModelClass<T>,
    options?: SelectOptions
  ): Promise<T[]> {
    const builder = this.query(options?.client);

    if (options?.where) {
      builder.where(options.where);
    }

    if (options?.orderBy) {
      if (Array.isArray(options.orderBy)) {
        builder.orderByMultiple(options.orderBy);
      } else {
        builder.orderBy(options.orderBy.column, options.orderBy.direction);
      }
    }

    if (options?.limit !== undefined) {
      builder.limit(options.limit);
    }

    if (options?.offset !== undefined) {
      builder.offset(options.offset);
    }

    const results = await builder.select();
    return results.map((row: any) => Object.assign(new (this as unknown as new () => T)(), row) as T);
  }

  static async findOne<T extends Model>(
    this: ModelClass<T>,
    options?: SelectOptions
  ): Promise<T | null> {
    const results = await (this as any).findAll({ ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  static async create<T extends Model>(
    this: ModelClass<T>,
    data: Record<string, any>,
    options?: QueryOptions
  ): Promise<T> {
    const result = await this.query(options?.client).insert(data);
    return Object.assign(new (this as unknown as new () => T)(), result) as T;
  }

  static async update<T extends Model>(
    this: ModelClass<T>,
    data: Record<string, any>,
    options?: UpdateOptions
  ): Promise<T[]> {
    const builder = this.query(options?.client);

    if (options?.where) {
      builder.where(options.where);
    } else {
      throw new Error('Update requires a WHERE clause');
    }

    const results = await builder.update(data);
    return results.map((row: any) => Object.assign(new (this as unknown as new () => T)(), row) as T);
  }

  static async delete(options?: DeleteOptions): Promise<number> {
    const builder = this.query(options?.client);

    if (options?.where) {
      builder.where(options.where);
    } else {
      throw new Error('Delete requires a WHERE clause');
    }

    return builder.delete();
  }

  static async count(where?: Record<string, any>, options?: QueryOptions): Promise<number> {
    const builder = this.query(options?.client);
    if (where) {
      builder.where(where);
    }
    return builder.count();
  }

  /**
   * Execute a raw SQL query
   * @param sql - Raw SQL query string with optional parameter placeholders ($1, $2, etc.)
   * @param params - Optional array of parameters for the query
   * @param options - Optional query options including transaction client
   * @returns Query result rows
   */
  static async raw(sql: string, params?: any[], options?: QueryOptions): Promise<any[]> {
    const database = Database.getInstance();
    const result = await database.query(sql, params, options?.client);
    return result.rows;
  }

  async save(options?: QueryOptions): Promise<this> {
    const ModelClass = this.constructor as typeof Model;
    const primaryKey = ModelClass.getPrimaryKey();

    const data: Record<string, any> = {};
    const self = this as Record<string, any>;
    for (const key of Object.keys(self)) {
      if (key !== primaryKey && typeof self[key] !== 'function') {
        data[key] = self[key];
      }
    }

    if (self[primaryKey] !== undefined && self[primaryKey] !== null) {
      // Update existing record
      const result = await ModelClass.query(options?.client)
        .where({ [primaryKey]: self[primaryKey] })
        .update(data);

      if (result.length > 0) {
        Object.assign(this, result[0]);
      }
    } else {
      // Insert new record (UUID is auto-generated in QueryBuilder.insert)
      const result = await ModelClass.query(options?.client).insert(data);
      Object.assign(this, result);
    }

    return this;
  }

  async delete(options?: QueryOptions): Promise<boolean> {
    const ModelClass = this.constructor as typeof Model;
    const primaryKey = ModelClass.getPrimaryKey();
    const self = this as Record<string, any>;

    if (self[primaryKey] === undefined || self[primaryKey] === null) {
      throw new Error('Cannot delete a model without a primary key value');
    }

    const deleted = await ModelClass.query(options?.client)
      .where({ [primaryKey]: self[primaryKey] })
      .delete();
    return deleted > 0;
  }

  toJSON(): Record<string, any> {
    const json: Record<string, any> = {};
    const self = this as Record<string, any>;
    for (const key of Object.keys(self)) {
      if (typeof self[key] !== 'function') {
        json[key] = self[key];
      }
    }
    return json;
  }
}

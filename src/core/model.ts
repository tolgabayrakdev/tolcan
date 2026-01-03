import { Database } from './database';
import { QueryBuilder } from './query-builder';
import {
  SelectOptions,
  UpdateOptions,
  DeleteOptions,
  QueryOptions,
  PrimaryKeyType,
} from './types';

export abstract class Model {
  static tableName?: string;
  static primaryKey?: string = 'id';
  static primaryKeyType?: PrimaryKeyType = 'serial';

  [key: string]: any;

  abstract getTableName(): string;
  abstract getPrimaryKey(): string;

  static getTableName(): string {
    if (this.tableName) {
      return this.tableName;
    }
    // Derive table name from class name (e.g., User -> users)
    const className = this.name;
    return `${className.toLowerCase()}s`;
  }

  static getPrimaryKey(): string {
    return this.primaryKey || 'id';
  }

  static getPrimaryKeyType(): PrimaryKeyType {
    return this.primaryKeyType || 'serial';
  }

  static query(client?: any): QueryBuilder {
    const database = Database.getInstance();
    const tableName = (this as any).getTableName();
    const primaryKeyType = (this as any).getPrimaryKeyType();
    const primaryKey = (this as any).getPrimaryKey();
    return new QueryBuilder(database, tableName, client, primaryKeyType, primaryKey);
  }

  static async find(id: any, options?: QueryOptions): Promise<Model | null> {
    const primaryKey = (this as any).getPrimaryKey();
    const result = await this.query(options?.client)
      .where({ [primaryKey]: id })
      .first();
    
    if (!result) {
      return null;
    }

    const instance = new (this as any)();
    Object.assign(instance, result);
    return instance;
  }

  static async findAll(options?: SelectOptions): Promise<Model[]> {
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

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    const results = await builder.select();
    return results.map((row: any) => {
      const instance = new (this as any)();
      Object.assign(instance, row);
      return instance;
    });
  }

  static async findOne(options?: SelectOptions): Promise<Model | null> {
    const results = await this.findAll({ ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  static async create(data: Record<string, any>, options?: QueryOptions): Promise<Model> {
    const primaryKey = (this as any).getPrimaryKey();
    const primaryKeyType = (this as any).getPrimaryKeyType();
    
    // If UUID type and primary key not provided, it will be auto-generated in insert
    const insertData = { ...data };
    if (primaryKeyType === 'uuid' && !insertData[primaryKey]) {
      // UUID will be generated in QueryBuilder.insert()
    }
    
    const result = await this.query(options?.client).insert(insertData);
    const instance = new (this as any)();
    Object.assign(instance, result);
    return instance;
  }

  static async update(
    data: Record<string, any>,
    options?: UpdateOptions
  ): Promise<Model[]> {
    const builder = this.query(options?.client);

    if (options?.where) {
      builder.where(options.where);
    } else {
      throw new Error('Update requires a WHERE clause');
    }

    const results = await builder.update(data);
    return results.map((row: any) => {
      const instance = new (this as any)();
      Object.assign(instance, row);
      return instance;
    });
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
    const primaryKey = (this.constructor as any).getPrimaryKey();
    const tableName = (this.constructor as any).getTableName();
    const database = Database.getInstance();

    const data: Record<string, any> = {};
    for (const key in this) {
      if (this.hasOwnProperty(key) && key !== primaryKey && typeof this[key] !== 'function') {
        data[key] = this[key];
      }
    }

    const ModelClass = this.constructor as typeof Model;
    
    if (this[primaryKey]) {
      // Update existing record
      const builder = ModelClass.query(options?.client);
      const result = await builder
        .where({ [primaryKey]: this[primaryKey] })
        .update(data);
      
      if (result.length > 0) {
        Object.assign(this, result[0]);
      }
    } else {
      // Insert new record
      const primaryKeyType = (ModelClass as any).getPrimaryKeyType();
      // If UUID type, it will be auto-generated in insert
      const result = await ModelClass.query(options?.client).insert(data);
      Object.assign(this, result);
    }

    return this;
  }

  async delete(options?: QueryOptions): Promise<boolean> {
    const primaryKey = (this.constructor as any).getPrimaryKey();
    const ModelClass = this.constructor as typeof Model;

    if (!this[primaryKey]) {
      throw new Error('Cannot delete a model without a primary key value');
    }

    const builder = ModelClass.query(options?.client);
    const deleted = await builder.where({ [primaryKey]: this[primaryKey] }).delete();
    return deleted > 0;
  }

  toJSON(): Record<string, any> {
    const json: Record<string, any> = {};
    for (const key in this) {
      if (this.hasOwnProperty(key) && typeof this[key] !== 'function') {
        json[key] = this[key];
      }
    }
    return json;
  }
}


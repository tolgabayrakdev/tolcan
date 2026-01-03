# Tolcan

A lightweight, model-based ORM for PostgreSQL with TypeScript support. Tolcan provides a simple and intuitive API for database operations without requiring migrations.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-Unlicense-green.svg)](LICENSE)

## Features

- 🎯 **Model-based**: Define your models as TypeScript classes
- 🔄 **Transaction Support**: Built-in transaction management with automatic rollback
- 🚫 **No Migrations**: Focus on your models, not migrations (for now)
- 📦 **TypeScript First**: Full TypeScript support with type safety
- 🔌 **PostgreSQL**: Optimized for PostgreSQL databases
- 🎨 **Simple API**: Clean and intuitive query builder
- 🏗️ **Modular Architecture**: Well-organized core structure
- 🔑 **UUID Support**: Primary key can be UUID or serial with automatic UUID generation
- 🔧 **Raw SQL Support**: Execute complex raw SQL queries when needed

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Models](#models)
- [Query Builder](#query-builder)
- [Transactions](#transactions)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Installation

```bash
npm install tolcan
```

You also need to install the PostgreSQL driver:

```bash
npm install pg
npm install --save-dev @types/pg
```

## Quick Start

### 1. Connect to Database

```typescript
import { connect } from 'tolcan';

connect({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password'
});
```

### 2. Define a Model

```typescript
import { Model } from 'tolcan';

// Serial (integer) primary key
class User extends Model {
  static tableName = 'users';
  static primaryKey = 'id';
  static primaryKeyType = 'serial'; // default

  getTableName(): string {
    return 'users';
  }

  getPrimaryKey(): string {
    return 'id';
  }
}

// UUID primary key
class Product extends Model {
  static tableName = 'products';
  static primaryKey = 'id';
  static primaryKeyType = 'uuid';

  getTableName(): string {
    return 'products';
  }

  getPrimaryKey(): string {
    return 'id';
  }
}
```

### 3. Use Your Model

```typescript
// Create a new user
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Find a user by ID
const foundUser = await User.find(1);

// Find all users
const allUsers = await User.findAll();
```

## Configuration

### Database Connection Options

```typescript
import { connect } from 'tolcan';

connect({
  host: 'localhost',              // Database host (default: 'localhost')
  port: 5432,                     // Database port (default: 5432)
  database: 'mydb',               // Database name (required)
  user: 'postgres',               // Database user (required)
  password: 'password',            // Database password (required)
  ssl: false,                     // SSL connection (default: false)
  max: 20,                        // Maximum pool size (default: 20)
  idleTimeoutMillis: 30000,       // Idle timeout (default: 30000)
  connectionTimeoutMillis: 2000   // Connection timeout (default: 2000)
});
```

### Disconnect from Database

```typescript
import { disconnect } from 'tolcan';

// Disconnect when your application shuts down
await disconnect();
```

## Models

### Defining Models

Models are TypeScript classes that extend the base `Model` class. You must implement two abstract methods:

```typescript
import { Model } from 'tolcan';

// Serial (integer) primary key
class User extends Model {
  // Optional: explicitly set table name
  static tableName = 'users';
  
  // Optional: set primary key (default: 'id')
  static primaryKey = 'id';
  
  // Optional: set primary key type (default: 'serial')
  static primaryKeyType = 'serial';

  // Required: return table name
  getTableName(): string {
    return 'users';
  }

  // Required: return primary key column name
  getPrimaryKey(): string {
    return 'id';
  }
}

// UUID primary key
class Product extends Model {
  static tableName = 'products';
  static primaryKey = 'id';
  static primaryKeyType = 'uuid';

  getTableName(): string {
    return 'products';
  }

  getPrimaryKey(): string {
    return 'id';
  }
}
```

**Note**: If you don't set `static tableName`, Tolcan will automatically derive it from the class name (e.g., `User` → `users`, `ProductCategory` → `productcategories`).

### Primary Key Types

Tolcan supports two primary key types:

- **`serial`** (default): PostgreSQL SERIAL/BIGSERIAL type. Auto-incrementing integer values.
- **`uuid`**: UUID (Universally Unique Identifier) type. UUIDs are automatically generated when creating records.

```typescript
// Serial primary key (default)
class User extends Model {
  static primaryKeyType = 'serial'; // or omit it
  // ...
}

// UUID primary key
class Product extends Model {
  static primaryKeyType = 'uuid';
  // UUIDs are automatically generated on create()
  // ...
}
```

### Model Static Methods

#### `Model.find(id, options?)`

Find a single record by primary key.

```typescript
const user = await User.find(1);
// Returns: User instance or null

// With transaction
const user = await User.find(1, { client: trx.getClient() });
```

#### `Model.findAll(options?)`

Find multiple records with optional filtering, sorting, and pagination.

```typescript
// Find all
const users = await User.findAll();

// With conditions
const activeUsers = await User.findAll({
  where: { active: true }
});

// With sorting
const sortedUsers = await User.findAll({
  orderBy: { column: 'created_at', direction: 'DESC' }
});

// Multiple order by
const users = await User.findAll({
  orderBy: [
    { column: 'created_at', direction: 'DESC' },
    { column: 'name', direction: 'ASC' }
  ]
});

// With pagination
const users = await User.findAll({
  where: { active: true },
  orderBy: { column: 'created_at', direction: 'DESC' },
  limit: 10,
  offset: 20
});
```

#### `Model.findOne(options?)`

Find the first record matching conditions.

```typescript
const user = await User.findOne({
  where: { email: 'john@example.com' }
});
// Returns: User instance or null
```

#### `Model.create(data, options?)`

Create a new record. UUIDs are automatically generated for UUID primary keys if not provided.

```typescript
// Serial primary key
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});
// Returns: Created User instance with all fields including generated ID

// UUID primary key - UUID is auto-generated
const product = await Product.create({
  name: 'Laptop',
  price: 999.99
});
// Returns: Created Product instance with auto-generated UUID

// UUID primary key - manual UUID (optional)
const product = await Product.create({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Laptop',
  price: 999.99
});
```

#### `Model.update(data, options)`

Update records matching conditions. **Requires a WHERE clause for safety.**

```typescript
// Update single record
await User.update(
  { name: 'Jane Doe' },
  { where: { id: 1 } }
);

// Update multiple records
await User.update(
  { active: false },
  { where: { status: 'inactive' } }
);

// Returns: Array of updated Model instances
```

#### `Model.delete(options)`

Delete records matching conditions. **Requires a WHERE clause for safety.**

```typescript
// Delete single record
await User.delete({ where: { id: 1 } });

// Delete multiple records
await User.delete({ where: { active: false } });

// Returns: Number of deleted records
```

#### `Model.count(where?, options?)`

Count records matching conditions.

```typescript
// Count all
const total = await User.count();

// Count with conditions
const activeCount = await User.count({ active: true });
```

#### `Model.query(client?)`

Get a query builder instance for advanced queries.

```typescript
const builder = User.query();
// Returns: QueryBuilder instance
```

### Model Instance Methods

#### `model.save(options?)`

Save the model instance. Automatically inserts if new, updates if existing (based on primary key).

```typescript
// Create new record
const user = new User();
user.name = 'John Doe';
user.email = 'john@example.com';
await user.save();
// user.id is now set

// Update existing record
user.name = 'Jane Doe';
await user.save();
```

#### `model.delete(options?)`

Delete the model instance from the database.

```typescript
const user = await User.find(1);
await user.delete();
// Returns: true if deleted, false otherwise
```

#### `model.toJSON()`

Convert model instance to plain JSON object.

```typescript
const user = await User.find(1);
const json = user.toJSON();
// Returns: { id: 1, name: 'John', email: 'john@example.com', ... }
```

## Query Builder

The query builder provides a fluent interface for building complex queries.

### Basic Usage

```typescript
const users = await User.query()
  .where({ active: true })
  .orderBy('created_at', 'DESC')
  .limit(10)
  .select();
```

### WHERE Conditions

#### Object-based conditions

```typescript
// Simple equality
.where({ active: true })

// NULL check
.where({ deleted_at: null })

// IN clause (array values)
.where({ id: [1, 2, 3] })

// Multiple conditions (AND)
.where({ active: true })
.where({ age: 25 })
```

#### Raw SQL conditions

```typescript
// Raw SQL with parameter
.where('age > $1', 18)

// Multiple raw conditions
.where('age > $1', 18)
.where('created_at > $1', new Date('2024-01-01'))
```

### ORDER BY

```typescript
// Single column
.orderBy('created_at', 'DESC')

// Multiple columns (use orderByMultiple)
.orderByMultiple([
  { column: 'created_at', direction: 'DESC' },
  { column: 'name', direction: 'ASC' }
])
```

### LIMIT and OFFSET

```typescript
.limit(10)
.offset(20)
```

### SELECT

```typescript
// Select all columns
.select()

// Select specific columns
.select(['id', 'name', 'email'])
```

### INSERT

```typescript
const user = await User.query().insert({
  name: 'John Doe',
  email: 'john@example.com'
});
// Returns: Inserted record
```

### UPDATE

```typescript
const updated = await User.query()
  .where({ id: 1 })
  .update({ name: 'Jane Doe' });
// Returns: Array of updated records
```

### DELETE

```typescript
// Delete requires WHERE clause for safety
const deleted = await User.query()
  .where({ id: 1 })
  .delete();
// Returns: Number of deleted records
```

### COUNT

```typescript
const count = await User.query()
  .where({ active: true })
  .count();
// Returns: Number
```

### FIRST

```typescript
const user = await User.query()
  .where({ email: 'john@example.com' })
  .first();
// Returns: First matching record or null
```

## Raw SQL Queries

For complex queries that cannot be easily expressed with the query builder, Tolcan supports raw SQL queries.

### Using Model.raw()

Execute raw SQL queries directly from a model:

```typescript
// Simple raw query
const users = await User.raw('SELECT * FROM users WHERE age > $1', [18]);

// Complex join query
const results = await User.raw(`
  SELECT u.*, p.name as profile_name 
  FROM users u 
  LEFT JOIN profiles p ON u.id = p.user_id 
  WHERE u.active = $1 
  ORDER BY u.created_at DESC
`, [true]);

// With transaction
await transaction(async (trx) => {
  const users = await User.raw(
    'SELECT * FROM users WHERE active = $1',
    [true],
    { client: trx.getClient() }
  );
});
```

### Using QueryBuilder.raw()

Execute raw SQL from a query builder instance:

```typescript
const results = await User.query()
  .raw('SELECT COUNT(*) as total FROM users WHERE created_at > $1', [
    new Date('2024-01-01')
  ]);
```

### Using the raw() Helper Function

Execute raw SQL queries directly without a model:

```typescript
import { raw } from 'tolcan';

// Simple query
const results = await raw('SELECT * FROM users WHERE age > $1', [18]);

// Complex query with joins
const data = await raw(`
  SELECT 
    u.id,
    u.name,
    COUNT(o.id) as order_count
  FROM users u
  LEFT JOIN orders o ON u.id = o.user_id
  GROUP BY u.id, u.name
  HAVING COUNT(o.id) > $1
`, [5]);

// With transaction client
await transaction(async (trx) => {
  const results = await raw(
    'SELECT * FROM users WHERE active = $1',
    [true],
    trx.getClient()
  );
});
```

### Using Database.query() Directly

For maximum control, use the Database class directly:

```typescript
import { Database } from 'tolcan';

const database = Database.getInstance();
const result = await database.query(
  'SELECT * FROM users WHERE age > $1 AND active = $2',
  [18, true]
);
const users = result.rows;
```

### Parameterized Queries

Always use parameterized queries to prevent SQL injection:

```typescript
// ✅ Good - Parameterized
const users = await User.raw(
  'SELECT * FROM users WHERE email = $1',
  ['john@example.com']
);

// ❌ Bad - SQL Injection risk
const email = "john@example.com'; DROP TABLE users; --";
const users = await User.raw(`SELECT * FROM users WHERE email = '${email}'`);
```

## Transactions

Tolcan provides built-in transaction support with automatic rollback on errors.

### Basic Transaction

```typescript
import { transaction } from 'tolcan';

await transaction(async (trx) => {
  const user = await User.create(
    { name: 'John', email: 'john@example.com' },
    { client: trx.getClient() }
  );

  // More operations within the same transaction
  await User.update(
    { name: 'Jane' },
    { where: { id: 1 }, client: trx.getClient() }
  );

  // Transaction will be committed automatically
  // or rolled back if an error occurs
});
```

### Manual Transaction Control

```typescript
import { Transaction, Database } from 'tolcan';

const database = Database.getInstance();
const client = await database.getClient();
const trx = new Transaction(client);

try {
  await trx.begin();
  
  const user = await User.create(
    { name: 'John' },
    { client: trx.getClient() }
  );
  
  await trx.commit();
} catch (error) {
  await trx.rollback();
  throw error;
}
```

### Transaction Methods

- `trx.getClient()` - Get the transaction client to pass to queries
- `trx.commit()` - Commit the transaction
- `trx.rollback()` - Rollback the transaction
- `trx.isCommitted()` - Check if transaction is committed
- `trx.isRolledBack()` - Check if transaction is rolled back

## API Reference

### Database Class

```typescript
import { Database } from 'tolcan';

const db = Database.getInstance();
db.connect(config);
db.getPool();
db.query(text, params, client?);
db.disconnect();
db.getClient();
```

### Model Class

**Static Methods:**
- `Model.find(id, options?)` - Find by primary key
- `Model.findAll(options?)` - Find all with options
- `Model.findOne(options?)` - Find first matching
- `Model.create(data, options?)` - Create new record
- `Model.update(data, options)` - Update records
- `Model.delete(options)` - Delete records
- `Model.count(where?, options?)` - Count records
- `Model.query(client?)` - Get query builder
- `Model.raw(sql, params?, options?)` - Execute raw SQL query
- `Model.getTableName()` - Get table name
- `Model.getPrimaryKey()` - Get primary key

**Instance Methods:**
- `model.save(options?)` - Save instance
- `model.delete(options?)` - Delete instance
- `model.toJSON()` - Convert to JSON

### QueryBuilder Class

**Methods:**
- `where(condition, value?)` - Add WHERE condition
- `orderBy(column, direction?)` - Add ORDER BY
- `orderByMultiple(orders)` - Add multiple ORDER BY
- `limit(count)` - Add LIMIT
- `offset(count)` - Add OFFSET
- `select(columns?)` - Execute SELECT
- `insert(data)` - Execute INSERT
- `update(data)` - Execute UPDATE
- `delete()` - Execute DELETE
- `count()` - Execute COUNT
- `first()` - Get first result
- `raw(sql, params?)` - Execute raw SQL query

### Types

```typescript
interface DatabaseConfig {
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

interface QueryOptions {
  client?: PoolClient;
}

interface SelectOptions {
  where?: WhereCondition;
  orderBy?: OrderBy | OrderBy[];
  limit?: number;
  offset?: number;
  client?: PoolClient;
}

interface UpdateOptions {
  where?: WhereCondition;
  client?: PoolClient;
}

interface DeleteOptions {
  where?: WhereCondition;
  client?: PoolClient;
}
```

## Examples

### Complete Example

```typescript
import { connect, Model, transaction } from 'tolcan';

// Connect to database
connect({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password'
});

// Define model
class User extends Model {
  static tableName = 'users';
  static primaryKey = 'id';

  getTableName(): string {
    return 'users';
  }

  getPrimaryKey(): string {
    return 'id';
  }
}

// Usage
async function main() {
  // Create
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com'
  });

  // Find
  const found = await User.find(user.id);
  
  // Update
  await User.update(
    { name: 'Jane Doe' },
    { where: { id: user.id } }
  );

  // Delete
  await User.delete({ where: { id: user.id } });

  // Transaction
  await transaction(async (trx) => {
    const user1 = await User.create(
      { name: 'Alice' },
      { client: trx.getClient() }
    );
    const user2 = await User.create(
      { name: 'Bob' },
      { client: trx.getClient() }
    );
  });
}

main();
```

### Advanced Query Example

```typescript
// Complex query with query builder
const users = await User.query()
  .where({ active: true })
  .where('age >= $1', 18)
  .where('created_at > $1', new Date('2024-01-01'))
  .orderBy('created_at', 'DESC')
  .orderBy('name', 'ASC')
  .limit(20)
  .offset(0)
  .select(['id', 'name', 'email', 'created_at']);
```

### Pagination Example

```typescript
async function getUsers(page: number = 1, pageSize: number = 10) {
  const offset = (page - 1) * pageSize;
  
  const users = await User.findAll({
    where: { active: true },
    orderBy: { column: 'created_at', direction: 'DESC' },
    limit: pageSize,
    offset: offset
  });

  const total = await User.count({ active: true });

  return {
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}
```

## Best Practices

### 1. Always Use Transactions for Multiple Operations

```typescript
// ✅ Good
await transaction(async (trx) => {
  const user = await User.create({ ... }, { client: trx.getClient() });
  await Profile.create({ userId: user.id, ... }, { client: trx.getClient() });
});

// ❌ Bad
const user = await User.create({ ... });
await Profile.create({ userId: user.id, ... }); // If this fails, user is orphaned
```

### 2. Use TypeScript Types for Models

```typescript
interface UserData {
  id?: number;
  name: string;
  email: string;
  age?: number;
}

class User extends Model {
  id?: number;
  name!: string;
  email!: string;
  age?: number;

  // ... rest of model
}
```

### 3. Handle Errors Properly

```typescript
try {
  const user = await User.find(1);
  if (!user) {
    throw new Error('User not found');
  }
  // Use user
} catch (error) {
  console.error('Error:', error);
  // Handle error
}
```

### 4. Disconnect on Application Shutdown

```typescript
import { disconnect } from 'tolcan';

process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});
```

### 5. Use Query Builder for Complex Queries

```typescript
// ✅ Good - Use query builder for complex queries
const users = await User.query()
  .where({ active: true })
  .where('age > $1', 18)
  .orderBy('created_at', 'DESC')
  .select();

// ✅ Also good - Use findAll for simple queries
const users = await User.findAll({
  where: { active: true },
  orderBy: { column: 'created_at', direction: 'DESC' }
});
```

## Troubleshooting

### Connection Errors

**Problem**: `Database not connected. Call connect() first.`

**Solution**: Make sure you call `connect()` before using any models.

```typescript
import { connect } from 'tolcan';

connect({
  database: 'mydb',
  user: 'postgres',
  password: 'password'
});
```

### Transaction Errors

**Problem**: `Transaction already committed`

**Solution**: Don't call `commit()` or `rollback()` manually when using the `transaction()` helper function. It handles this automatically.

### WHERE Clause Required

**Problem**: `Update requires a WHERE clause` or `Delete requires a WHERE clause`

**Solution**: Always provide a WHERE clause for update and delete operations to prevent accidental mass updates/deletes.

```typescript
// ✅ Good
await User.update({ name: 'John' }, { where: { id: 1 } });

// ❌ Bad
await User.update({ name: 'John' }); // Error!
```

### Type Errors

**Problem**: TypeScript errors with model properties

**Solution**: Define your model properties with proper types:

```typescript
class User extends Model {
  id?: number;
  name!: string;
  email!: string;

  // ... rest
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Unlicense - See [LICENSE](LICENSE) file for details.

---

Made with ❤️ for the TypeScript and PostgreSQL community.

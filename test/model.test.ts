import { Model } from '../src/core/model';
import { Database } from '../src/core/database';

class User extends Model {
  static tableName = 'users';
  declare id: number;
  declare name: string;
  declare email: string;

  getTableName(): string {
    return 'users';
  }
  getPrimaryKey(): string {
    return 'id';
  }
}

// Model with no explicit tableName, to exercise name derivation.
class Category extends Model {
  declare id: number;
  getTableName(): string {
    return 'categorys';
  }
  getPrimaryKey(): string {
    return 'id';
  }
}

function mockQuery(impl: (sql: string, params?: any[]) => any) {
  return jest
    .spyOn(Database.getInstance(), 'query')
    .mockImplementation(async (sql: string, params?: any[]) => impl(sql, params));
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Model static helpers', () => {
  it('derives table name from class name when not set', () => {
    expect((Category as any).getTableName()).toBe('categorys');
  });

  it('uses explicit tableName when provided', () => {
    expect((User as any).getTableName()).toBe('users');
  });
});

describe('Model.find', () => {
  it('returns a typed instance', async () => {
    mockQuery(() => ({ rows: [{ id: 1, name: 'Jo', email: 'j@x.com' }], rowCount: 1 }));
    const user = await User.find(1);
    expect(user).toBeInstanceOf(User);
    expect(user?.name).toBe('Jo');
  });

  it('returns null when no row is found', async () => {
    mockQuery(() => ({ rows: [], rowCount: 0 }));
    const user = await User.find(999);
    expect(user).toBeNull();
  });
});

describe('Model.create / update / delete', () => {
  it('create returns an instance from the inserted row', async () => {
    mockQuery(() => ({ rows: [{ id: 5, name: 'New', email: 'n@x.com' }], rowCount: 1 }));
    const user = await User.create({ name: 'New', email: 'n@x.com' });
    expect(user).toBeInstanceOf(User);
    expect(user.id).toBe(5);
  });

  it('update requires a where clause', async () => {
    await expect(User.update({ name: 'x' })).rejects.toThrow(/WHERE clause/);
  });

  it('delete requires a where clause', async () => {
    await expect(User.delete()).rejects.toThrow(/WHERE clause/);
  });

  it('static delete returns the affected row count', async () => {
    mockQuery(() => ({ rows: [], rowCount: 3 }));
    const n = await User.delete({ where: { id: { $in: [1, 2, 3] } } });
    expect(n).toBe(3);
  });
});

describe('Model instance methods', () => {
  it('toJSON omits functions', () => {
    const u = new User();
    u.id = 1;
    u.name = 'A';
    expect(u.toJSON()).toEqual({ id: 1, name: 'A' });
  });

  it('save() inserts when there is no primary key', async () => {
    const captured: { sql?: string } = {};
    mockQuery((sql) => {
      captured.sql = sql;
      return { rows: [{ id: 10, name: 'A' }], rowCount: 1 };
    });
    const u = new User();
    u.name = 'A';
    await u.save();
    expect(captured.sql).toContain('INSERT INTO "users"');
    expect(u.id).toBe(10);
  });

  it('save() updates when a primary key is present', async () => {
    const captured: { sql?: string } = {};
    mockQuery((sql) => {
      captured.sql = sql;
      return { rows: [{ id: 1, name: 'B' }], rowCount: 1 };
    });
    const u = new User();
    u.id = 1;
    u.name = 'B';
    await u.save();
    expect(captured.sql).toContain('UPDATE "users"');
    expect(captured.sql).toContain('WHERE "id" = ');
  });
});

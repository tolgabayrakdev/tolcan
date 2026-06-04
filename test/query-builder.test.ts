import { QueryBuilder, quoteIdent } from '../src/core/query-builder';
import { Database } from '../src/core/database';

interface FakeResult {
  rows?: any[];
  rowCount?: number;
}

function fakeDb(result: FakeResult = {}) {
  const calls: { sql: string; params?: any[] }[] = [];
  const db = {
    query: jest.fn(async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      return { rows: result.rows ?? [], rowCount: result.rowCount ?? 0 };
    }),
  } as unknown as Database;
  return { db, calls };
}

const qb = (db: Database, table = 'users', pkType: 'serial' | 'uuid' = 'serial') =>
  new QueryBuilder(db, table, undefined, pkType);

describe('quoteIdent', () => {
  it('quotes a simple identifier', () => {
    expect(quoteIdent('users')).toBe('"users"');
  });

  it('quotes dotted identifiers per segment', () => {
    expect(quoteIdent('public.users')).toBe('"public"."users"');
  });

  it('rejects injection attempts', () => {
    expect(() => quoteIdent('users; DROP TABLE users')).toThrow(/Invalid SQL identifier/);
    expect(() => quoteIdent('name = 1 OR 1=1')).toThrow(/Invalid SQL identifier/);
    expect(() => quoteIdent('1col')).toThrow(/Invalid SQL identifier/);
  });
});

describe('QueryBuilder.where (equality / null / array)', () => {
  it('builds equality conditions with parameters', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where({ name: 'john', age: 30 }).select();
    expect(calls[0].sql).toContain('WHERE "name" = $1 AND "age" = $2');
    expect(calls[0].params).toEqual(['john', 30]);
  });

  it('maps null to IS NULL without consuming a parameter', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where({ deleted_at: null, age: 5 }).select();
    expect(calls[0].sql).toContain('WHERE "deleted_at" IS NULL AND "age" = $1');
    expect(calls[0].params).toEqual([5]);
  });

  it('maps array values to IN clauses', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where({ id: [1, 2, 3] }).select();
    expect(calls[0].sql).toContain('WHERE "id" IN ($1, $2, $3)');
    expect(calls[0].params).toEqual([1, 2, 3]);
  });
});

describe('QueryBuilder.where (operators)', () => {
  it('supports comparison operators', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where({ age: { $gte: 18, $lte: 65 } }).select();
    expect(calls[0].sql).toContain('"age" >= $1 AND "age" <= $2');
    expect(calls[0].params).toEqual([18, 65]);
  });

  it('supports $ne / $like / $ilike', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where({ name: { $ilike: '%jo%' } }).select();
    expect(calls[0].sql).toContain('"name" ILIKE $1');
    expect(calls[0].params).toEqual(['%jo%']);
  });

  it('supports $in / $nin', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where({ id: { $in: [1, 2] }, role: { $nin: ['admin'] } }).select();
    expect(calls[0].sql).toContain('"id" IN ($1, $2)');
    expect(calls[0].sql).toContain('"role" NOT IN ($3)');
    expect(calls[0].params).toEqual([1, 2, 'admin']);
  });

  it('renders $null operator', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where({ a: { $null: true }, b: { $null: false } }).select();
    expect(calls[0].sql).toContain('"a" IS NULL AND "b" IS NOT NULL');
  });

  it('treats empty $in as FALSE (no rows)', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where({ id: { $in: [] } }).select();
    expect(calls[0].sql).toContain('WHERE FALSE');
    expect(calls[0].params).toEqual([]);
  });
});

describe('QueryBuilder parameter numbering', () => {
  it('does not collide when mixing raw-string and object where', async () => {
    const { db, calls } = fakeDb();
    await qb(db).where('name = $1', 'x').where({ age: 5 }).select();
    expect(calls[0].sql).toContain('WHERE name = $1 AND "age" = $2');
    expect(calls[0].params).toEqual(['x', 5]);
  });

  it('offsets where params after SET params in update', async () => {
    const { db, calls } = fakeDb({ rows: [{ id: 1 }] });
    await qb(db).where({ id: 7 }).update({ name: 'a', age: 9 });
    expect(calls[0].sql).toContain('SET "name" = $1, "age" = $2');
    expect(calls[0].sql).toContain('WHERE "id" = $3');
    expect(calls[0].sql).toContain('RETURNING *');
    expect(calls[0].params).toEqual(['a', 9, 7]);
  });
});

describe('QueryBuilder insert', () => {
  it('quotes columns and returns the inserted row', async () => {
    const { db, calls } = fakeDb({ rows: [{ id: 1, name: 'x' }] });
    const row = await qb(db).insert({ name: 'x' });
    expect(calls[0].sql).toContain('INSERT INTO "users" ("name") VALUES ($1)');
    expect(calls[0].sql).toContain('RETURNING *');
    expect(row).toEqual({ id: 1, name: 'x' });
  });

  it('auto-generates a UUID primary key when missing', async () => {
    const { db, calls } = fakeDb({ rows: [{}] });
    await qb(db, 'products', 'uuid').insert({ name: 'p' });
    const params = calls[0].params!;
    // id + name => 2 params, id is a UUID string
    expect(params).toHaveLength(2);
    expect(params).toContain('p');
    const uuid = params.find((p) => p !== 'p');
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('throws on empty insert', async () => {
    const { db } = fakeDb();
    await expect(qb(db).insert({})).rejects.toThrow(/at least one column/);
  });
});

describe('QueryBuilder guards', () => {
  it('throws on empty update', async () => {
    const { db } = fakeDb();
    await expect(qb(db).update({})).rejects.toThrow(/at least one column/);
  });

  it('refuses delete without a where clause', async () => {
    const { db } = fakeDb();
    await expect(qb(db).delete()).rejects.toThrow(/WHERE clause/);
  });

  it('treats objects with non-operator keys as an equality value', async () => {
    const { db, calls } = fakeDb();
    // e.g. a jsonb column compared against a literal object
    await qb(db).where({ meta: { foo: 'bar' } }).select();
    expect(calls[0].sql).toContain('"meta" = $1');
    expect(calls[0].params).toEqual([{ foo: 'bar' }]);
  });
});

describe('QueryBuilder order/limit/offset', () => {
  it('quotes order columns and appends limit/offset', async () => {
    const { db, calls } = fakeDb();
    await qb(db).orderBy('created_at', 'DESC').limit(10).offset(5).select();
    expect(calls[0].sql).toContain('ORDER BY "created_at" DESC');
    expect(calls[0].sql).toContain('LIMIT 10');
    expect(calls[0].sql).toContain('OFFSET 5');
  });

  it('count returns a number', async () => {
    const { db } = fakeDb({ rows: [{ count: '42' }] });
    const n = await qb(db).count();
    expect(n).toBe(42);
  });
});

# Tolcan

PostgreSQL için TypeScript desteği olan hafif, model tabanlı bir ORM. Tolcan, migration gerektirmeden veritabanı işlemleri için basit ve sezgisel bir API sağlar.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-Unlicense-green.svg)](LICENSE)

## Özellikler

- 🎯 **Model Tabanlı**: Modellerinizi TypeScript sınıfları olarak tanımlayın
- 🔄 **Transaction Desteği**: Otomatik rollback ile yerleşik transaction yönetimi
- 🚫 **Migration Yok**: Migration'larla uğraşmayın, modellerinize odaklanın (şimdilik)
- 📦 **TypeScript Öncelikli**: Tip güvenliği ile tam TypeScript desteği
- 🔌 **PostgreSQL**: PostgreSQL veritabanları için optimize edilmiş
- 🎨 **Basit API**: Temiz ve sezgisel sorgu oluşturucu
- 🏗️ **Modüler Mimari**: İyi organize edilmiş çekirdek yapı
- 🔑 **UUID Desteği**: Primary key için UUID veya serial seçeneği
- 🔧 **Ham SQL Desteği**: Gerektiğinde karmaşık ham SQL sorguları çalıştırın

## İçindekiler

- [Kurulum](#kurulum)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Yapılandırma](#yapılandırma)
- [Modeller](#modeller)
- [Sorgu Oluşturucu](#sorgu-oluşturucu)
- [Transaction'lar](#transactionlar)
- [API Referansı](#api-referansı)
- [Örnekler](#örnekler)
- [En İyi Uygulamalar](#en-iyi-uygulamalar)
- [Sorun Giderme](#sorun-giderme)

## Kurulum

```bash
npm install tolcan
```

Ayrıca PostgreSQL sürücüsünü de yüklemeniz gerekir:

```bash
npm install pg
npm install --save-dev @types/pg
```

## Hızlı Başlangıç

### 1. Veritabanına Bağlan

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

### 2. Model Tanımla

```typescript
import { Model } from 'tolcan';

// Serial (integer) primary key ile
class User extends Model {
  static tableName = 'users';
  static primaryKey = 'id';
  static primaryKeyType = 'serial'; // varsayılan

  getTableName(): string {
    return 'users';
  }

  getPrimaryKey(): string {
    return 'id';
  }
}

// UUID primary key ile
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

### 3. Modelini Kullan

```typescript
// Yeni bir kullanıcı oluştur
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// ID ile kullanıcı bul
const foundUser = await User.find(1);

// Tüm kullanıcıları bul
const allUsers = await User.findAll();
```

## Yapılandırma

### Veritabanı Bağlantı Seçenekleri

```typescript
import { connect } from 'tolcan';

connect({
  host: 'localhost',              // Veritabanı hostu (varsayılan: 'localhost')
  port: 5432,                     // Veritabanı portu (varsayılan: 5432)
  database: 'mydb',               // Veritabanı adı (gerekli)
  user: 'postgres',               // Veritabanı kullanıcısı (gerekli)
  password: 'password',            // Veritabanı şifresi (gerekli)
  ssl: false,                     // SSL bağlantısı (varsayılan: false)
  max: 20,                        // Maksimum pool boyutu (varsayılan: 20)
  idleTimeoutMillis: 30000,       // Boşta kalma zaman aşımı (varsayılan: 30000)
  connectionTimeoutMillis: 2000   // Bağlantı zaman aşımı (varsayılan: 2000)
});
```

### Veritabanından Bağlantıyı Kes

```typescript
import { disconnect } from 'tolcan';

// Uygulamanız kapanırken bağlantıyı kesin
await disconnect();
```

## Modeller

### Model Tanımlama

Modeller, temel `Model` sınıfını genişleten TypeScript sınıflarıdır. İki soyut metodu uygulamanız gerekir:

```typescript
import { Model } from 'tolcan';

// Serial (integer) primary key ile
class User extends Model {
  // Opsiyonel: tablo adını açıkça belirle
  static tableName = 'users';
  
  // Opsiyonel: primary key'i belirle (varsayılan: 'id')
  static primaryKey = 'id';
  
  // Opsiyonel: primary key tipini belirle (varsayılan: 'serial')
  static primaryKeyType = 'serial';

  // Gerekli: tablo adını döndür
  getTableName(): string {
    return 'users';
  }

  // Gerekli: primary key sütun adını döndür
  getPrimaryKey(): string {
    return 'id';
  }
}

// UUID primary key ile
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

**Not**: `static tableName` belirtmezseniz, Tolcan otomatik olarak sınıf adından türetir (örn: `User` → `users`, `ProductCategory` → `productcategories`).

### Primary Key Tipleri

Tolcan iki primary key tipini destekler:

- **`serial`** (varsayılan): PostgreSQL SERIAL/BIGSERIAL tipi. Otomatik artan integer değerler.
- **`uuid`**: UUID (Universally Unique Identifier) tipi. Otomatik UUID oluşturulur.

```typescript
// Serial primary key (varsayılan)
class User extends Model {
  static primaryKeyType = 'serial'; // veya belirtmeyin
  // ...
}

// UUID primary key
class Product extends Model {
  static primaryKeyType = 'uuid';
  // create() çağrıldığında otomatik UUID oluşturulur
  // ...
}
```

### Model Statik Metodları

#### `Model.find(id, options?)`

Primary key ile tek bir kayıt bulur.

```typescript
const user = await User.find(1);
// Döner: User instance veya null

// Transaction ile
const user = await User.find(1, { client: trx.getClient() });
```

#### `Model.findAll(options?)`

Opsiyonel filtreleme, sıralama ve sayfalama ile birden fazla kayıt bulur.

```typescript
// Tümünü bul
const users = await User.findAll();

// Koşullarla
const activeUsers = await User.findAll({
  where: { active: true }
});

// Sıralama ile
const sortedUsers = await User.findAll({
  orderBy: { column: 'created_at', direction: 'DESC' }
});

// Çoklu sıralama
const users = await User.findAll({
  orderBy: [
    { column: 'created_at', direction: 'DESC' },
    { column: 'name', direction: 'ASC' }
  ]
});

// Sayfalama ile
const users = await User.findAll({
  where: { active: true },
  orderBy: { column: 'created_at', direction: 'DESC' },
  limit: 10,
  offset: 20
});
```

#### `Model.findOne(options?)`

Koşullara uyan ilk kaydı bulur.

```typescript
const user = await User.findOne({
  where: { email: 'john@example.com' }
});
// Döner: User instance veya null
```

#### `Model.create(data, options?)`

Yeni bir kayıt oluşturur. UUID primary key kullanılıyorsa ve ID verilmemişse otomatik UUID oluşturulur.

```typescript
// Serial primary key ile
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});
// user.id otomatik olarak atanır

// UUID primary key ile
const product = await Product.create({
  name: 'Laptop',
  price: 999.99
});
// product.id otomatik olarak UUID oluşturulur

// Manuel UUID ile (opsiyonel)
const product = await Product.create({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Laptop',
  price: 999.99
});
```

#### `Model.update(data, options)`

Koşullara uyan kayıtları günceller. **Güvenlik için WHERE koşulu gereklidir.**

```typescript
// Tek kayıt güncelle
await User.update(
  { name: 'Jane Doe' },
  { where: { id: 1 } }
);

// Birden fazla kayıt güncelle
await User.update(
  { active: false },
  { where: { status: 'inactive' } }
);

// Döner: Güncellenen Model instance'larının dizisi
```

#### `Model.delete(options)`

Koşullara uyan kayıtları siler. **Güvenlik için WHERE koşulu gereklidir.**

```typescript
// Tek kayıt sil
await User.delete({ where: { id: 1 } });

// Birden fazla kayıt sil
await User.delete({ where: { active: false } });

// Döner: Silinen kayıt sayısı
```

#### `Model.count(where?, options?)`

Koşullara uyan kayıtları sayar.

```typescript
// Tümünü say
const total = await User.count();

// Koşullarla say
const activeCount = await User.count({ active: true });
```

#### `Model.query(client?)`

Gelişmiş sorgular için sorgu oluşturucu instance'ı alır.

```typescript
const builder = User.query();
// Döner: QueryBuilder instance
```

### Model Instance Metodları

#### `model.save(options?)`

Model instance'ını kaydeder. Yeni ise otomatik insert, mevcut ise (primary key'e göre) update yapar.

```typescript
// Yeni kayıt oluştur
const user = new User();
user.name = 'John Doe';
user.email = 'john@example.com';
await user.save();
// user.id artık set edildi

// Mevcut kaydı güncelle
user.name = 'Jane Doe';
await user.save();
```

#### `model.delete(options?)`

Model instance'ını veritabanından siler.

```typescript
const user = await User.find(1);
await user.delete();
// Döner: true eğer silindi, false aksi halde
```

#### `model.toJSON()`

Model instance'ını düz JSON nesnesine dönüştürür.

```typescript
const user = await User.find(1);
const json = user.toJSON();
// Döner: { id: 1, name: 'John', email: 'john@example.com', ... }
```

## Sorgu Oluşturucu

Sorgu oluşturucu, karmaşık sorgular oluşturmak için akıcı bir arayüz sağlar.

### Temel Kullanım

```typescript
const users = await User.query()
  .where({ active: true })
  .orderBy('created_at', 'DESC')
  .limit(10)
  .select();
```

### WHERE Koşulları

#### Nesne tabanlı koşullar

```typescript
// Basit eşitlik
.where({ active: true })

// NULL kontrolü
.where({ deleted_at: null })

// IN koşulu (dizi değerleri)
.where({ id: [1, 2, 3] })

// Çoklu koşullar (AND)
.where({ active: true })
.where({ age: 25 })
```

#### Ham SQL koşulları

```typescript
// Parametre ile ham SQL
.where('age > $1', 18)

// Çoklu ham koşullar
.where('age > $1', 18)
.where('created_at > $1', new Date('2024-01-01'))
```

### ORDER BY

```typescript
// Tek sütun
.orderBy('created_at', 'DESC')

// Çoklu sütunlar (orderByMultiple kullan)
.orderByMultiple([
  { column: 'created_at', direction: 'DESC' },
  { column: 'name', direction: 'ASC' }
])
```

### LIMIT ve OFFSET

```typescript
.limit(10)
.offset(20)
```

### SELECT

```typescript
// Tüm sütunları seç
.select()

// Belirli sütunları seç
.select(['id', 'name', 'email'])
```

### INSERT

```typescript
const user = await User.query().insert({
  name: 'John Doe',
  email: 'john@example.com'
});
// Döner: Eklenen kayıt
```

### UPDATE

```typescript
const updated = await User.query()
  .where({ id: 1 })
  .update({ name: 'Jane Doe' });
// Döner: Güncellenen kayıtların dizisi
```

### DELETE

```typescript
// Silme işlemi güvenlik için WHERE koşulu gerektirir
const deleted = await User.query()
  .where({ id: 1 })
  .delete();
// Döner: Silinen kayıt sayısı
```

### COUNT

```typescript
const count = await User.query()
  .where({ active: true })
  .count();
// Döner: Sayı
```

### FIRST

```typescript
const user = await User.query()
  .where({ email: 'john@example.com' })
  .first();
// Döner: İlk eşleşen kayıt veya null
```

## Ham SQL Sorguları

Sorgu oluşturucu ile kolayca ifade edilemeyen karmaşık sorgular için Tolcan ham SQL sorgularını destekler.

### Model.raw() Kullanımı

Bir modelden doğrudan ham SQL sorguları çalıştırın:

```typescript
// Basit ham sorgu
const users = await User.raw('SELECT * FROM users WHERE age > $1', [18]);

// Karmaşık join sorgusu
const results = await User.raw(`
  SELECT u.*, p.name as profile_name 
  FROM users u 
  LEFT JOIN profiles p ON u.id = p.user_id 
  WHERE u.active = $1 
  ORDER BY u.created_at DESC
`, [true]);

// Transaction ile
await transaction(async (trx) => {
  const users = await User.raw(
    'SELECT * FROM users WHERE active = $1',
    [true],
    { client: trx.getClient() }
  );
});
```

### QueryBuilder.raw() Kullanımı

Sorgu oluşturucu instance'ından ham SQL çalıştırın:

```typescript
const results = await User.query()
  .raw('SELECT COUNT(*) as total FROM users WHERE created_at > $1', [
    new Date('2024-01-01')
  ]);
```

### raw() Yardımcı Fonksiyonu

Model olmadan doğrudan ham SQL sorguları çalıştırın:

```typescript
import { raw } from 'tolcan';

// Basit sorgu
const results = await raw('SELECT * FROM users WHERE age > $1', [18]);

// Join'li karmaşık sorgu
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

// Transaction client ile
await transaction(async (trx) => {
  const results = await raw(
    'SELECT * FROM users WHERE active = $1',
    [true],
    trx.getClient()
  );
});
```

### Database.query() Doğrudan Kullanımı

Maksimum kontrol için Database sınıfını doğrudan kullanın:

```typescript
import { Database } from 'tolcan';

const database = Database.getInstance();
const result = await database.query(
  'SELECT * FROM users WHERE age > $1 AND active = $2',
  [18, true]
);
const users = result.rows;
```

### Parametreli Sorgular

SQL injection'ı önlemek için her zaman parametreli sorgular kullanın:

```typescript
// ✅ İyi - Parametreli
const users = await User.raw(
  'SELECT * FROM users WHERE email = $1',
  ['john@example.com']
);

// ❌ Kötü - SQL Injection riski
const email = "john@example.com'; DROP TABLE users; --";
const users = await User.raw(`SELECT * FROM users WHERE email = '${email}'`);
```

## Transaction'lar

Tolcan, hatalarda otomatik rollback ile yerleşik transaction desteği sağlar.

### Temel Transaction

```typescript
import { transaction } from 'tolcan';

await transaction(async (trx) => {
  const user = await User.create(
    { name: 'John', email: 'john@example.com' },
    { client: trx.getClient() }
  );

  // Aynı transaction içinde daha fazla işlem
  await User.update(
    { name: 'Jane' },
    { where: { id: 1 }, client: trx.getClient() }
  );

  // Transaction otomatik olarak commit edilir
  // veya bir hata oluşursa rollback yapılır
});
```

### Manuel Transaction Kontrolü

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

### Transaction Metodları

- `trx.getClient()` - Sorgulara geçirilecek transaction client'ını al
- `trx.commit()` - Transaction'ı commit et
- `trx.rollback()` - Transaction'ı rollback et
- `trx.isCommitted()` - Transaction'ın commit edilip edilmediğini kontrol et
- `trx.isRolledBack()` - Transaction'ın rollback edilip edilmediğini kontrol et

## API Referansı

### Database Sınıfı

```typescript
import { Database } from 'tolcan';

const db = Database.getInstance();
db.connect(config);
db.getPool();
db.query(text, params, client?);
db.disconnect();
db.getClient();
```

### Model Sınıfı

**Statik Metodlar:**
- `Model.find(id, options?)` - Primary key ile bul
- `Model.findAll(options?)` - Seçeneklerle tümünü bul
- `Model.findOne(options?)` - İlk eşleşeni bul
- `Model.create(data, options?)` - Yeni kayıt oluştur
- `Model.update(data, options)` - Kayıtları güncelle
- `Model.delete(options)` - Kayıtları sil
- `Model.count(where?, options?)` - Kayıtları say
- `Model.query(client?)` - Sorgu oluşturucu al
- `Model.raw(sql, params?, options?)` - Ham SQL sorgusu çalıştır
- `Model.getTableName()` - Tablo adını al
- `Model.getPrimaryKey()` - Primary key'i al

**Instance Metodları:**
- `model.save(options?)` - Instance'ı kaydet
- `model.delete(options?)` - Instance'ı sil
- `model.toJSON()` - JSON'a dönüştür

### QueryBuilder Sınıfı

**Metodlar:**
- `where(condition, value?)` - WHERE koşulu ekle
- `orderBy(column, direction?)` - ORDER BY ekle
- `orderByMultiple(orders)` - Çoklu ORDER BY ekle
- `limit(count)` - LIMIT ekle
- `offset(count)` - OFFSET ekle
- `select(columns?)` - SELECT çalıştır
- `insert(data)` - INSERT çalıştır
- `update(data)` - UPDATE çalıştır
- `delete()` - DELETE çalıştır
- `count()` - COUNT çalıştır
- `first()` - İlk sonucu al
- `raw(sql, params?)` - Ham SQL sorgusu çalıştır

### Tipler

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

## Örnekler

### Tam Örnek

```typescript
import { connect, Model, transaction } from 'tolcan';

// Veritabanına bağlan
connect({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password'
});

// Model tanımla
class User extends Model {
  static tableName = 'users';
  static primaryKey = 'id';
  static primaryKeyType = 'serial';

  getTableName(): string {
    return 'users';
  }

  getPrimaryKey(): string {
    return 'id';
  }
}

// UUID primary key ile model
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

// Kullanım
async function main() {
  // Oluştur
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com'
  });

  // UUID ile ürün oluştur
  const product = await Product.create({
    name: 'Laptop',
    price: 999.99
  });
  console.log('Product ID (UUID):', product.id);

  // Bul
  const found = await User.find(user.id);
  
  // Güncelle
  await User.update(
    { name: 'Jane Doe' },
    { where: { id: user.id } }
  );

  // Sil
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

### Gelişmiş Sorgu Örneği

```typescript
// Sorgu oluşturucu ile karmaşık sorgu
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

### Sayfalama Örneği

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

## En İyi Uygulamalar

### 1. Çoklu İşlemler İçin Her Zaman Transaction Kullanın

```typescript
// ✅ İyi
await transaction(async (trx) => {
  const user = await User.create({ ... }, { client: trx.getClient() });
  await Profile.create({ userId: user.id, ... }, { client: trx.getClient() });
});

// ❌ Kötü
const user = await User.create({ ... });
await Profile.create({ userId: user.id, ... }); // Bu başarısız olursa user yetim kalır
```

### 2. Modeller İçin TypeScript Tiplerini Kullanın

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

  // ... modelin geri kalanı
}
```

### 3. Hataları Düzgün Yönetin

```typescript
try {
  const user = await User.find(1);
  if (!user) {
    throw new Error('Kullanıcı bulunamadı');
  }
  // Kullanıcıyı kullan
} catch (error) {
  console.error('Hata:', error);
  // Hatayı yönet
}
```

### 4. Uygulama Kapanırken Bağlantıyı Kesin

```typescript
import { disconnect } from 'tolcan';

process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});
```

### 5. Karmaşık Sorgular İçin Sorgu Oluşturucu Kullanın

```typescript
// ✅ İyi - Karmaşık sorgular için sorgu oluşturucu kullan
const users = await User.query()
  .where({ active: true })
  .where('age > $1', 18)
  .orderBy('created_at', 'DESC')
  .select();

// ✅ Ayrıca iyi - Basit sorgular için findAll kullan
const users = await User.findAll({
  where: { active: true },
  orderBy: { column: 'created_at', direction: 'DESC' }
});
```

### 6. UUID vs Serial Primary Key Seçimi

```typescript
// ✅ Serial: Sıralı, artan ID'ler istiyorsanız
class User extends Model {
  static primaryKeyType = 'serial';
  // ...
}

// ✅ UUID: Dağıtık sistemler, güvenlik veya gizlilik için
class Product extends Model {
  static primaryKeyType = 'uuid';
  // ...
}
```

## Sorun Giderme

### Bağlantı Hataları

**Sorun**: `Database not connected. Call connect() first.`

**Çözüm**: Herhangi bir model kullanmadan önce `connect()` çağırdığınızdan emin olun.

```typescript
import { connect } from 'tolcan';

connect({
  database: 'mydb',
  user: 'postgres',
  password: 'password'
});
```

### Transaction Hataları

**Sorun**: `Transaction already committed`

**Çözüm**: `transaction()` yardımcı fonksiyonunu kullanırken `commit()` veya `rollback()` çağırmayın. Bu otomatik olarak yönetilir.

### WHERE Koşulu Gerekli

**Sorun**: `Update requires a WHERE clause` veya `Delete requires a WHERE clause`

**Çözüm**: Yanlışlıkla toplu güncelleme/silme işlemlerini önlemek için update ve delete işlemlerinde her zaman WHERE koşulu sağlayın.

```typescript
// ✅ İyi
await User.update({ name: 'John' }, { where: { id: 1 } });

// ❌ Kötü
await User.update({ name: 'John' }); // Hata!
```

### Tip Hataları

**Sorun**: Model özellikleri ile TypeScript hataları

**Çözüm**: Model özelliklerinizi uygun tiplerle tanımlayın:

```typescript
class User extends Model {
  id?: number;
  name!: string;
  email!: string;

  // ... geri kalanı
}
```

### UUID Hataları

**Sorun**: UUID oluşturulmuyor veya hata alıyorsunuz

**Çözüm**: PostgreSQL'de `uuid-ossp` extension'ının yüklü olduğundan emin olun:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Katkıda Bulunma

Katkılarınız memnuniyetle karşılanır! Lütfen bir Pull Request göndermekten çekinmeyin.

## Lisans

Unlicense - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

TypeScript ve PostgreSQL topluluğu için ❤️ ile yapıldı.


import { connect, Model, transaction, raw } from 'tolcan';

// Define a User model with serial primary key
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

// Define a Product model with UUID primary key
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

async function main() {
  // Connect to database
  connect({
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'postgres',
    password: 'password'
  });

  try {
    // Create a new user
    const newUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    });
    console.log('Created user:', newUser);

    // Find user by ID
    const user = await User.find(newUser.id);
    console.log('Found user:', user);

    // Find all users
    const allUsers = await User.findAll();
    console.log('All users:', allUsers);

    // Find with conditions
    const youngUsers = await User.findAll({
      where: { age: { $lt: 25 } },
      orderBy: { column: 'created_at', direction: 'DESC' },
      limit: 10
    });

    // Update user
    await User.update(
      { name: 'Jane Doe' },
      { where: { id: newUser.id } }
    );

    // Using instance methods
    const userInstance = new User();
    userInstance.name = 'Bob';
    userInstance.email = 'bob@example.com';
    await userInstance.save();
    console.log('Saved user:', userInstance);

    // Transaction example
    await transaction(async (trx) => {
      const user1 = await User.create(
        { name: 'Alice', email: 'alice@example.com' },
        { client: trx.getClient() }
      );

      const user2 = await User.create(
        { name: 'Bob', email: 'bob@example.com' },
        { client: trx.getClient() }
      );

      console.log('Created users in transaction:', user1, user2);
    });

    // Query builder example
    const activeUsers = await User.query()
      .where({ active: true })
      .orderBy('created_at', 'DESC')
      .limit(10)
      .select();

    console.log('Active users:', activeUsers);

    // UUID primary key example
    const product = await Product.create({
      name: 'Laptop',
      price: 999.99
    });
    console.log('Created product with UUID:', product.id);

    // Find product by UUID
    const foundProduct = await Product.find(product.id);
    console.log('Found product:', foundProduct);

    // Raw SQL examples
    // Simple raw query using Model.raw()
    const usersByAge = await User.raw(
      'SELECT * FROM users WHERE age > $1 ORDER BY age DESC',
      [25]
    );
    console.log('Users over 25:', usersByAge);

    // Complex raw query with joins
    const userStats = await User.raw(`
      SELECT 
        u.id,
        u.name,
        COUNT(p.id) as product_count
      FROM users u
      LEFT JOIN products p ON u.id = p.user_id
      GROUP BY u.id, u.name
      HAVING COUNT(p.id) > $1
    `, [0]);
    console.log('User stats:', userStats);

    // Raw query using QueryBuilder.raw()
    const totalUsers = await User.query()
      .raw('SELECT COUNT(*) as count FROM users WHERE active = $1', [true]);
    console.log('Total active users:', totalUsers);

    // Raw query using raw() helper function
    const allData = await raw(`
      SELECT 
        u.name as user_name,
        p.name as product_name,
        p.price
      FROM users u
      CROSS JOIN products p
      WHERE u.active = $1
      LIMIT $2
    `, [true, 10]);
    console.log('Cross join result:', allData);

    // Raw query with transaction
    await transaction(async (trx) => {
      const result = await User.raw(
        'SELECT * FROM users WHERE created_at > $1',
        [new Date('2024-01-01')],
        { client: trx.getClient() }
      );
      console.log('Users created in 2024:', result);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

main();


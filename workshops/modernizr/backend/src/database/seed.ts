import bcrypt from 'bcrypt';
import { pool } from '../config/database';

export async function seedDatabase(): Promise<void> {
  try {
    console.log('Seeding database with initial data...');

    // Seed categories
    await seedCategories();

    // Seed sample users
    await seedUsers();

    // Seed sample products
    await seedProducts();

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

async function seedCategories(): Promise<void> {
  console.log('Seeding categories...');

  const categories = [
    // Top-level categories
    { name: 'Electronics', parent_id: null },
    { name: 'Garden & Outdoor', parent_id: null },
    { name: 'Home & Kitchen', parent_id: null },
    { name: 'Books', parent_id: null },
    { name: 'Clothing & Accessories', parent_id: null },
    { name: 'Sports & Outdoors', parent_id: null },
  ];

  // Insert top-level categories
  for (const category of categories) {
    await pool.execute(
      'INSERT IGNORE INTO categories (name, parent_id) VALUES (?, ?)',
      [category.name, category.parent_id]
    );
  }

  // Get category IDs for subcategories
  const [electronicsRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Electronics']);
  const [gardenRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Garden & Outdoor']);
  const [homeRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Home & Kitchen']);
  const [booksRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Books']);
  const [clothingRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Clothing & Accessories']);
  const [sportsRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Sports & Outdoors']);

  const electronicsId = (electronicsRows as any[])[0]?.id;
  const gardenId = (gardenRows as any[])[0]?.id;
  const homeId = (homeRows as any[])[0]?.id;
  const booksId = (booksRows as any[])[0]?.id;
  const clothingId = (clothingRows as any[])[0]?.id;
  const sportsId = (sportsRows as any[])[0]?.id;

  // Subcategories
  const subcategories = [
    // Electronics subcategories
    { name: 'Laptops', parent_id: electronicsId },
    { name: 'Smartphones', parent_id: electronicsId },
    { name: 'Tablets', parent_id: electronicsId },
    { name: 'Headphones', parent_id: electronicsId },

    // Garden subcategories
    { name: 'Tools', parent_id: gardenId },
    { name: 'Plants & Seeds', parent_id: gardenId },
    { name: 'Outdoor Furniture', parent_id: gardenId },

    // Home & Kitchen subcategories
    { name: 'Kitchen Appliances', parent_id: homeId },
    { name: 'Cookware', parent_id: homeId },
    { name: 'Home Decor', parent_id: homeId },

    // Books subcategories
    { name: 'Fiction', parent_id: booksId },
    { name: 'Non-Fiction', parent_id: booksId },
    { name: 'Technical', parent_id: booksId },

    // Clothing subcategories
    { name: 'Men\'s Clothing', parent_id: clothingId },
    { name: 'Women\'s Clothing', parent_id: clothingId },
    { name: 'Shoes', parent_id: clothingId },

    // Sports subcategories
    { name: 'Fitness Equipment', parent_id: sportsId },
    { name: 'Outdoor Recreation', parent_id: sportsId },
    { name: 'Team Sports', parent_id: sportsId },
  ];

  // Insert subcategories
  for (const subcategory of subcategories) {
    if (subcategory.parent_id) {
      await pool.execute(
        'INSERT IGNORE INTO categories (name, parent_id) VALUES (?, ?)',
        [subcategory.name, subcategory.parent_id]
      );
    }
  }

  console.log('Categories seeded successfully');
}

async function seedUsers(): Promise<void> {
  console.log('Seeding sample users...');
  console.log('WARNING: These are development seed users with secure random passwords.');
  console.log('In production, create users through the registration endpoint instead.');

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

  const users = [
    {
      username: 'admin',
      email: 'admin@example.com',
      password: '0137183966133de0ace3d7e65e025d12', // Secure random password
      first_name: 'Admin',
      last_name: 'User',
      is_seller: true,
    },
    {
      username: 'seller1',
      email: 'seller1@example.com',
      password: 'cd6c38a4da48859e688eac7ce394f22d', // Secure random password
      first_name: 'John',
      last_name: 'Seller',
      is_seller: true,
    },
    {
      username: 'customer1',
      email: 'customer1@example.com',
      password: '352a832e68fc38f16331c4be7353efa8', // Secure random password
      first_name: 'Jane',
      last_name: 'Customer',
      is_seller: false,
    },
    {
      username: 'customer2',
      email: 'customer2@example.com',
      password: '4dd9c12a71d1f3e5602678da4591d2a2', // Secure random password
      first_name: 'Bob',
      last_name: 'Smith',
      is_seller: false,
    },
  ];

  for (const user of users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);

      await pool.execute(
        `INSERT IGNORE INTO users 
         (username, email, password_hash, first_name, last_name, is_seller) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.username,
          user.email,
          hashedPassword,
          user.first_name,
          user.last_name,
          user.is_seller,
        ]
      );
    } catch (error) {
      console.warn(`Warning: Could not insert user ${user.username}:`, error);
    }
  }

  console.log('Sample users seeded successfully');
}

async function seedProducts(): Promise<void> {
  console.log('Seeding sample products...');

  // Get admin user ID (seller)
  const [adminRows] = await pool.execute('SELECT id FROM users WHERE username = ?', ['admin']);
  const adminId = (adminRows as any[])[0]?.id;

  if (!adminId) {
    console.warn('Admin user not found, skipping product seeding');
    return;
  }

  // Get category IDs
  const [laptopRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Laptops']);
  const [booksRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Fiction']);
  const [kitchenRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Kitchen Appliances']);
  const [clothingRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Men\'s Clothing']);
  const [sportsRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Fitness Equipment']);
  const [gardenRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', ['Tools']);

  const laptopCategoryId = (laptopRows as any[])[0]?.id;
  const booksCategoryId = (booksRows as any[])[0]?.id;
  const kitchenCategoryId = (kitchenRows as any[])[0]?.id;
  const clothingCategoryId = (clothingRows as any[])[0]?.id;
  const sportsCategoryId = (sportsRows as any[])[0]?.id;
  const gardenCategoryId = (gardenRows as any[])[0]?.id;

  const products = [
    {
      name: 'Professional Laptop 14-inch',
      description: 'High-performance laptop with advanced processor, 14-inch display, 16GB RAM, 512GB SSD. Perfect for professional work and creative projects.',
      price: 1999.99,
      inventory_quantity: 15,
      category_id: laptopCategoryId,
      seller_id: adminId
    },
    {
      name: 'Classic American Novel',
      description: 'A timeless story about the Jazz Age exploring themes of wealth, love, and the American Dream. A must-read classic.',
      price: 12.99,
      inventory_quantity: 50,
      category_id: booksCategoryId,
      seller_id: adminId
    },
    {
      name: 'YourKitchen Stand Mixer',
      description: 'Professional 5-quart stand mixer with 10 speeds. Includes dough hook, flat beater, and wire whip. Perfect for baking enthusiasts.',
      price: 299.99,
      inventory_quantity: 8,
      category_id: kitchenCategoryId,
      seller_id: adminId
    },
    {
      name: 'Classic Blue Jeans',
      description: 'Classic straight-leg jeans in dark wash. Made from 100% cotton denim. Timeless style and comfortable fit.',
      price: 89.99,
      inventory_quantity: 25,
      category_id: clothingCategoryId,
      seller_id: adminId
    },
    {
      name: 'Adjustable Dumbbell Set',
      description: 'Space-saving adjustable dumbbells with weight range from 5-50 lbs per dumbbell. Quick-change system for efficient workouts.',
      price: 449.99,
      inventory_quantity: 12,
      category_id: sportsCategoryId,
      seller_id: adminId
    },
    {
      name: 'Cordless Drill Kit',
      description: '20V MAX cordless drill with 2 batteries, charger, and carrying case. 1/2-inch chuck, LED light, and 15 clutch settings.',
      price: 129.99,
      inventory_quantity: 20,
      category_id: gardenCategoryId,
      seller_id: adminId
    }
  ];

  for (const product of products) {
    if (product.category_id) {
      try {
        await pool.execute(
          `INSERT IGNORE INTO products 
           (seller_id, category_id, name, description, price, inventory_quantity) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            product.seller_id,
            product.category_id,
            product.name,
            product.description,
            product.price,
            product.inventory_quantity
          ]
        );
      } catch (error) {
        console.warn(`Warning: Could not insert product ${product.name}:`, error);
      }
    }
  }

  console.log('Sample products seeded successfully');
}

export async function clearSeedData(): Promise<void> {
  try {
    console.log('Clearing seed data...');

    // Clear in reverse order of dependencies
    await pool.execute('DELETE FROM order_items');
    await pool.execute('DELETE FROM orders');
    await pool.execute('DELETE FROM shopping_carts');
    await pool.execute('DELETE FROM products');
    await pool.execute('DELETE FROM users');
    await pool.execute('DELETE FROM categories');

    // Reset auto-increment counters
    await pool.execute('ALTER TABLE order_items AUTO_INCREMENT = 1');
    await pool.execute('ALTER TABLE orders AUTO_INCREMENT = 1');
    await pool.execute('ALTER TABLE shopping_carts AUTO_INCREMENT = 1');
    await pool.execute('ALTER TABLE products AUTO_INCREMENT = 1');
    await pool.execute('ALTER TABLE users AUTO_INCREMENT = 1');
    await pool.execute('ALTER TABLE categories AUTO_INCREMENT = 1');

    console.log('Seed data cleared successfully');
  } catch (error) {
    console.error('Error clearing seed data:', error);
    throw error;
  }
}
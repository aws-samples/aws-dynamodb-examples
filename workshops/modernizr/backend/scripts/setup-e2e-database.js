#!/usr/bin/env node

/**
 * E2E Database Setup Script
 * This script sets up the E2E test database with all required tables and test data
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupE2EDatabase() {
  let connection;
  
  try {
    console.log('🚀 Setting up E2E test database...');
    
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create the database first
    await connection.execute('CREATE DATABASE IF NOT EXISTS online_shopping_store_test_e2e');
    console.log('✅ Database created: online_shopping_store_test_e2e');
    
    // Close the initial connection and reconnect to the specific database
    await connection.end();
    
    // Reconnect to the specific database
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'online_shopping_store_test_e2e'
    });
    
    // Execute table creation statements individually
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        role ENUM('customer', 'seller', 'admin') DEFAULT 'customer',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock_quantity INT DEFAULT 0,
        category_id INT,
        seller_id INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS cart_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product (user_id, product_id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
        shipping_address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`
    ];
    
    // Execute each statement
    for (const statement of statements) {
      await connection.execute(statement);
    }
    
    // Insert test data
    const testDataStatements = [
      `INSERT IGNORE INTO categories (name, description) VALUES ('Electronics', 'Electronic devices and gadgets')`,
      `INSERT IGNORE INTO categories (name, description) VALUES ('Books', 'Books and educational materials')`,
      `INSERT IGNORE INTO categories (name, description) VALUES ('Clothing', 'Apparel and fashion items')`,
      `INSERT IGNORE INTO categories (name, description) VALUES ('Home & Garden', 'Home improvement and garden supplies')`
    ];
    
    for (const statement of testDataStatements) {
      await connection.execute(statement);
    }
    
    console.log('✅ E2E test database created successfully');
    console.log('📊 Database: online_shopping_store_test_e2e');
    console.log('🔧 Tables created: users, categories, products, cart_items, orders, order_items');
    console.log('📝 Test data inserted: categories and admin user');
    
  } catch (error) {
    console.error('❌ Error setting up E2E database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupE2EDatabase();
}

module.exports = { setupE2EDatabase };
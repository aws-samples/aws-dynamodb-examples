import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { pool, databaseConfig } from '../config/database';

export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database schema...');
    
    // First create the database
    const initConnection = await mysql.createConnection({
      host: databaseConfig.host,
      port: databaseConfig.port,
      user: databaseConfig.user,
      password: databaseConfig.password,
    });
    
    await initConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseConfig.database}\``);
    await initConnection.end();
    
    // Now use the regular pool to create tables
    const connection = await pool.getConnection();
    
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove comments and clean up
    schemaSql = schemaSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // Split the SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => {
        if (statement.length === 0) return false;
        if (statement.startsWith('CREATE DATABASE')) return false;
        if (statement.trim().startsWith('USE ')) return false;
        return true;
      });
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await connection.execute(statement);
      } catch (error) {
        // Skip errors for statements that might already exist
        if (error instanceof Error && !error.message.includes('already exists')) {
          console.warn('Warning executing statement:', error.message);
        }
      }
    }
    
    // Ensure image_url column exists in products table (fix for schema inconsistency)
    try {
      // Check if column exists first
      const [rows] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'image_url'
      `, [databaseConfig.database]);
      
      if ((rows as any[]).length === 0) {
        // Column doesn't exist, add it
        await connection.execute(`
          ALTER TABLE products 
          ADD COLUMN image_url VARCHAR(500) NULL 
          AFTER inventory_quantity
        `);
        console.log('Added missing image_url column to products table');
      }
    } catch (error) {
      console.warn('Warning checking/adding image_url column:', error);
    }
    
    connection.release();
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function dropDatabase(): Promise<void> {
  try {
    console.log('Dropping database...');
    
    // Create a connection without specifying database for dropping
    const dropConnection = await mysql.createConnection({
      host: databaseConfig.host,
      port: databaseConfig.port,
      user: databaseConfig.user,
      password: databaseConfig.password,
    });
    
    await dropConnection.execute(`DROP DATABASE IF EXISTS \`${databaseConfig.database}\``);
    await dropConnection.end();
    
    console.log('Database dropped successfully');
  } catch (error) {
    console.error('Error dropping database:', error);
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  try {
    await dropDatabase();
    // Wait a moment for the drop to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    await initializeDatabase();
    console.log('Database reset completed');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}
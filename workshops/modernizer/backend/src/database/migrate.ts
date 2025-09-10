#!/usr/bin/env node

import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import { pool, closePool } from '../config/database';

async function runMigration(migrationFile: string): Promise<void> {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));
    
    const connection = await pool.getConnection();
    
    try {
      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
      }
      console.log(`✅ Migration ${migrationFile} completed successfully`);
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error);
    throw error;
  }
}

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.log('Usage: npm run db:migrate <migration-file>');
    console.log('Example: npm run db:migrate add_image_url_to_products.sql');
    process.exit(1);
  }
  
  try {
    await runMigration(migrationFile);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runMigration };
#!/usr/bin/env node

import { initializeDatabase, resetDatabase } from './init';
import { seedDatabase, clearSeedData } from './seed';
import { testConnection, closePool } from '../config/database';

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'init':
        console.log('Initializing database...');
        await initializeDatabase();
        break;
        
      case 'seed':
        console.log('Seeding database...');
        await seedDatabase();
        break;
        
      case 'reset':
        console.log('Resetting database...');
        await resetDatabase();
        await seedDatabase();
        break;
        
      case 'clear':
        console.log('Clearing seed data...');
        await clearSeedData();
        break;
        
      case 'test':
        console.log('Testing database connection...');
        const isConnected = await testConnection();
        if (isConnected) {
          console.log('✅ Database connection successful');
        } else {
          console.log('❌ Database connection failed');
          process.exit(1);
        }
        break;
        
      default:
        console.log('Usage: npm run db <command>');
        console.log('Commands:');
        console.log('  init  - Initialize database schema');
        console.log('  seed  - Seed database with sample data');
        console.log('  reset - Reset database (drop, init, seed)');
        console.log('  clear - Clear all seed data');
        console.log('  test  - Test database connection');
        break;
    }
  } catch (error) {
    console.error('Database operation failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
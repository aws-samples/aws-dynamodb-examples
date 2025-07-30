// Simple test to check database module
const { pool } = require('./dist/config/database');

console.log('Pool object:', pool);
console.log('Pool type:', typeof pool);

if (pool) {
  console.log('Pool execute method:', typeof pool.execute);
  
  pool.execute('SELECT 1 as test')
    .then(result => {
      console.log('Query successful:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Query failed:', error);
      process.exit(1);
    });
} else {
  console.error('Pool is undefined');
  process.exit(1);
}
// Quick database connection test
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'online_shopping_store',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('Testing database connection...');
    const [rows] = await pool.execute('SELECT 1 as test');
    console.log('Connection successful:', rows);

    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Available tables:', tables);

    const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
    console.log('User count:', users);

    await pool.end();
    console.log('Database test completed successfully');
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testConnection();
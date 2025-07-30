const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 8102;

app.use(express.json());

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'online_shopping_store'
    });
    
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    await connection.end();
    
    res.json({ 
      success: true, 
      message: 'Database connection successful',
      userCount: rows[0].count 
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/simple', (req, res) => {
  console.log('Simple endpoint hit');
  res.json({ message: 'Simple endpoint working' });
});

app.listen(PORT, () => {
  console.log(`Minimal test server running on port ${PORT}`);
});
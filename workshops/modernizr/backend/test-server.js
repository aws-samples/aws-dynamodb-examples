const express = require('express');
const app = express();
const PORT = 8101;

app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Simple test working' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
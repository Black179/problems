require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

// Minimal CORS - just allow everything
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Immediate response health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Railway specific health check
app.get('/railway/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Basic API response
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for any other routes
app.use('*', (req, res) => {
  res.status(200).json({
    message: 'API endpoint',
    timestamp: new Date().toISOString()
  });
});

// Start server immediately
const server = app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log('✅ Ready for Railway deployment');
});

// Handle shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
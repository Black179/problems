require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 8080;

// Simple CORS setup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Health check - responds immediately (for Railway monitoring)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Railway health check endpoint
app.get('/railway/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Basic route - responds immediately
app.get('/', (req, res) => {
  res.json({
    message: 'Problem Tracker API - Server is running!',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB with fast timeout (don't wait for it)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('🚨 Running without database');
  }
};

// Start MongoDB connection in background
connectDB();

// Start server immediately - no blocking operations
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏱️  Startup time: ${process.uptime()}s`);
  console.log('🔗 Health check: /health');
  console.log('🔗 Railway health: /railway/health');

  // Signal that server is ready (for Railway)
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('✅ Railway deployment ready');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(() => {
      console.log('✅ Database connection closed');
      process.exit(0);
    });
  });
});
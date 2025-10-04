require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Import models
const Admin = require('./models/Admin');
const Problem = require('./models/Problem');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'https://problems-beige.vercel.app',
      'https://problems-production.up.railway.app',
      'http://localhost:8080',
      'https://localhost:8080'
    ];

    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      // For development, allow all origins to prevent CORS errors
      console.log('⚠️  Allowing unknown origin for development:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Health check endpoints (for monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Railway specific health check endpoint
app.get('/railway/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint for Railway
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Problem Tracker API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB with optimized settings
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('🚨 Running without database');
    return false;
  }
};

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// Create default admin user if it doesn't exist
async function createDefaultAdmin() {
  try {
    console.log('🔧 Creating default admin user...');
    const existingAdmin = await Admin.findOne({ email: 'admin' });

    if (!existingAdmin) {
      console.log('📝 No existing admin found, creating new one...');
      const hashedPassword = await bcrypt.hash('SecureAdmin@2025', 10); // Consistent with manual creation
      const admin = new Admin({
        name: 'Administrator',
        email: 'admin',
        password: hashedPassword
      });
      await admin.save();
      console.log('✅ Default admin user created successfully');
      console.log('Email: admin');
      console.log('Password: SecureAdmin@2025');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
}

// Initialize database connection and admin
let dbConnected = false;
connectDB().then(async (connected) => {
  dbConnected = connected;
  if (connected) {
    const existing = await Admin.findOne({ email: 'admin' });
    if (!existing) {
      await createDefaultAdmin();
    } else {
      console.log('✅ Admin already exists, skipping creation');
    }
  }
});

// Manual admin creation endpoint (for debugging)
app.post('/api/admin/create', async (req, res) => {
  try {
    console.log('🔄 Manual admin creation requested');

    if (!dbConnected) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Force delete any existing admin
    await Admin.deleteMany({ email: 'admin' });
    console.log('🗑️ All existing admin users deleted');

    // Create new admin with bcrypt 10 rounds (for compatibility)
    const hashedPassword = await bcrypt.hash('SecureAdmin@2025', 10);
    const admin = new Admin({
      name: 'Administrator',
      email: 'admin',
      password: hashedPassword
    });

    await admin.save();
    console.log('✅ Fresh admin user created');
    console.log('Email: admin');
    console.log('Password: SecureAdmin@2025');
    console.log('Hash rounds: 10');

    res.json({
      message: 'Admin user created successfully',
      email: 'admin',
      password: 'SecureAdmin@2025'
    });
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Check database status and admin user
app.get('/api/admin/debug', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.json({
        database: 'disconnected',
        adminExists: false,
        message: 'Database not connected'
      });
    }

    const admin = await Admin.findOne({ email: 'admin' });

    res.json({
      database: 'connected',
      adminExists: !!admin,
      adminEmail: admin ? admin.email : null,
      message: admin ? 'Admin user exists' : 'Admin user not found'
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: 'Debug check failed' });
  }
});
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Admin login attempt for email:', email);

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!dbConnected) {
      console.log('❌ Database not connected');
      return res.status(500).json({ error: 'Database not available' });
    }

    console.log('🔍 Looking for admin user in database...');
    const admin = await Admin.findOne({ email });
    console.log('📧 Admin found:', !!admin);

    if (!admin) {
      console.log('❌ Admin user not found in database');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Admin user found, checking password...');
    console.log('📧 Admin email:', admin.email);
    console.log('🔑 Password length:', password.length);
    console.log('🔑 Password type:', typeof password);
    console.log('🔑 Password encoding check:', Buffer.from(password).toString('utf8'));
    console.log('🔑 Stored hash length:', admin.password.length);
    console.log('🔑 Password (first 5 chars):', password.substring(0, 5) + '...');
    console.log('🔑 Stored hash (first 10 chars):', admin.password.substring(0, 10) + '...');
    console.log('🔑 Password === "SecureAdmin@2025":', password === 'SecureAdmin@2025');
    console.log('🔑 Password length === 16:', password.length === 16);

    // Additional debugging for bcrypt comparison
    console.log('🔍 Starting bcrypt comparison...');

    // Generate a test hash with the same password to compare
    const testHash = await bcrypt.hash('SecureAdmin@2025', 10);
    console.log('🔑 Test hash (first 10 chars):', testHash.substring(0, 10) + '...');
    console.log('🔑 Stored hash matches test hash:', admin.password === testHash);

    const validPassword = await bcrypt.compare(password, admin.password);
    console.log('🔐 bcrypt.compare result:', validPassword);

    // Try comparing with freshly generated hash
    const testComparison = await bcrypt.compare(password, testHash);
    console.log('🔐 Test comparison result:', testComparison);

    console.log('🔐 Password validation completed');

    if (!validPassword) {
      console.log('❌ Invalid password provided');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Password correct, generating JWT token...');

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful, token generated');
    res.json({
      message: 'Login successful',
      token,
      email: admin.email,
      name: admin.name
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token
app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, email: req.user.email, name: req.user.name });
});

// Submit a new problem (public - no authentication required)
app.post('/api/problems', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { name, contactNo, status, problem, field, problemType, urgency, whenStarted, solutionsTried, expectedOutcome } = req.body;

    // Validation - Only name, contact, and problem are required
    if (!name || !contactNo || !problem) {
      return res.status(400).json({
        error: 'Name, contact number, and problem description are required',
        received: { name: !!name, contactNo: !!contactNo, problem: !!problem }
      });
    }

    const newProblem = new Problem({
      name,
      contactNo,
      status: status || 'Neither',
      problem,
      field: field || '',
      problemType: problemType || '',
      urgency: urgency || '',
      whenStarted: whenStarted || '',
      solutionsTried: solutionsTried || '',
      expectedOutcome: expectedOutcome || ''
    });

    const savedProblem = await newProblem.save();

    res.status(201).json({
      message: 'Problem submitted successfully',
      data: savedProblem
    });
  } catch (error) {
    console.error('❌ Error submitting problem:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

// Get problems with filtering and sorting (protected)
app.get('/api/problems', authenticateToken, async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { field, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {};
    if (field) query.field = field;
    if (status) query.status = status;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const problems = await Problem.find(query).sort(sort);

    res.json({
      count: problems.length,
      data: problems
    });
  } catch (error) {
    console.error('❌ Error fetching problems:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single problem by ID (protected)
app.get('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(problem);
  } catch (error) {
    console.error('❌ Error fetching problem:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a problem (protected)
app.delete('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const problem = await Problem.findByIdAndDelete(req.params.id);

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json({ message: 'Problem deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting problem:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get problems count (for debugging)
app.get('/api/problems/count', authenticateToken, async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const count = await Problem.countDocuments();

    res.json({
      count,
      message: `Found ${count} problems in database`
    });
  } catch (error) {
    console.error('❌ Error counting problems:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server immediately - no blocking operations
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏱️  Startup time: ${process.uptime()}s`);
  console.log('🔗 Health check: /health');
  console.log('🔗 Railway health: /railway/health');
  console.log('🔗 Root: /');

  // Signal that server is ready (for Railway)
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('✅ Railway deployment ready');
    // Ensure all endpoints are registered before signaling ready
    setTimeout(() => {
      console.log('✅ All endpoints registered and ready');
    }, 100);
  }
});

// Graceful shutdown - Fixed for Mongoose 6+
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    if (dbConnected) {
      mongoose.connection.close();
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});
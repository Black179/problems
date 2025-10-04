require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Problem = require('./models/Problem');
const Admin = require('./models/Admin');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from Vercel (your deployed frontend)
    const allowedOrigins = [
      'http://localhost:3000',
      'https://problems-production.up.railway.app',
      'https://problems-beige.vercel.app', // Your Vercel site
    ];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB with faster timeout
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 3000, // 3 second timeout (reduced)
  socketTimeoutMS: 10000, // 10 second socket timeout
  bufferCommands: false, // Disable mongoose buffering
  bufferMaxEntries: 0, // Disable mongoose buffering
}).then(() => {
  console.log('✅ Connected to MongoDB');
  console.log('📊 Database:', mongoose.connection.name);

  // Initialize admin with timeout
  console.log('🔗 Initializing admin user...');
  setTimeout(async () => {
    try {
      await createDefaultAdmin();
    } catch (error) {
      console.error('❌ Admin initialization failed:', error.message);
    }
  }, 500);

}).catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.log('🚨 Starting server without database');
});

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
    const existingAdmin = await Admin.findOne({ email: 'admin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('SecureAdmin@2025', 10);
      const admin = new Admin({
        name: 'Administrator',
        email: 'admin',
        password: hashedPassword
      });
      await admin.save();
      console.log('Default admin user created');
      console.log('Email: admin');
      console.log('Password: SecureAdmin@2025');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  Please change this password after first login!');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
    console.error('Error stack:', error.stack);
  }
}

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('🔐 Admin login attempt for email:', email);

  if (!email || !password) {
    console.log('❌ Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    console.log('🔍 Looking for admin user in database...');
    const admin = await Admin.findOne({ email });

    if (!admin) {
      console.log('❌ Admin user not found in database');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Admin user found, checking password...');
    console.log('📧 Admin email:', admin.email);
    console.log('🔑 Password length:', password.length);
    console.log('🔑 Stored hash length:', admin.password.length);
    console.log('🔑 Password (first 5 chars):', password.substring(0, 5) + '...');
    console.log('🔑 Stored hash (first 10 chars):', admin.password.substring(0, 10) + '...');

    const validPassword = await bcrypt.compare(password, admin.password);
    console.log('🔐 Password valid:', validPassword);
    console.log('🔐 Password === "SecureAdmin@2025":', password === 'SecureAdmin@2025');
    console.log('🔐 Password length === 16:', password.length === 16);

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
    console.error('❌ Error during login:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

// Verify token (for frontend to check if token is still valid)
app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, email: req.user.email, name: req.user.name });
});

// Submit a new problem (public - no authentication required)
app.post('/api/problems', async (req, res) => {
  try {
    console.log('📥 Received problem submission request');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    const { name, contactNo, status, problem, field, problemType, urgency, whenStarted, solutionsTried, expectedOutcome } = req.body;

    // Validation - Only name, contact, and problem are required
    if (!name || !contactNo || !problem) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        error: 'Name, contact number, and problem description are required',
        received: { name: !!name, contactNo: !!contactNo, problem: !!problem }
      });
    }

    console.log('✅ Validation passed, creating problem object');
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

    console.log('💾 Saving problem to database:', newProblem.name);
    const savedProblem = await newProblem.save();
    console.log('✅ Problem saved successfully with ID:', savedProblem._id);

    res.status(201).json({
      message: 'Problem submitted successfully',
      data: savedProblem
    });
  } catch (error) {
    console.error('❌ Error submitting problem:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

// Get problems count (for debugging data persistence)
app.get('/api/problems/count', authenticateToken, async (req, res) => {
  try {
    const count = await Problem.countDocuments();
    console.log('📊 Total problems in database:', count);

    res.json({
      count,
      message: `Found ${count} problems in database`
    });
  } catch (error) {
    console.error('Error counting problems:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent problems (for debugging)
app.get('/api/problems/recent', authenticateToken, async (req, res) => {
  try {
    const recentProblems = await Problem.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name field createdAt');

    console.log('🔍 Recent problems:', recentProblems.length);

    res.json({
      count: recentProblems.length,
      data: recentProblems
    });
  } catch (error) {
    console.error('Error fetching recent problems:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all problems with filtering and sorting (protected - requires authentication)
app.get('/api/problems', authenticateToken, async (req, res) => {
  try {
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
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single problem by ID (protected - requires authentication)
app.get('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(problem);
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a problem (protected - requires authentication)
app.delete('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json({ message: 'Problem deleted successfully' });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Problem Tracker API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Force restart - $(Get-Date)
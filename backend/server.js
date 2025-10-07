require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
<<<<<<< HEAD
const morgan = require('morgan');
const problemRoutes = require('./routes/problems');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/problems', problemRoutes);

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
=======
const jwt = require('jsonwebtoken');

const Admin = require('./models/Admin');
const Problem = require('./models/Problem');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // mobile apps
    const allowedOrigins = [
      'http://localhost:3000',
      'https://your-frontend.vercel.app',
    ];
    if (allowedOrigins.some(o => origin.includes(o))) callback(null, true);
    else callback(null, true); // allow others in development
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB connected');
  await createDefaultAdmin();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Create default admin
async function createDefaultAdmin() {
  try {
    const existingAdmin = await Admin.findOne({ email: 'admin' });
    if (!existingAdmin) {
      const admin = new Admin({
        name: 'Administrator',
        email: 'admin',
        password: 'SecureAdmin@2025'
      });
      await admin.save();
      console.log('✅ Default admin created');
      console.log('Email: admin | Password: SecureAdmin@2025');
    } else {
      console.log('✅ Admin already exists');
    }
  } catch (err) {
    console.error('❌ Error creating default admin:', err);
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await admin.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'Login successful', token, email: admin.email, name: admin.name });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Manual admin reset (optional)
app.post('/api/admin/create', async (req, res) => {
  try {
    await Admin.deleteMany({ email: 'admin' });
    const admin = new Admin({
      name: 'Administrator',
      email: 'admin',
      password: 'SecureAdmin@2025'
    });
    await admin.save();
    res.json({ message: 'Admin recreated', email: 'admin', password: 'SecureAdmin@2025' });
  } catch (err) {
    console.error('❌ Error creating admin:', err);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Problem endpoints
// Submit a new problem (public)
app.post('/api/problems', async (req, res) => {
  try {
    const { name, contactNo, problem, status, field = '', problemType = '', urgency = '', whenStarted = '', solutionsTried = '', expectedOutcome = '' } = req.body;

    // Validation - Only name, contact, and problem are required
    if (!name || !contactNo || !problem) {
      return res.status(400).json({ error: 'Name, contact number, and problem description are required' });
    }

    // Ensure status has a valid value, default to 'Neither' if empty or invalid
    const validStatus = (status && ['Working', 'Student', 'Neither'].includes(status)) ? status : 'Neither';

    const newProblem = new Problem({
      name,
      contactNo,
      status: validStatus,
      problem,
      field,
      problemType,
      urgency,
      whenStarted,
      solutionsTried,
      expectedOutcome
    });

    const saved = await newProblem.save();
    res.status(201).json({ message: 'Problem submitted successfully', data: saved });
  } catch (err) {
    console.error('❌ Error submitting problem:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all problems (protected)
app.get('/api/problems', authenticateToken, async (req, res) => {
  try {
    const { field, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};
    if (field) query.field = field;
    if (status) query.status = status;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const problems = await Problem.find(query).sort(sort);
    res.json({ count: problems.length, data: problems });
  } catch (err) {
    console.error('❌ Error fetching problems:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single problem by ID (protected)
app.get('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    res.json(problem);
  } catch (err) {
    console.error('❌ Error fetching problem:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete problem (protected)
app.delete('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    res.json({ message: 'Problem deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting problem:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));
app.get('/', (req, res) => res.json({ message: 'Problem Tracker API running' }));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
});

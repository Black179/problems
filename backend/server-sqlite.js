require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'problems.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    createTable();
  }
});

// Create tables if they don't exist
function createTable() {
  const problemsTable = `
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contactNo TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Working', 'Student', 'Neither')),
      field TEXT NOT NULL,
      problemType TEXT,
      urgency TEXT,
      problem TEXT NOT NULL,
      whenStarted TEXT,
      solutionsTried TEXT,
      expectedOutcome TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  const adminsTable = `
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(problemsTable, (err) => {
    if (err) {
      console.error('Error creating problems table:', err);
    } else {
      console.log('Problems table ready');
    }
  });
  
  db.run(adminsTable, (err) => {
    if (err) {
      console.error('Error creating admins table:', err);
    } else {
      console.log('Admins table ready');
      // Create default admin if not exists
      createDefaultAdmin();
    }
  });
}

// Create default admin user
function createDefaultAdmin() {
  const email = 'admin@problemtracker.com';
  const password = 'SecureAdmin@2025';
  const name = 'System Administrator';
  
  db.get('SELECT * FROM admins WHERE email = ?', [email], async (err, row) => {
    if (err) {
      console.error('Error checking admin:', err);
      return;
    }
    
    if (!row) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run('INSERT INTO admins (email, password, name) VALUES (?, ?, ?)', [email, hashedPassword, name], (err) => {
        if (err) {
          console.error('Error creating default admin:', err);
        } else {
          console.log('✅ Admin account created successfully!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📧 Email: ' + email);
          console.log('🔑 Password: ' + password);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('⚠️  Please change this password after first login!');
        }
      });
    }
  });
}

// Middleware to verify JWT token
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

// Routes

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  db.get('SELECT * FROM admins WHERE email = ?', [email], async (err, admin) => {
    if (err) {
      console.error('Error finding admin:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const validPassword = await bcrypt.compare(password, admin.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      email: admin.email,
      name: admin.name
    });
  });
});

// Verify token (for frontend to check if token is still valid)
app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, email: req.user.email, name: req.user.name });
});

// Submit a new problem (public - no authentication required)
app.post('/api/problems', (req, res) => {
  const { name, contactNo, status, problem, field, problemType, urgency, whenStarted, solutionsTried, expectedOutcome } = req.body;
  
  // Validation
  if (!name || !contactNo || !status || !problem || !field) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }
  
  if (!['Working', 'Student', 'Neither'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  const sql = `INSERT INTO problems (name, contactNo, status, field, problemType, urgency, problem, whenStarted, solutionsTried, expectedOutcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [name, contactNo, status, field, problemType, urgency, problem, whenStarted, solutionsTried, expectedOutcome], function(err) {
    if (err) {
      console.error('Error inserting problem:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    res.status(201).json({
      message: 'Problem submitted successfully',
      data: {
        id: this.lastID,
        name,
        contactNo,
        status,
        field,
        problemType,
        urgency,
        problem,
        whenStarted,
        solutionsTried,
        expectedOutcome,
        createdAt: new Date().toISOString()
      }
    });
  });
});

// Get all problems with filtering and sorting (protected - requires authentication)
app.get('/api/problems', authenticateToken, (req, res) => {
  const { field, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  let sql = 'SELECT * FROM problems WHERE 1=1';
  const params = [];
  
  if (field) {
    sql += ' AND field = ?';
    params.push(field);
  }
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  // Sanitize sortBy to prevent SQL injection
  const validSortColumns = ['createdAt', 'name', 'field', 'status'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  sql += ` ORDER BY ${sortColumn} ${order}`;
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching problems:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    res.json({
      count: rows.length,
      data: rows
    });
  });
});

// Get a single problem by ID (protected - requires authentication)
app.get('/api/problems/:id', authenticateToken, (req, res) => {
  const sql = 'SELECT * FROM problems WHERE id = ?';
  
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      console.error('Error fetching problem:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json(row);
  });
});

// Delete a problem (protected - requires authentication)
app.delete('/api/problems/:id', authenticateToken, (req, res) => {
  const sql = 'DELETE FROM problems WHERE id = ?';
  
  db.run(sql, [req.params.id], function(err) {
    if (err) {
      console.error('Error deleting problem:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json({ message: 'Problem deleted successfully' });
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Problem Tracker API (SQLite)' });
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

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Initialize in-memory database for Netlify Functions
let db;
let dbInitialized = false;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInitialized) {
      resolve();
      return;
    }

    db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Error opening in-memory database:', err);
        reject(err);
        return;
      }

      console.log('Connected to in-memory SQLite database');
      createTables().then(() => {
        dbInitialized = true;
        resolve();
      }).catch(reject);
    });
  });
}

async function createTables() {
  return new Promise((resolve, reject) => {
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
        reject(err);
        return;
      }

      db.run(adminsTable, (err) => {
        if (err) {
          console.error('Error creating admins table:', err);
          reject(err);
          return;
        }

        console.log('Tables created, initializing admin...');
        createDefaultAdmin().then(resolve).catch(reject);
      });
    });
  });
}

async function createDefaultAdmin() {
  return new Promise((resolve, reject) => {
    const email = 'naveen@problemtracker.com';
    const password = 'N@veeN';
    const name = 'Administrator';

    // Check if admin already exists
    db.get('SELECT * FROM admins WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Error checking admin:', err);
        reject(err);
        return;
      }

      if (!row) {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO admins (email, password, name) VALUES (?, ?, ?)', [email, hashedPassword, name], (err) => {
          if (err) {
            console.error('Error creating default admin:', err);
            reject(err);
          } else {
            console.log('✅ Admin account created successfully!');
            resolve();
          }
        });
      } else {
        console.log('Admin account already exists');
        resolve();
      }
    });
  });
}

// Middleware to verify JWT token
function authenticateToken(token) {
  return new Promise((resolve, reject) => {
    if (!token) {
      return reject(new Error('Access denied. No token provided.'));
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return reject(new Error('Invalid or expired token.'));
      }
      resolve(user);
    });
  });
}

// Admin login
async function adminLogin(event, context) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Admin login attempt received');
      const { email, password } = JSON.parse(event.body);
      console.log('Email received:', email);

      if (!email || !password) {
        console.log('Missing email or password');
        return resolve({
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ error: 'Email and password are required' })
        });
      }

      // Initialize database first
      await initializeDatabase();
      console.log('Database initialized');

      db.get('SELECT * FROM admins WHERE email = ?', [email], async (err, admin) => {
        if (err) {
          console.error('Database error:', err);
          return resolve({
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            body: JSON.stringify({ error: 'Server error' })
          });
        }

        console.log('Admin found in database:', !!admin);

        if (!admin) {
          console.log('Admin not found, creating default admin');
          // Create default admin if not exists
          const hashedPassword = await bcrypt.hash('N@veeN', 10);
          db.run('INSERT INTO admins (email, password, name) VALUES (?, ?, ?)', ['naveen@problemtracker.com', hashedPassword, 'Administrator'], (err) => {
            if (err) {
              console.error('Error creating admin:', err);
            } else {
              console.log('Default admin created');
            }
          });

          return resolve({
            statusCode: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            body: JSON.stringify({ error: 'Invalid email or password' })
          });
        }

        console.log('Comparing passwords...');
        const validPassword = await bcrypt.compare(password, admin.password);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
          return resolve({
            statusCode: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            body: JSON.stringify({ error: 'Invalid email or password' })
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: admin.id, email: admin.email, name: admin.name },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        console.log('Login successful, token generated');
        resolve({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({
            message: 'Login successful',
            token,
            email: admin.email,
            name: admin.name
          })
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      resolve({
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Server error' })
      });
    }
  });
}

// Main handler function for Netlify Functions
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Initialize database if not already done
    await initializeDatabase();

    const queryParams = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    // Route based on action in request body/query or HTTP method
    if ((event.httpMethod === 'POST' && body.action === 'admin_login') || (event.httpMethod === 'POST' && body.email && body.password)) {
      return await adminLogin(event, context);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Server error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};

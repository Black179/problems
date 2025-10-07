const sqlite3 = require('sqlite3').verbose();
<<<<<<< HEAD
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize SQLite database
const dbPath = path.join(__dirname, '..', 'backend', 'problems.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    createTables();
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Create tables if they don't exist
function createTables() {
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
  const email = 'naveen@problemtracker.com';
  const password = 'N@veeN';
  const name = 'Administrator';

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
        }
      });
    }
=======
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
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
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
<<<<<<< HEAD
  return new Promise((resolve, reject) => {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return resolve({
        statusCode: 400,
=======
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
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
<<<<<<< HEAD
        body: JSON.stringify({ error: 'Email and password are required' })
      });
    }

    db.get('SELECT * FROM admins WHERE email = ?', [email], async (err, admin) => {
      if (err) {
        console.error('Error finding admin:', err);
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

      if (!admin) {
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

      const validPassword = await bcrypt.compare(password, admin.password);

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
=======
        body: JSON.stringify({ error: 'Server error' })
      });
    }
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
  });
}

// Verify token (for frontend to check if token is still valid)
async function verifyToken(event, context) {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const user = await authenticateToken(token);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ valid: true, email: user.email, name: user.name })
    };
  } catch (error) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ valid: false, error: error.message })
    };
  }
}
<<<<<<< HEAD
// Submit a new problem
async function submitProblem(event, context) {
  return new Promise((resolve, reject) => {
    const { name, contactNo, status, problem, field, problemType, urgency, whenStarted, solutionsTried, expectedOutcome } = JSON.parse(event.body);

    // Validation
    if (!name || !contactNo || !status || !problem || !field) {
      return resolve({
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'All required fields must be filled' })
      });
    }

    if (!['Working', 'Student', 'Neither'].includes(status)) {
      return resolve({
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Invalid status value' })
      });
    }

    const sql = `INSERT INTO problems (name, contactNo, status, field, problemType, urgency, problem, whenStarted, solutionsTried, expectedOutcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [name, contactNo, status, field, problemType, urgency, problem, whenStarted, solutionsTried, expectedOutcome], function(err) {
      if (err) {
        console.error('Error inserting problem:', err);
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

      resolve({
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({
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
        })
      });
    });
  });
}
=======
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c

// Get all problems (protected - requires authentication)
async function getProblems(event, context) {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const token = authHeader && authHeader.split(' ')[1];
    await authenticateToken(token);
  } catch (error) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ error: error.message })
    };
  }

  return new Promise((resolve, reject) => {
    const { field, status, sortBy = 'createdAt', sortOrder = 'desc' } = event.queryStringParameters || {};

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
        return resolve({
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ error: 'Server error' })
        });
      }

      resolve({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({
          count: rows.length,
          data: rows
        })
      });
    });
  });
}

// Get a single problem by ID (protected - requires authentication)
async function getProblem(event, context) {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const token = authHeader && authHeader.split(' ')[1];
    await authenticateToken(token);
  } catch (error) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ error: error.message })
    };
  }

  return new Promise((resolve, reject) => {
<<<<<<< HEAD
    const { id } = event.pathParameters;
=======
    const { id } = event.queryStringParameters || {};
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
    const sql = 'SELECT * FROM problems WHERE id = ?';

    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('Error fetching problem:', err);
        return resolve({
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ error: 'Server error' })
        });
      }

      if (!row) {
        return resolve({
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ error: 'Problem not found' })
        });
      }

      resolve({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify(row)
      });
    });
  });
}

// Delete a problem (protected - requires authentication)
async function deleteProblem(event, context) {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const token = authHeader && authHeader.split(' ')[1];
    await authenticateToken(token);
  } catch (error) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ error: error.message })
    };
  }

  return new Promise((resolve, reject) => {
<<<<<<< HEAD
    const { id } = event.pathParameters;
=======
    const { id } = event.queryStringParameters || {};
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
    const sql = 'DELETE FROM problems WHERE id = ?';

    db.run(sql, [id], function(err) {
      if (err) {
        console.error('Error deleting problem:', err);
        return resolve({
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ error: 'Server error' })
        });
      }

      if (this.changes === 0) {
        return resolve({
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
          },
          body: JSON.stringify({ error: 'Problem not found' })
        });
      }

      resolve({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ message: 'Problem deleted successfully' })
      });
    });
  });
}
<<<<<<< HEAD
async function getProblems(event, context) {
  return new Promise((resolve, reject) => {
    const { field, status, sortBy = 'createdAt', sortOrder = 'desc' } = event.queryStringParameters || {};

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
  }

  if (event.httpMethod === 'GET' && pathSegments.length === 3 && pathSegments[1] === 'problems') {
    return await getProblem(event, context);
  }

  if (event.httpMethod === 'DELETE' && pathSegments.length === 3 && pathSegments[1] === 'problems') {
    return await deleteProblem(event, context);
  }

  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ error: 'Not found' })
  };
=======

// Submit a new problem (public - no authentication required)
async function submitProblem(event, context) {
  return new Promise((resolve, reject) => {
    const { name, contactNo, status, problem, field, problemType, urgency, whenStarted, solutionsTried, expectedOutcome } = JSON.parse(event.body);

    // Validation
    if (!name || !contactNo || !status || !problem || !field) {
      return resolve({
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'All required fields must be filled' })
      });
    }

    if (!['Working', 'Student', 'Neither'].includes(status)) {
      return resolve({
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Invalid status value' })
      });
    }

    const sql = `INSERT INTO problems (name, contactNo, status, field, problemType, urgency, problem, whenStarted, solutionsTried, expectedOutcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [name, contactNo, status, field, problemType, urgency, problem, whenStarted, solutionsTried, expectedOutcome], function(err) {
      if (err) {
        console.error('Error inserting problem:', err);
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

      resolve({
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({
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
        })
      });
    });
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

    if (event.httpMethod === 'GET' && queryParams.action === 'verify_token') {
      return await verifyToken(event, context);
    }

    if (event.httpMethod === 'GET' && queryParams.action === 'get_problems') {
      return await getProblems(event, context);
    }

    if (event.httpMethod === 'GET' && queryParams.action === 'get_problem' && queryParams.id) {
      return await getProblem(event, context);
    }

    if (event.httpMethod === 'DELETE' && queryParams.action === 'delete_problem' && queryParams.id) {
      return await deleteProblem(event, context);
    }

    if (event.httpMethod === 'POST' && queryParams.action === 'submit_problem') {
      return await submitProblem(event, context);
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
>>>>>>> a1520dc61de03cbf031e921fd063977509ad753c
};

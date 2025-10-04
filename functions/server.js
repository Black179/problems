const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Initialize SQLite database
// For Netlify Functions, use in-memory database with hardcoded admin for demo
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
  return new Promise((resolve, reject) => {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
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
    const { id } = event.queryStringParameters || {};
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
    const { id } = event.queryStringParameters || {};
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

    if (event.httpMethod === 'POST' && body.action === 'submit_problem') {
      return await submitProblem(event, context);
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

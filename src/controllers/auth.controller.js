const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { body, validationResult } = require('express-validator');

// Developer configuration
const DEVELOPER_CONFIG = {
  allowedEmails: [
    'admin@academihub.com',
    'developer@academihub.com', 
    'administrator@academihub.com'
    // Add more developer/admin emails here
  ],
  secretCode: 'ADMIN_ACCESS_2024' // Change this as needed
};

// Input validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
];

const validateSignup = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('role').optional().isIn(['student', 'lecturer', 'admin']).withMessage('Invalid role'),
  body('developerCode').optional().isString()
];

const login = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Case-insensitive email search
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      // Generic error message to prevent user enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Secure token generation
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('🔴 Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const signup = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role = 'student', developerCode } = req.body;

    console.log('🔐 Signup attempt:', { email, role, name: name ? 'provided' : 'missing' });

    // Role validation with admin restrictions
    let userRole = 'student'; // Default role
    
    if (role === 'admin') {
      // Check if developer code is provided and valid
      const isValidDeveloperCode = developerCode === DEVELOPER_CONFIG.secretCode;
      const isDeveloperEmail = DEVELOPER_CONFIG.allowedEmails.includes(email.toLowerCase());
      
      if (!isValidDeveloperCode && !isDeveloperEmail) {
        return res.status(403).json({ 
          error: 'Admin registration requires developer authorization. Please contact system administrator.' 
        });
      }
      
      if (isValidDeveloperCode) {
        console.log('✅ Developer code validated for admin registration');
      } else if (isDeveloperEmail) {
        console.log('✅ Developer email validated for admin registration');
      }
      
      userRole = 'admin';
    } else if (role && ['student', 'lecturer'].includes(role)) {
      userRole = role;
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Strong password hashing
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, is_active',
      [email.toLowerCase(), passwordHash, name, userRole, true]
    );

    const user = result.rows[0];
    console.log('✅ User created:', { id: user.id, email: user.email, role: user.role });

    // Generate token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('🔴 Signup error:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'User already exists with this email' });
    }
    
    res.status(500).json({ error: 'Registration failed' });
  }
};

module.exports = {
  login: [validateLogin, login],
  signup: [validateSignup, signup]
};
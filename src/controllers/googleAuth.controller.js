const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/db');
const { body, validationResult } = require('express-validator');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validate Google token and extract user info
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    console.error('🔴 Google token verification failed:', error);
    throw new Error('Invalid Google token');
  }
};

// Validation middleware for Google sign-in
const validateGoogleSignIn = [
  body('googleToken').notEmpty().withMessage('Google token is required'),
  body('role').optional().isIn(['student', 'lecturer']).withMessage('Role must be student or lecturer')
];

// Google Sign-In with role selection
const googleSignIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { googleToken, role = 'student' } = req.body;

    console.log('🔐 Google Sign-In attempt for role:', role);

    // Verify Google token
    const googleUser = await verifyGoogleToken(googleToken);
    
    const { sub: googleId, email, name, picture } = googleUser;

    console.log('✅ Google user verified:', { email, name, googleId });

    // Check if user already exists with this Google ID or email
    let user;
    try {
      const userResult = await pool.query(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2',
        [googleId, email.toLowerCase()]
      );
      user = userResult.rows[0];
    } catch (dbError) {
      console.error('🔴 Database error checking user:', dbError);
      throw dbError;
    }

    if (user) {
      console.log('✅ User exists, updating last login:', user.email);
      
      // User exists - update last login and return user data
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP, email_verified = true WHERE id = $1',
        [user.id]
      );

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url || picture,
          auth_provider: user.auth_provider
        }
      });
    }

    console.log('👤 Creating new user with Google OAuth');

    // New user - create account with selected role
    try {
      const result = await pool.query(
        `INSERT INTO users (
          email, name, role, google_id, auth_provider, 
          email_verified, is_active, avatar_url, password_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id, email, name, role, avatar_url, auth_provider`,
        [
          email.toLowerCase(),
          name,
          role,
          googleId,
          'google',
          true,
          true,
          picture,
          null  
        ]
      );

      user = result.rows[0];
      console.log('✅ New user created via Google OAuth:', user.email);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
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
          avatar_url: user.avatar_url,
          auth_provider: user.auth_provider
        }
      });

    } catch (insertError) {
      console.error('🔴 Error creating user:', insertError);
      
      if (insertError.code === '23502') { 
        return res.status(500).json({ 
          error: 'Database constraint error',
          message: 'password_hash cannot be null. Please run: ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;'
        });
      }
      
      throw insertError;
    }

  } catch (error) {
    console.error('🔴 Google Sign-In error:', error);
    
    if (error.message === 'Invalid Google token') {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    
    if (error.code === '23502') {
      return res.status(500).json({ 
        error: 'Database configuration error',
        message: 'password_hash column requires a value but Google OAuth users dont have passwords.',
        solution: 'Run: ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;'
      });
    }
    
    res.status(500).json({ 
      error: 'Google authentication failed',
      details: error.message 
    });
  }
};

// Check if email exists and suggest role
const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT role, auth_provider FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      return res.json({
        exists: true,
        role: user.role,
        auth_provider: user.auth_provider,
        message: 'Account exists. Please sign in with your method.'
      });
    }

    // Suggest role based on email domain (optional)
    const isAcademicEmail = email.toLowerCase().includes('.edu') || 
                           email.toLowerCase().includes('ac.') ||
                           email.toLowerCase().includes('university.');
    
    const suggestedRole = isAcademicEmail ? 'lecturer' : 'student';

    res.json({
      exists: false,
      suggestedRole,
      message: 'New user. Please select your role.'
    });

  } catch (error) {
    console.error('🔴 Email check error:', error);
    res.status(500).json({ error: 'Email check failed' });
  }
};

module.exports = {
  googleSignIn,
  validateGoogleSignIn,
  checkEmail
};
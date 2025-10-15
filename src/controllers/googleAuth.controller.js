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

    // Verify Google token
    const googleUser = await verifyGoogleToken(googleToken);
    
    const { sub: googleId, email, name, picture } = googleUser;

    // Check if user already exists with this Google ID
    let user = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email.toLowerCase()]
    );

    if (user.rows.length > 0) {
      // User exists - update last login and return user data
      user = user.rows[0];
      
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

    // New user - create account with selected role
    const result = await pool.query(
      `INSERT INTO users (
        email, name, role, google_id, auth_provider, 
        email_verified, is_active, avatar_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, email, name, role, avatar_url, auth_provider`,
      [
        email.toLowerCase(),
        name,
        role,
        googleId,
        'google',
        true,
        true,
        picture
      ]
    );

    user = result.rows[0];

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

  } catch (error) {
    console.error('🔴 Google Sign-In error:', error);
    
    if (error.message === 'Invalid Google token') {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    
    res.status(500).json({ error: 'Google authentication failed' });
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
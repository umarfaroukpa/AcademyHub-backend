const pool = require('../config/db');
const { hash, compare } = require('../libs/bcrypt');
const { signJwt } = require('../libs/jwt');

async function signup(req, res) {
  try {
    const { email, password, fullName, role = 'student' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email+password required' });
    }
    
    // Check if user already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'email exists' });
    }
    
    // Hash password
    const passwordHash = await hash(password);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
      [email, passwordHash, fullName, role]
    );
    
    const user = result.rows[0];
    
    // Generate JWT token
    const token = signJwt({ userId: user.id, role: user.role });
    
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email+password required' });
    }
    
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'invalid' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const ok = await compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'invalid' });
    }
    
    // Generate JWT token
    const token = signJwt({ userId: user.id, role: user.role });
    
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { signup, login };
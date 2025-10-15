const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middileware');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = 'uploads/avatars/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Fetching profile for user:', req.user.id);
    
    const result = await pool.query(
      `SELECT 
        id, 
        name, 
        email, 
        role, 
        is_active, 
        created_at
        -- Remove last_login since it doesn't exist
      FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Your existing avatar handling code...
    // Check if avatar_url column exists and include it if available
    const hasAvatarColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar_url'
    `);

    if (hasAvatarColumn.rows.length > 0) {
      const userWithAvatar = await pool.query(
        'SELECT avatar_url FROM users WHERE id = $1',
        [req.user.id]
      );
      user.avatar_url = userWithAvatar.rows[0]?.avatar_url || null;
    } else {
      user.avatar_url = null;
    }

    console.log('👤 Profile fetched successfully');
    res.json(user);
  } catch (error) {
    console.error('🔴 Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile: ' + error.message });
  }
});

// Update user profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    console.log('👤 Updating profile for user:', req.user.id);

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
    }

    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING id, name, email, role, is_active, created_at',
      [name, email, req.user.id]
    );

    console.log('👤 Profile updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔴 Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile: ' + error.message });
  }
});

// Upload avatar (conditional - only if column exists)
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    console.log('=== 🎯 AVATAR UPLOAD DEBUG START ===');
    console.log('👤 User ID:', req.user.id);
    console.log('📁 File received:', req.file ? 'Yes' : 'No');

    // Detailed database check
    console.log('🔍 Checking for avatar_url column in database...');
    const hasAvatarColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar_url'
    `);

    console.log('📊 Column check result:', hasAvatarColumn.rows);
    console.log('🔢 Number of rows found:', hasAvatarColumn.rows.length);

    if (hasAvatarColumn.rows.length === 0) {
      console.log('❌ avatar_url column NOT FOUND in database');
      console.log('🔄 Let me check ALL columns in users table...');
      
      const allColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      console.log('📋 ALL columns in users table:');
      allColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      return res.status(400).json({ 
        error: 'Avatar feature not available. Database column missing.' 
      });
    } else {
      console.log('✅ avatar_url column FOUND in database:', hasAvatarColumn.rows[0]);
    }

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('💾 Attempting to save avatar...');
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const result = await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, name, email, avatar_url',
      [avatarUrl, req.user.id]
    );

    console.log('✅ Avatar saved successfully!');
    console.log('📊 Updated user:', result.rows[0]);
    console.log('=== 🎯 AVATAR UPLOAD DEBUG END ===');

    res.json(result.rows[0]);

  } catch (error) {
    console.error('💥 AVATAR UPLOAD ERROR:', error);
    res.status(500).json({ error: 'Failed to upload avatar: ' + error.message });
  }
});
// Delete avatar (conditional - only if column exists)
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    // Check if avatar_url column exists
    const hasAvatarColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar_url'
    `);

    if (hasAvatarColumn.rows.length === 0) {
      return res.status(400).json({ error: 'Avatar feature not available. Please contact administrator.' });
    }

    const result = await pool.query(
      'UPDATE users SET avatar_url = NULL WHERE id = $1 RETURNING id, name, email, role, is_active, created_at',
      [req.user.id]
    );

    console.log('👤 Avatar removed successfully');
    res.json({
      ...result.rows[0],
      avatar_url: null
    });
  } catch (error) {
    console.error('🔴 Error deleting avatar:', error);
    res.status(500).json({ error: 'Failed to delete avatar: ' + error.message });
  }
});

module.exports = router;
// routes/adminStats.js
const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(DISTINCT CASE WHEN e.status = 'pending' THEN e.id END) as pending_enrollments
      FROM users u
      CROSS JOIN courses c
      CROSS JOIN enrollments e
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

module.exports = router;
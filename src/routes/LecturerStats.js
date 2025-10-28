const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middileware');

const router = express.Router();

router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(DISTINCT CASE WHEN c.is_active = true THEN c.id END) as active_courses,
        COUNT(DISTINCT e.id) as total_students
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.lecturer_id = $1
    `, [id]);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching lecturer stats:', error);
    res.status(500).json({ error: 'Failed to fetch lecturer statistics' });
  }
});

module.exports = router;
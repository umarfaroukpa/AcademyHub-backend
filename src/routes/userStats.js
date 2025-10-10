// routes/userStats.js
const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Get student stats
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.course_id) as total_courses,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.course_id END) as completed_courses,
        COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.course_id END) as active_courses,
        COALESCE(AVG(e.final_grade), 0) as average_grade
      FROM enrollments e
      WHERE e.student_id = $1
    `, [id]);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({ error: 'Failed to fetch student statistics' });
  }
});

module.exports = router;
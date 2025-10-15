const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middileware');

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

router.get('/:id/activity', authenticateToken, async (req, res) => {
  try {
    // Only allow users to access their own activity
    if (parseInt(req.params.id) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(`
      (SELECT 
        id, 
        'submission' as type, 
        'Submitted assignment' as description, 
        submitted_at as timestamp 
       FROM submissions 
       WHERE student_id = $1 
       ORDER BY submitted_at DESC 
       LIMIT 3)
      
      UNION ALL
      
      (SELECT 
        id, 
        'enrollment' as type, 
        'Enrolled in new course' as description, 
        enrollment_date as timestamp  -- Changed from created_at to enrollment_date
       FROM enrollments 
       WHERE student_id = $1 
       ORDER BY enrollment_date DESC 
       LIMIT 3)
      
      ORDER BY timestamp DESC 
      LIMIT 5
    `, [req.params.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

module.exports = router;
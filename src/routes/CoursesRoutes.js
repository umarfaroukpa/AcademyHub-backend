const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const upload = require('../config/upload'); 
const pool = require('../config/db'); 
const { getCourseById, createCourse, updateCourse, transitionCourse } = require('../controllers/courses.controllers');

const router = express.Router();

// Get all courses - FIXED: Make sure this uses a proper function
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courses');
    res.json(result.rows);
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course by ID - Make sure getCourseById is properly imported and is a function
router.get('/:id', authenticateToken, getCourseById);

// Create a course - Make sure createCourse is properly imported
router.post('/', authenticateToken, requireRole('admin', 'instructor', 'lecturer'), createCourse);

// Update a course - Make sure updateCourse is properly imported
router.put('/:id', authenticateToken, requireRole('admin', 'instructor', 'lecturer'), updateCourse);

// Transition course lifecycle
router.post('/:id/transition', authenticateToken, requireRole('admin', 'instructor'), transitionCourse);

// Upload syllabus
router.post('/:id/syllabus', authenticateToken, requireRole('lecturer'), upload.single('syllabus'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE courses SET syllabus_path = $1 WHERE id = $2 RETURNING *',
      [req.file.path, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ message: 'Syllabus uploaded successfully', course: result.rows[0] });
  } catch (error) {
    console.error('Upload syllabus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
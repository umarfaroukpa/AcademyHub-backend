const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const upload = require('../config/upload'); 
const pool = require('../config/db'); 
const { getCourseById, createCourse, updateCourse, transitionCourse } = require('../controllers/courses.controllers');
const { enrollCourse, unenrollCourse } = require('../controllers/enrollment.controllers');

const router = express.Router();

// Get all courses with enhanced debugging
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📚 Fetching all courses...');
    console.log('User:', req.user); 
    
    const result = await pool.query('SELECT * FROM courses ORDER BY created_at DESC');
    
    console.log(`✅ Found ${result.rows.length} courses`);
    if (result.rows.length === 0) {
      console.log('⚠️ No courses found in database');
    } else {
      console.log('Sample course:', result.rows[0]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get all courses error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// In your courses.routes.js - add this route
router.post('/:id/enroll', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    console.log('🎯 Enrollment request - Course:', id, 'Student:', studentId);

    // Check if course exists
    const courseResult = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, id]
    );

    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Use 'active' status as defined in your database schema
    const result = await pool.query(
      'INSERT INTO enrollments (student_id, course_id, status) VALUES ($1, $2, $3) RETURNING *',
      [studentId, id, 'active'] // Changed from 'pending' to 'active'
    );

    console.log('✅ Enrollment created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Enrollment error:', error);
    
    // Check constraint violation
    if (error.code === '23514') { 
      return res.status(400).json({ 
        error: 'Invalid enrollment status',
        message: 'The enrollment status must be one of: active, completed, dropped, withdrawn'
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get courses by lecturer (for the logged-in lecturer)
router.get('/my-courses', authenticateToken, requireRole('lecturer', 'instructor'), async (req, res) => {
  try {
    console.log('📚 Fetching courses for lecturer:', req.user.id);
    
    const result = await pool.query(
      'SELECT * FROM courses WHERE lecturer_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    console.log(`✅ Found ${result.rows.length} courses for lecturer ${req.user.id}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get my courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course by ID
router.get('/:id', authenticateToken, getCourseById);

// Create a course
router.post('/', authenticateToken, requireRole('admin', 'instructor', 'lecturer'), createCourse);

// Update a course
router.put('/:id', authenticateToken, requireRole('admin', 'instructor', 'lecturer'), updateCourse);

// Transition course lifecycle
router.post('/:id/transition', authenticateToken, requireRole('admin', 'instructor'), transitionCourse);

// Upload syllabus
router.post('/:id/syllabus', authenticateToken, requireRole('lecturer'), upload.single('syllabus'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { id } = req.params;
    
    console.log('📄 Uploading syllabus for course:', id);
    console.log('File:', req.file);
    
    const result = await pool.query(
      'UPDATE courses SET syllabus_path = $1 WHERE id = $2 RETURNING *',
      [req.file.path, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    console.log('✅ Syllabus uploaded successfully');
    res.json({ message: 'Syllabus uploaded successfully', course: result.rows[0] });
  } catch (error) {
    console.error('❌ Upload syllabus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
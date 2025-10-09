// routes/enrollments.routes.js
const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const { 
  enrollCourse, 
  getEnrollments, 
  updateEnrollment, 
  getStudentEnrollments,
  unenrollCourse 
} = require('../controllers/enrollment.controllers');

const router = express.Router();

// Get all enrollments (based on user role)
router.get('/', authenticateToken, getEnrollments);

// Get student's own enrollments
router.get('/my-enrollments', authenticateToken, requireRole('student'), getStudentEnrollments);

// IMPORTANT: This route should be in courses.routes.js, not here!
// If you have it here, move it or add it to courses routes

// Update enrollment status (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), updateEnrollment);

// Unenroll from course (student only)
router.delete('/courses/:id', authenticateToken, requireRole('student'), unenrollCourse);

module.exports = router;
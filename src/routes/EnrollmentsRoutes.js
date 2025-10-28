const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const { getEnrollments, updateEnrollment, getStudentEnrollments, unenrollCourse } = require('../controllers/enrollment.controllers');
const router = express.Router();

// Get all enrollments (admin/lecturer) or student's own enrollments
router.get('/', authenticateToken, getEnrollments);

// Get student's own enrollments
router.get('/my-enrollments', authenticateToken, requireRole('student'), getStudentEnrollments);

// Update enrollment status (admin/lecturer only)
router.put('/:id', authenticateToken, requireRole('admin', 'lecturer'), updateEnrollment);

// Unenroll from course (student only) 
router.delete('/:courseId', authenticateToken, requireRole('student'), unenrollCourse);

module.exports = router;
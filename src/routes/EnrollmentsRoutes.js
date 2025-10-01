const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { enrollCourse, getEnrollments, updateEnrollment, getStudentEnrollments } = require('../controllers/enrollment.controller');
  
  
const router = express.Router();

router.get('/', authenticateToken, getEnrollments);
router.get('/my-enrollments', authenticateToken, requireRole('student'), getStudentEnrollments);
router.post('/courses/:id/enroll', authenticateToken, requireRole('student'), enrollCourse);
router.put('/:id', authenticateToken, requireRole('admin'), updateEnrollment);

module.exports = router;
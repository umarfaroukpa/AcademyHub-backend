const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const upload = require('../config/upload');
const { submitAssignment, gradeSubmission, getSubmissions, getStudentSubmissions } = require('../controllers/submission.controllers');

  
const router = express.Router();

router.get('/', authenticateToken, getSubmissions);
router.get('/my-submissions', authenticateToken, requireRole('student'), getStudentSubmissions);
router.post('/assignments/:id/submit', authenticateToken, requireRole('student'), upload.single('file'), submitAssignment);
router.put('/:id/grade', authenticateToken, requireRole('lecturer'), gradeSubmission);

module.exports = router;
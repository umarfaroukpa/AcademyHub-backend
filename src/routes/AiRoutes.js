const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const { getCourseRecommendations, generateSyllabus } = require('../controllers/ai.controllers');
const router = express.Router();



router.post('/recommend', authenticateToken, requireRole('student'), getCourseRecommendations);
router.post('/syllabus', authenticateToken, requireRole('lecturer'), generateSyllabus);



module.exports = router;
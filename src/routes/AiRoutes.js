const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const { getCourseRecommendations, generateSyllabus, generateQuickQuiz, generateStudyPlan, findStudyGroups } = require('../controllers/ai.controllers');
 
const router = express.Router();

// Course recommendations for students
router.post('/recommend', authenticateToken, requireRole('student'), getCourseRecommendations);

// Syllabus generation for lecturers
router.post('/syllabus', authenticateToken, requireRole('lecturer'), generateSyllabus);

// Quick quiz generation for students
router.post('/quick-quiz', authenticateToken, requireRole('student'), generateQuickQuiz);

// Study plan generation for students
router.post('/study-plan', authenticateToken, requireRole('student'), generateStudyPlan);

// Study group recommendations for students
router.post('/study-groups', authenticateToken, requireRole('student'), findStudyGroups);

module.exports = router;
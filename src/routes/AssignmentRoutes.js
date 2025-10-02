const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const { createAssignment, getAssignments, updateAssignment, deleteAssignment } = require('../controllers/assigment.controllers');

  


const router = express.Router();

router.get('/', authenticateToken, getAssignments);
router.post('/', authenticateToken, requireRole('lecturer'), createAssignment);
router.put('/:id', authenticateToken, requireRole('lecturer'), updateAssignment);
router.delete('/:id', authenticateToken, requireRole('lecturer'), deleteAssignment);

module.exports = router;
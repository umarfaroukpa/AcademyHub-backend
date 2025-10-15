const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');
const pool = require('../config/db');

const router = express.Router();

// Mock study groups join endpoint
router.post('/join-recommended', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    // In a real application, this would add the student to a study group
    // For now, return a success message
    res.json({ 
      message: 'Successfully joined study group!',
      group: {
        id: 1,
        name: "Web Development Study Group",
        topic: "React and JavaScript",
        next_meeting: "Wednesday at 6:00 PM"
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join study group' });
  }
});

// Get available study groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Mock study groups data
    const studyGroups = [
      {
        id: 1,
        name: "Web Development Study Group",
        topic: "React and JavaScript",
        members: 8,
        meeting_time: "Wednesdays 6:00 PM",
        platform: "Discord"
      },
      {
        id: 2,
        name: "Data Science Learners",
        topic: "Python and Machine Learning", 
        members: 12,
        meeting_time: "Fridays 7:00 PM",
        platform: "Zoom"
      }
    ];
    
    res.json(studyGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch study groups' });
  }
});

module.exports = router;
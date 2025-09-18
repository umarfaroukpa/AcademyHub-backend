const pool = require('../config/db');

// Get course by ID with owner and department info
async function getCourse(req, res) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT c.*, 
             u.email as owner_email, u.full_name as owner_name,
             d.name as department_name
      FROM courses c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.sendStatus(404);
    }
    
    const course = result.rows[0];
    res.json({
      ...course,
      owner: course.owner_email ? {
        email: course.owner_email,
        name: course.owner_name
      } : null,
      department: course.department_name ? {
        name: course.department_name
      } : null
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createCourse(req, res) {
  try {
    const { code, title, description, departmentId } = req.body;
    const ownerId = req.user.userId;
    
    const result = await pool.query(
      'INSERT INTO courses (code, title, description, owner_id, department_id, lifecycle) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [code, title, description, ownerId, departmentId, 'DRAFT']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateCourse(req, res) {
  try {
    const { id } = req.params;
    const { code, title, description } = req.body;
    
    const result = await pool.query(
      'UPDATE courses SET code = $1, title = $2, description = $3 WHERE id = $4 RETURNING *',
      [code, title, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Lifecycle transition logic
const transitions = {
  DRAFT: ['PENDING_REVIEW', 'PUBLISHED'],
  PENDING_REVIEW: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: []
};

async function transitionCourse(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.body;
    
    // Get current course
    const courseResult = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courseResult.rows.length === 0) {
      return res.sendStatus(404);
    }
    
    const course = courseResult.rows[0];
    
    // Map action to target state
    const actionMap = {
      submitForReview: 'PENDING_REVIEW',
      publish: 'PUBLISHED',
      archive: 'ARCHIVED',
      saveDraft: 'DRAFT'
    };
    
    const target = actionMap[action];
    if (!target) {
      return res.status(400).json({ error: 'unknown action' });
    }
    
    const allowed = transitions[course.lifecycle];
    if (!allowed.includes(target)) {
      return res.status(400).json({ 
        error: `can't transition ${course.lifecycle} -> ${target}` 
      });
    }
    
    // Update the lifecycle
    const result = await pool.query(
      'UPDATE courses SET lifecycle = $1 WHERE id = $2 RETURNING *',
      [target, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Course transition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getCourse,
  createCourse,
  updateCourse,
  transitionCourse
};
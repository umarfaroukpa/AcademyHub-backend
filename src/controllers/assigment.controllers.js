const pool = require('../config/db');

const getUpcomingAssignments = async (req, res) => {
  try {
    let query = '';
    let params = [];

    if (req.user.role === 'student') {
      query = `
        SELECT a.*, c.title as course_name 
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON e.course_id = c.id
        WHERE e.student_id = $1 
          AND e.status = 'active'
          AND a.due_date > NOW()
        ORDER BY a.due_date ASC
        LIMIT 10
      `;
      params = [req.user.id];
    } else if (req.user.role === 'lecturer') {
      query = `
        SELECT a.*, c.title as course_name 
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE c.lecturer_id = $1 
          AND a.due_date > NOW()
        ORDER BY a.due_date ASC
        LIMIT 10
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT a.*, c.title as course_name 
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE a.due_date > NOW()
        ORDER BY a.due_date ASC
        LIMIT 10
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching upcoming assignments:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Your existing functions remain the same...
const getAssignments = async (req, res) => {
  try {
    let query = '';
    let params = [];

    if (req.user.role === 'student') {
      query = `
        SELECT a.*, c.title as course_name 
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON e.course_id = c.id
        WHERE e.student_id = $1 AND e.status = 'active'
      `;
      params = [req.user.id];
    } else if (req.user.role === 'lecturer') {
      query = `
        SELECT a.*, c.title as course_name 
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE c.lecturer_id = $1
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT a.*, c.title as course_name 
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const createAssignment = async (req, res) => {
  const { course_id, title, description, weight, due_date } = req.body;

  try {
    // Verify the lecturer owns the course
    if (req.user.role === 'lecturer') {
      const courseCheck = await pool.query(
        'SELECT * FROM courses WHERE id = $1 AND lecturer_id = $2',
        [course_id, req.user.id]
      );

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }
    }

    const result = await pool.query(
      'INSERT INTO assignments (course_id, title, description, weight, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [course_id, title, description, weight, due_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateAssignment = async (req, res) => {
  const { title, description, weight, due_date } = req.body;

  try {
    let query = '';
    let params = [];

    if (req.user.role === 'lecturer') {
      query = `
        UPDATE assignments 
        SET title = $1, description = $2, weight = $3, due_date = $4 
        FROM courses c
        WHERE assignments.id = $5 AND assignments.course_id = c.id AND c.lecturer_id = $6
        RETURNING assignments.*
      `;
      params = [title, description, weight, due_date, req.params.id, req.user.id];
    } else {
      query = 'UPDATE assignments SET title = $1, description = $2, weight = $3, due_date = $4 WHERE id = $5 RETURNING *';
      params = [title, description, weight, due_date, req.params.id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    let query = '';
    let params = [];

    if (req.user.role === 'lecturer') {
      query = `
        DELETE FROM assignments 
        USING courses c
        WHERE assignments.id = $1 AND assignments.course_id = c.id AND c.lecturer_id = $2
        RETURNING assignments.*
      `;
      params = [req.params.id, req.user.id];
    } else {
      query = 'DELETE FROM assignments WHERE id = $1 RETURNING *';
      params = [req.params.id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAssignments,
  getUpcomingAssignments, 
  createAssignment,
  updateAssignment,
  deleteAssignment
};
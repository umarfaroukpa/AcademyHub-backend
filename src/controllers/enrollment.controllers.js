const pool = require('../config/db');

const getEnrollments = async (req, res) => {
  try {
    let query = '';
    let params = [];

    if (req.user.role === 'admin') {
      query = `
        SELECT e.*, u.name as student_name, c.title as course_name 
        FROM enrollments e 
        JOIN users u ON e.student_id = u.id 
        JOIN courses c ON e.course_id = c.id 
        WHERE e.status = 'pending'
      `;
    } else if (req.user.role === 'student') {
      query = `
        SELECT e.*, c.title as course_name, u.name as lecturer_name
        FROM enrollments e 
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.lecturer_id = u.id
        WHERE e.student_id = $1
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getStudentEnrollments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, c.title as course_name, c.description, u.name as lecturer_name
       FROM enrollments e 
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON c.lecturer_id = u.id
       WHERE e.student_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const enrollCourse = async (req, res) => {
  try {
    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [req.user.id, req.params.id]
    );

    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    const result = await pool.query(
      'INSERT INTO enrollments (student_id, course_id, status) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, req.params.id, 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateEnrollment = async (req, res) => {
  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE enrollments SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getEnrollments,
  getStudentEnrollments,
  enrollCourse,
  updateEnrollment
};
const pool = require('../config/db');

const getSubmissions = async (req, res) => {
  try {
    let query = '';
    let params = [];

    if (req.user.role === 'lecturer') {
      query = `
        SELECT s.*, a.title as assignment_title, u.name as student_name, c.title as course_name
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        JOIN courses c ON a.course_id = c.id
        WHERE c.lecturer_id = $1
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT s.*, a.title as assignment_title, u.name as student_name, c.title as course_name
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        JOIN courses c ON a.course_id = c.id
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getStudentSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, a.title as assignment_title, a.description, c.title as course_name
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE s.student_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const submitAssignment = async (req, res) => {
  const { content } = req.body;

  try {
    // Check if student is enrolled in the course
    const enrollmentCheck = await pool.query(
      `SELECT e.* FROM enrollments e
       JOIN assignments a ON a.course_id = e.course_id
       WHERE e.student_id = $1 AND a.id = $2 AND e.status = 'approved'`,
      [req.user.id, req.params.id]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course or enrollment not approved' });
    }

    // Check if already submitted
    const existingSubmission = await pool.query(
      'SELECT * FROM submissions WHERE student_id = $1 AND assignment_id = $2',
      [req.user.id, req.params.id]
    );

    if (existingSubmission.rows.length > 0) {
      return res.status(400).json({ error: 'Assignment already submitted' });
    }

    const result = await pool.query(
      'INSERT INTO submissions (assignment_id, student_id, content, file_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, req.user.id, content, req.file?.filename]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const gradeSubmission = async (req, res) => {
  const { grade } = req.body;

  try {
    // Verify the lecturer has access to this submission
    const submissionCheck = await pool.query(
      `SELECT s.* FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE s.id = $1 AND c.lecturer_id = $2`,
      [req.params.id, req.user.id]
    );

    if (submissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this submission' });
    }

    const result = await pool.query(
      'UPDATE submissions SET grade = $1 WHERE id = $2 RETURNING *',
      [grade, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getSubmissions,
  getStudentSubmissions,
  submitAssignment,
  gradeSubmission
};
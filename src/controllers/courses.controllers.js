const pool = require('../config/db');

const getCourses = async (req, res) => {
  try {
    console.log('📚 getCourses - User role:', req.user.role);
    
    let query = '';
    let params = [];

    if (req.user.role === 'student') {
      query = `
        SELECT c.*, u.name as lecturer_name, 
               EXISTS(SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $1) as enrolled
        FROM courses c 
        JOIN users u ON c.lecturer_id = u.id 
        WHERE c.status = 'active'
      `;
      params = [req.user.id];
    } else if (req.user.role === 'lecturer') {
      query = 'SELECT c.*, u.name as lecturer_name FROM courses c JOIN users u ON c.lecturer_id = u.id WHERE c.lecturer_id = $1';
      params = [req.user.id];
    } else {
      query = 'SELECT c.*, u.name as lecturer_name FROM courses c JOIN users u ON c.lecturer_id = u.id';
    }

    console.log('📚 Executing query for role:', req.user.role);
    const result = await pool.query(query, params);
    console.log('📚 Courses found:', result.rows.length);
    
    res.json(result.rows);
  } catch (error) {
    console.error('🔴 getCourses error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

const getCourseById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT c.*, u.name as lecturer_name FROM courses c JOIN users u ON c.lecturer_id = u.id WHERE c.id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔴 getCourseById error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createCourse = async (req, res) => {
  const { title, description } = req.body;

  try {
    console.log('📚 createCourse - Lecturer:', req.user.id, 'Title:', title);
    
    const result = await pool.query(
      'INSERT INTO courses (title, description, lecturer_id) VALUES ($1, $2, $3) RETURNING *',
      [title, description, req.user.id]
    );
    
    console.log('📚 Course created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('🔴 createCourse error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateCourse = async (req, res) => {
  const { title, description } = req.body;

  try {
    let query = '';
    let params = [];

    if (req.user.role === 'lecturer') {
      query = 'UPDATE courses SET title = $1, description = $2 WHERE id = $3 AND lecturer_id = $4 RETURNING *';
      params = [title, description, req.params.id, req.user.id];
    } else {
      query = 'UPDATE courses SET title = $1, description = $2 WHERE id = $3 RETURNING *';
      params = [title, description, req.params.id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔴 updateCourse error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const transitionCourse = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    console.log('📚 transitionCourse - Course:', id, 'New status:', status);
    
    // Validate status
    const validStatuses = ['draft', 'active', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be draft, active, or archived' });
    }

    let query = '';
    let params = [];

    // Lecturers can only transition their own courses
    if (req.user.role === 'lecturer') {
      query = 'UPDATE courses SET status = $1 WHERE id = $2 AND lecturer_id = $3 RETURNING *';
      params = [status, id, req.user.id];
    } else {
      // Admins and instructors can transition any course
      query = 'UPDATE courses SET status = $1 WHERE id = $2 RETURNING *';
      params = [status, id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    console.log('📚 Course status updated:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔴 transitionCourse error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

const uploadSyllabus = async (req, res) => {
  try {
    console.log('📚 uploadSyllabus - Course:', req.params.id, 'File:', req.file?.filename);
    
    const result = await pool.query(
      'UPDATE courses SET syllabus_url = $1 WHERE id = $2 AND lecturer_id = $3 RETURNING *',
      [req.file.filename, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔴 uploadSyllabus error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  uploadSyllabus,
  transitionCourse
};
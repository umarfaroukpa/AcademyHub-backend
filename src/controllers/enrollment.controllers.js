// controllers/enrollment.controllers.js
const pool = require('../config/db');

const getEnrollments = async (req, res) => {
  try {
    console.log('📊 getEnrollments - User:', req.user);
    
    let query = '';
    let params = [];

    if (req.user.role === 'admin') {
      query = `
        SELECT 
          e.*, 
          u.name as student_name, 
          u.email as student_email,
          c.title as course_name,
          c.code as course_code,
          l.name as lecturer_name
        FROM enrollments e 
        JOIN users u ON e.student_id = u.id 
        JOIN courses c ON e.course_id = c.id 
        LEFT JOIN users l ON c.lecturer_id = l.id
        WHERE e.status = 'pending'
      `;
      console.log('📊 Admin query - fetching pending enrollments');
    } else if (req.user.role === 'student') {
      // FIXED: Use LEFT JOIN to handle courses without lecturers
      query = `
        SELECT 
          e.*, 
          c.title as course_name,
          c.code as course_code,
          c.description,
          c.credits,
          c.semester,
          c.year,
          u.name as lecturer_name
        FROM enrollments e 
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON c.lecturer_id = u.id
        WHERE e.student_id = $1
        ORDER BY e.enrollment_date DESC
      `;
      params = [req.user.id];
      console.log('📊 Student query - fetching enrollments for student ID:', req.user.id);
    } else if (req.user.role === 'lecturer') {
      query = `
        SELECT 
          e.*, 
          c.title as course_name,
          c.code as course_code,
          s.name as student_name,
          s.email as student_email
        FROM enrollments e 
        JOIN courses c ON e.course_id = c.id
        JOIN users s ON e.student_id = s.id
        WHERE c.lecturer_id = $1
        ORDER BY e.enrollment_date DESC
      `;
      params = [req.user.id];
      console.log('📊 Lecturer query - fetching enrollments for courses');
    }

    console.log('📊 Executing query:', query);
    const result = await pool.query(query, params);
    console.log('📊 Query result - rows:', result.rows.length);
    
    res.json(result.rows);
  } catch (error) {
    console.error('🔴 getEnrollments error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

const getStudentEnrollments = async (req, res) => {
  try {
    console.log('📊 getStudentEnrollments - User ID:', req.user.id);
    
    // FIXED: Use LEFT JOIN for lecturer
    const result = await pool.query(
      `SELECT 
        e.*, 
        c.title as course_name,
        c.code as course_code, 
        c.description,
        c.credits,
        c.semester,
        c.year,
        u.name as lecturer_name
       FROM enrollments e 
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN users u ON c.lecturer_id = u.id
       WHERE e.student_id = $1
       ORDER BY e.enrollment_date DESC`,
      [req.user.id]
    );
    
    console.log('📊 Student enrollments result:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('🔴 getStudentEnrollments error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

const enrollCourse = async (req, res) => {
  try {
    const studentId = req.user.id;
    const courseId = req.params.id;
    
    console.log('📝 enrollCourse - Student:', studentId, 'Course:', courseId);

    // Check if course exists
    const courseCheck = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND is_active = true',
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      console.log('❌ Course not found or inactive:', courseId);
      return res.status(404).json({ error: 'Course not found or inactive' });
    }

    console.log('✅ Course found:', courseCheck.rows[0].title);

    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (existingEnrollment.rows.length > 0) {
      console.log('⚠️  Already enrolled');
      return res.status(400).json({ 
        error: 'Already enrolled in this course',
        enrollment: existingEnrollment.rows[0]
      });
    }

    // Create enrollment
    const result = await pool.query(
      `INSERT INTO enrollments (student_id, course_id, status, enrollment_date) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [studentId, courseId, 'active']
    );
    
    console.log('✅ Enrollment created:', result.rows[0]);
    
    // Return enrollment with course details
    const enrollmentWithDetails = await pool.query(
      `SELECT 
        e.*, 
        c.title as course_name,
        c.code as course_code,
        c.credits,
        c.semester,
        c.year
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment: enrollmentWithDetails.rows[0]
    });
  } catch (error) {
    console.error('🔴 enrollCourse error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

const updateEnrollment = async (req, res) => {
  const { status } = req.body;

  try {
    console.log('📊 updateEnrollment - ID:', req.params.id, 'Status:', status);

    const result = await pool.query(
      'UPDATE enrollments SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    console.log('📊 Enrollment updated:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔴 updateEnrollment error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

// NEW: Unenroll from course
const unenrollCourse = async (req, res) => {
  try {
    const studentId = req.user.id;
    const courseId = req.params.id;
    
    console.log('📝 unenrollCourse - Student:', studentId, 'Course:', courseId);

    const result = await pool.query(
      `DELETE FROM enrollments 
       WHERE student_id = $1 AND course_id = $2 
       RETURNING *`,
      [studentId, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    console.log('✅ Unenrolled successfully');
    res.json({ 
      message: 'Successfully unenrolled from course',
      enrollment: result.rows[0]
    });
  } catch (error) {
    console.error('🔴 unenrollCourse error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

module.exports = {
  getEnrollments,
  getStudentEnrollments,
  enrollCourse,
  unenrollCourse,
  updateEnrollment
};
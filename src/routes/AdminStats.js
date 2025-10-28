const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth.middileware');

const router = express.Router();

// Get system statistics
router.get('/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    console.log('📊 Fetching admin statistics...');
    
    // Get stats using separate queries to match your schema
    const [
      totalStudents,
      totalLecturers,
      totalCourses,
      activeEnrollments,
      totalUsers,
      pendingEnrollments,
      completedCourses
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'lecturer' AND is_active = true"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE is_active = true"),
      pool.query("SELECT COUNT(*) as count FROM courses WHERE is_active = true"),
      pool.query("SELECT COUNT(*) as count FROM enrollments WHERE status = 'active'"),
      // pool.query("SELECT COUNT(*) as count FROM enrollments WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) as count FROM enrollments WHERE status = 'active'"), 
      pool.query("SELECT COUNT(*) as count FROM enrollments WHERE status = 'completed'")
    ]);

    const stats = {
      total_students: parseInt(totalStudents.rows[0].count),
      total_lecturers: parseInt(totalLecturers.rows[0].count),
      total_courses: parseInt(totalCourses.rows[0].count),
      total_users: parseInt(totalUsers.rows[0].count),
      active_enrollments: parseInt(activeEnrollments.rows[0].count),
      pending_enrollments: 0, 
      completed_courses: parseInt(completedCourses.rows[0].count)
    };

    console.log('📊 Admin stats fetched successfully:', stats);
    res.json(stats);
  } catch (error) {
    console.error('🔴 Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics: ' + error.message });
  }
});

// Get all users
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    console.log('👥 Fetching all users...');
    
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        email, 
        role, 
        is_active, 
        created_at,
        updated_at
      FROM users 
      ORDER BY created_at DESC
    `);

    console.log('👥 Users fetched successfully:', result.rows.length, 'users');
    res.json(result.rows);
  } catch (error) {
    console.error('🔴 Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
});

// Update user status
router.put('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    console.log(`👥 Updating user ${id} status to:`, is_active);
    
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active, created_at',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('👥 User status updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔴 Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user: ' + error.message });
  }
});

// Delete a course
router.delete('/courses/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📚 Deleting course ${id}...`);
    
    // First, delete related records (enrollments, assignments, etc.)
    await pool.query('DELETE FROM enrollments WHERE course_id = $1', [id]);
    await pool.query('DELETE FROM assignments WHERE course_id = $1', [id]);
    await pool.query('DELETE FROM attendance WHERE course_id = $1', [id]);
    await pool.query('DELETE FROM announcements WHERE course_id = $1', [id]);
    
    // Then delete the course
    const result = await pool.query(
      'DELETE FROM courses WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    console.log('📚 Course deleted successfully');
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('🔴 Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course: ' + error.message });
  }
});

// Get all enrollments with detailed information
router.get('/enrollments', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    console.log('🎓 Fetching all enrollments...');
    
    const result = await pool.query(`
      SELECT 
        e.id,
        e.student_id,
        u.name as student_name,
        e.course_id,
        c.title as course_name,
        e.status,
        e.enrollment_date as created_at,
        e.final_grade
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN courses c ON e.course_id = c.id
      ORDER BY e.enrollment_date DESC
    `);

    console.log('🎓 Enrollments fetched successfully:', result.rows.length, 'enrollments');
    res.json(result.rows);
  } catch (error) {
    console.error('🔴 Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments: ' + error.message });
  }
});

// Update enrollment status
router.put('/enrollments/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`🎓 Updating enrollment ${id} status to:`, status);
    
    // Your schema has these status values: 'active', 'completed', 'dropped', 'withdrawn'
    const validStatuses = ['approved','active', 'completed', 'dropped', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: ' + validStatuses.join(', ') });
    }

    const result = await pool.query(
      'UPDATE enrollments SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    console.log('🎓 Enrollment status updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('🔴 Error updating enrollment:', error);
    res.status(500).json({ error: 'Failed to update enrollment: ' + error.message });
  }
});

// Create a new user (admin only)
router.post('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    console.log(`👥 Creating new user: ${name} (${role})`);
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // In a real application, you would hash the password here
    // For now, we'll store it directly (not recommended for production)
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, is_active, created_at`,
      [name, email, password, role, true]
    );

    console.log('👥 User created successfully');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('🔴 Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
});

// Create a new course (admin only)
router.post('/courses', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { code, title, description, lecturer_id, credits, max_students } = req.body;

    console.log(`📚 Creating new course: ${title} (${code})`);
    
    if (!code || !title || !description) {
      return res.status(400).json({ error: 'Course code, title, and description are required' });
    }

    const result = await pool.query(
      `INSERT INTO courses (code, title, description, lecturer_id, credits, max_students, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [code, title, description, lecturer_id, credits || 3, max_students || 50]
    );

    console.log('📚 Course created successfully');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('🔴 Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course: ' + error.message });
  }
});

// Get all courses with lecturer information
router.get('/courses', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    console.log('📚 Fetching all courses...');
    
    const result = await pool.query(`
      SELECT 
        c.*,
        u.name as lecturer_name
      FROM courses c
      LEFT JOIN users u ON c.lecturer_id = u.id
      ORDER BY c.created_at DESC
    `);

    console.log('📚 Courses fetched successfully:', result.rows.length, 'courses');
    res.json(result.rows);
  } catch (error) {
    console.error('🔴 Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses: ' + error.message });
  }
});

module.exports = router;
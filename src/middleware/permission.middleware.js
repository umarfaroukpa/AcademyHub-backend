const pool = require('../config/db');

// Check if user has permission to access the resource
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user.role;
      const userId = req.user.id;

      // Define permissions for each role
      const permissions = {
        student: {
          courses: ['read'],
          enrollments: ['create', 'read_own'],
          assignments: ['read', 'submit'],
          submissions: ['create_own', 'read_own']
        },
        lecturer: {
          courses: ['create', 'read', 'update_own', 'upload_syllabus'],
          assignments: ['create', 'read', 'update', 'delete'],
          submissions: ['read', 'grade']
        },
        admin: {
          courses: ['create', 'read', 'update', 'delete'],
          enrollments: ['read', 'update'],
          users: ['create', 'read', 'update', 'delete']
        }
      };

      const rolePermissions = permissions[userRole] || {};
      const resourcePermissions = rolePermissions[resource] || [];

      // Check if user has the required permission
      if (resourcePermissions.includes(action)) {
        
        // Additional ownership checks for 'own' actions
        if (action === 'read_own' || action === 'create_own' || action === 'update_own') {
          // For student accessing their own enrollments/submissions
          if (resource === 'enrollments' || resource === 'submissions') {
            if (req.params.id) {
              const result = await pool.query(
                `SELECT * FROM ${resource} WHERE id = $1 AND student_id = $2`,
                [req.params.id, userId]
              );
              if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied to this resource' });
              }
            }
          }
          
          // For lecturer accessing their own courses
          if (resource === 'courses' && action === 'update_own') {
            if (req.params.id) {
              const result = await pool.query(
                'SELECT * FROM courses WHERE id = $1 AND lecturer_id = $2',
                [req.params.id, userId]
              );
              if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied to this course' });
              }
            }
          }
        }

        next();
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Middleware to check if user is the owner of a resource
const checkOwnership = (table, idParam = 'id', ownerField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      const userId = req.user.id;

      const result = await pool.query(
        `SELECT * FROM ${table} WHERE id = $1 AND ${ownerField} = $2`,
        [resourceId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied - not owner' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Ownership check failed' });
    }
  };
};

// Middleware to check if user is enrolled in a course
const checkEnrollment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId || req.body.course_id;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID required' });
    }

    const result = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status = $3',
      [userId, courseId, 'approved']
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Enrollment check failed' });
  }
};

// Middleware to check if user is lecturer of a course
const checkLecturerOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId || req.body.course_id;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID required' });
    }

    const result = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND lecturer_id = $2',
      [courseId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not the lecturer of this course' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Lecturer ownership check failed' });
  }
};

module.exports = {
  checkPermission,
  checkOwnership,
  checkEnrollment,
  checkLecturerOwnership
};
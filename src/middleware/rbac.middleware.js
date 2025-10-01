const jwt = require('jsonwebtoken');
require('dotenv').config();


function authenticate(req, res, next) {
const header = req.headers.authorization;
if (!header) return res.sendStatus(401);
const token = header.split(' ')[1];
try {
req.user = jwt.verify(token, process.env.JWT_SECRET);
next();
} catch (e) {
return res.sendStatus(401);
}
}

// Role-Based Access Control middleware
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    
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

    if (resourcePermissions.includes(action)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
};

function requireRole(...roles) {
return (req, res, next) => {
if (!req.user) return res.sendStatus(401);
if (!roles.includes(req.user.role)) return res.sendStatus(403);
next();
};
}


module.exports = { authenticate, requireRole, checkPermission };
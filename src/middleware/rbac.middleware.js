const jwt = require('jsonwebtoken');
const { checkPermission } = require('./permission.middleware');
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


function requireRole(...roles) {
return (req, res, next) => {
if (!req.user) return res.sendStatus(401);
if (!roles.includes(req.user.role)) return res.sendStatus(403);
next();
};
}


module.exports = { authenticate, requireRole, checkPermission };
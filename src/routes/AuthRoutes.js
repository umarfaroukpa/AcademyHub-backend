const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, signup } = require('../controllers/auth.controller');

const router = express.Router();

//Rate limiting to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

//Apply rate limiting to auth routes
router.use(authLimiter);

router.post('/login', login);
router.post('/signup', signup);

module.exports = router;
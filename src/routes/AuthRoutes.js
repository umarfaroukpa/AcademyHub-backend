const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, signup } = require('../controllers/auth.controller');
const { googleSignIn, validateGoogleSignIn, checkEmail } = require('../controllers/googleAuth.controller');

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Increased for OAuth flows
  message: { error: 'Too many authentication attempts' },
  standardHeaders: true,
});

router.use(authLimiter);

// Existing routes
router.post('/login', login);
router.post('/signup', signup);

// Google OAuth routes -  validation middleware
router.post('/google/signin', validateGoogleSignIn, googleSignIn);
router.post('/check-email', checkEmail);

module.exports = router;
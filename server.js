const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

// CORS configuration - FIXED
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:4000',
      'https://academic-manager.vercel.app',
      /^https:\/\/academic-manager.*\.vercel\.app$/ 
    ];
    
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    
    if (isAllowed) {
      console.log('✅ CORS allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ✅ ROOT ROUTE - Add this!
app.get('/', (req, res) => {
  res.json({ 
    message: 'Academic Hub API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      courses: '/api/courses'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Routes
app.use('/api/auth', require('./src/routes/AuthRoutes'));
app.use('/api/courses', require('./src/routes/CoursesRoutes'));
app.use('/api/enrollments', require('./src/routes/EnrollmentsRoutes'));
app.use('/api/assignments', require('./src/routes/AssignmentRoutes'));
app.use('/api/submissions', require('./src/routes/SubmissionRoutes'));
app.use('/api/ai', require('./src/routes/AiRoutes'));
app.use('/api/users', require('./src/routes/UserStatsRoute'));
app.use('/api/lecturers', require('./src/routes/LecturerStats'));
app.use('/api/admin', require('./src/routes/AdminStats'));
app.use('/api/profile', require('./src/routes/ProfileRoute'));
app.use('/api/study-groups', require('./src/routes/Study-groups'));

// 404 handler
app.use((req, res) => {
  console.log('❌ 404:', req.method, req.url);
  res.status(404).json({ error: 'Endpoint not found', path: req.url });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Bind to 0.0.0.0 for Render
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Set ✅' : '⚠️ NOT SET'}`);
});
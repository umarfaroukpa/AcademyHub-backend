const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Built-in body parser for JSON
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
  console.log('🌐 Incoming Request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  next();
});

// Routes
app.use('/api/auth', require('./src/routes/AuthRoutes'));
app.use('/api/courses', require('./src/routes/CoursesRoutes'));
app.use('/api/enrollments', require('./src/routes/EnrollmentsRoutes'));
app.use('/api/assignments', require('./src/routes/AssignmentRoutes'));
app.use('/api/submissions', require('./src/routes/SubmissionRoutes'));
app.use('/api/ai', require('./src/routes/AiRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Using default'}`);
});
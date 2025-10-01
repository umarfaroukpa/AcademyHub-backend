const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
// Built-in body parser for JSON
app.use(express.json());
app.use('/uploads', express.static('uploads'));

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
  console.log(`Server running on port ${port}`);
});
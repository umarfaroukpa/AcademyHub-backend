const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Built-in body parser for JSON
app.use(express.urlencoded({ extended: true })); // Built-in body parser for URL-encoded data

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'Academic Management Platform API is running!' });
});

// Routes
app.use('/routes/auth', authRoutes);
app.use('/routes/courses', courseRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));
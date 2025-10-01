const OpenAI = require('openai');
const pool = require('../config/db');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key'
});

const getCourseRecommendations = async (req, res) => {
  const { interests } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      // Mock response with actual courses from database
      const mockCourses = await pool.query(
        `SELECT * FROM courses 
         WHERE title ILIKE $1 OR description ILIKE $1 
         LIMIT 3`,
        [`%${interests}%`]
      );
      return res.json(mockCourses.rows);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a course recommendation assistant. Suggest relevant courses based on student interests."
        },
        {
          role: "user",
          content: `Suggest 3 courses for a student interested in: ${interests}`
        }
      ]
    });

    res.json({ recommendations: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'AI service error' });
  }
};

const generateSyllabus = async (req, res) => {
  const { topic } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      // Mock response
      const mockSyllabus = {
        title: `Syllabus for ${topic}`,
        description: `This course covers fundamental and advanced concepts in ${topic}.`,
        learning_outcomes: [
          `Understand core concepts of ${topic}`,
          `Apply ${topic} principles to real-world problems`,
          `Develop practical skills in ${topic}`
        ],
        weeks: [
          'Week 1: Introduction and Fundamentals',
          'Week 2: Core Concepts and Principles',
          'Week 3: Advanced Topics and Applications',
          'Week 4: Practical Implementation and Case Studies'
        ],
        assessment: [
          'Assignments: 40%',
          'Mid-term Exam: 20%',
          'Final Project: 40%'
        ]
      };
      return res.json(mockSyllabus);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a syllabus generator. Create a comprehensive course syllabus with learning outcomes, weekly topics, and assessment methods."
        },
        {
          role: "user",
          content: `Generate a detailed syllabus for a course about: ${topic}`
        }
      ]
    });

    res.json({ syllabus: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'AI service error' });
  }
};

module.exports = {
  getCourseRecommendations,
  generateSyllabus
};
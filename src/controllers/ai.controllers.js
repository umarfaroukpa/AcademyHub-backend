const OpenAI = require('openai');
const pool = require('../config/db');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key'
});

// Your existing functions...
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

// New AI Functions for Quick Actions
const generateQuickQuiz = async (req, res) => {
  const { topic, questions = 5 } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      // Mock quiz response
      const mockQuiz = {
        topic: topic || 'General Knowledge',
        questions: [
          {
            id: 1,
            question: "What is the main purpose of version control systems like Git?",
            options: [
              "To track changes in source code",
              "To compile programs",
              "To design user interfaces",
              "To manage databases"
            ],
            correct_answer: 0
          },
          {
            id: 2,
            question: "Which data structure uses LIFO (Last In First Out) principle?",
            options: [
              "Queue",
              "Stack", 
              "Array",
              "Linked List"
            ],
            correct_answer: 1
          }
        ],
        total_questions: 2,
        time_limit: 10
      };
      return res.json(mockQuiz);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. Create multiple-choice questions with 4 options each and indicate the correct answer."
        },
        {
          role: "user",
          content: `Generate ${questions} multiple-choice questions about ${topic}. Format as JSON with questions array containing question, options array, and correct_answer index.`
        }
      ]
    });

    res.json({ quiz: JSON.parse(completion.choices[0].message.content) });
  } catch (error) {
    res.status(500).json({ error: 'AI service error' });
  }
};

const generateStudyPlan = async (req, res) => {
  const { courses, timeframe = 'week' } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      // Mock study plan response
      const mockStudyPlan = {
        timeframe: timeframe,
        schedule: [
          {
            day: "Monday",
            topics: ["Introduction to React", "Components and Props"],
            duration: "2 hours",
            resources: ["React Documentation", "Tutorial Video"]
          },
          {
            day: "Tuesday", 
            topics: ["State and Lifecycle", "Event Handling"],
            duration: "2 hours",
            resources: ["React State Guide", "Practice Exercises"]
          },
          {
            day: "Wednesday",
            topics: ["Hooks and Context", "Advanced Patterns"],
            duration: "3 hours", 
            resources: ["React Hooks Documentation", "Code Examples"]
          }
        ],
        goals: [
          "Complete React fundamentals",
          "Build 2 practice projects",
          "Understand component lifecycle"
        ],
        tips: [
          "Practice coding daily",
          "Review concepts regularly", 
          "Join study groups for discussion"
        ]
      };
      return res.json(mockStudyPlan);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a study plan generator. Create detailed study schedules with daily topics, resources, and learning goals."
        },
        {
          role: "user",
          content: `Generate a ${timeframe} study plan for these courses: ${courses.join(', ')}. Include daily schedule, resources, and goals.`
        }
      ]
    });

    res.json({ study_plan: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'AI service error' });
  }
};

const findStudyGroups = async (req, res) => {
  const { interests, location = 'online' } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      // Mock study groups response
      const mockStudyGroups = [
        {
          id: 1,
          name: "Web Development Study Group",
          topic: "React and JavaScript",
          members: 8,
          meeting_time: "Wednesdays 6:00 PM",
          platform: "Discord",
          description: "Weekly study sessions for web development topics"
        },
        {
          id: 2,
          name: "Data Science Learners",
          topic: "Python and Machine Learning", 
          members: 12,
          meeting_time: "Fridays 7:00 PM",
          platform: "Zoom",
          description: "Study group focusing on data science fundamentals"
        },
        {
          id: 3,
          name: "Database Study Group",
          topic: "SQL and Database Design",
          members: 6,
          meeting_time: "Tuesdays 5:00 PM", 
          platform: "Google Meet",
          description: "Learning database concepts and SQL queries"
        }
      ];
      return res.json(mockStudyGroups);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a study group finder. Suggest relevant study groups based on student interests and location."
        },
        {
          role: "user",
          content: `Find study groups for interests: ${interests} in ${location} location.`
        }
      ]
    });

    res.json({ study_groups: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'AI service error' });
  }
};

module.exports = {
  getCourseRecommendations,
  generateSyllabus,
  generateQuickQuiz,
  generateStudyPlan,
  findStudyGroups
};
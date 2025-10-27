# Academic Management Platform Backend

This is the backend service for the Academic Management Platform, providing RESTful APIs for user authentication, course management, assignments, submissions, and more. Built with Node.js and Express, it integrates with a SQL database and supports Docker deployment.

## Features
- User authentication (including Google OAuth)
- Role-based access control (RBAC)
- Course and enrollment management
- Assignment creation and submission
- AI-powered features (see `ai.controllers.js`)
- Admin and lecturer statistics endpoints

## Project Structure

├── src/
│   ├── config/           # Configuration files (DB, uploads)
│   ├── controllers/      # API controllers
│   ├── libs/             # Utility libraries (bcrypt, jwt)
│   ├── middleware/       # Auth and permission middleware
│   ├── register/         # Auth routes (login, signup)
│   ├── routes/           # API route definitions
│   └── database-schema.sql # SQL schema
├── database/
│   └── migrate.js        # DB migration script
├── uploads/              # Uploaded files (avatars, etc.)
├── server.js             # Entry point
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
├── package.json          # NPM dependencies and scripts


## Getting Started

### Prerequisites
- Node.js (v14+ recommended)
- Docker & Docker Compose (optional, for containerized setup)
- SQL database (e.g., PostgreSQL, MySQL)

### Installation
1. Clone the repository:
   
   git clone <repo-url>
   cd academic-management-platform-backend
   
2. Install dependencies:
   
   npm install
   
3. Configure environment variables (create a `.env` file as needed).
4. Set up the database using `src/database-schema.sql` and `database/migrate.js`.

### Running the Server
- Locally:
  
  npm run dev
  
- With Docker:
  
  docker-compose up --build


## API Endpoints
See the `src/routes/` directory for available endpoints. Main features include:
- `/api/auth` - Authentication
- `/api/courses` - Course management
- `/api/assignments` - Assignments
- `/api/enrollments` - Enrollments
- `/api/submissions` - Submissions
- `/api/admin` - Admin stats


## License
[MIT](LICENSE)

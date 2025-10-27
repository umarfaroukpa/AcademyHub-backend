# Academic Management Platform Backend

This is the backend for the Academic Management Platform (AcademyHub-backend), designed to manage users, courses, assignments, enrollments, submissions, and more for academic institutions.

## Features

- User authentication (JWT, Google OAuth)
- Role-based access control (RBAC)
- Course and enrollment management
- Assignment creation and submission
- AI-powered features (e.g., grading, feedback)
- Admin and lecturer statistics
- File uploads (avatars, assignments)

## Tech Stack

- Node.js
- Express.js
- PostgreSQL (with SQL migrations)
- Docker (for containerization)
- JWT & Bcrypt for authentication

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm
- Docker & Docker Compose (for containerized setup)

### Installation

1. Clone the repository:
	```sh
	git clone https://github.com/umarfaroukpa/AcademyHub-backend.git
	cd academic-management-platform-backend
	```
2. Install dependencies:
	```sh
	npm install
	```
3. Set up environment variables:
	- Copy `.env.example` to `.env` and fill in your configuration.
4. (Optional) Run database migrations:
	```sh
	node database/migrate.js
	```

### Running the Application

#### With Docker
```sh
docker-compose up --build
```

#### Without Docker
```sh
npm run dev
```

The server will start on the port specified in your `.env` file (default: 3000).

## Project Structure

```
src/
  config/           # Configuration files
  controllers/      # Route controllers
  libs/             # Utility libraries (JWT, bcrypt)
  middleware/       # Express middleware (auth, RBAC)
  register/         # Auth registration/login logic
  routes/           # API route definitions
  database-schema.sql # SQL schema
uploads/            # Uploaded files (avatars, assignments)
database/           # Migration scripts
```

## API Endpoints

Refer to the route files in `src/routes/` for available endpoints. Common endpoints include:

- `/api/auth` - Authentication
- `/api/courses` - Course management
- `/api/assignments` - Assignment management
- `/api/enrollments` - Enrollment management
- `/api/submissions` - Assignment submissions
- `/api/admin` - Admin statistics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please open an issue or contact the maintainer [umarfaroukpa](https://github.com/umarfaroukpa).

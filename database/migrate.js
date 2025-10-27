const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'university',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runFullMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting complete database migration...\n');
    
    await client.query('BEGIN');

    //  USERS TABLE 
    console.log('📋 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        avatar_url VARCHAR(500),
        google_id VARCHAR(100) UNIQUE,
        auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
        email_verified BOOLEAN DEFAULT false
      )
    `);
    
    // Add Google OAuth columns if they don't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN
          ALTER TABLE users ADD COLUMN google_id VARCHAR(100) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_provider') THEN
          ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
          ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
        END IF;
        
        -- Make password_hash nullable for Google OAuth
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);
    console.log('✅ Users table ready\n');

    //  COURSES TABLE 
    console.log('📋 Creating courses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        lecturer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        semester VARCHAR(20),
        year INTEGER,
        credits INTEGER DEFAULT 3,
        syllabus_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Courses table ready\n');

    //  ENROLLMENTS TABLE
    console.log('📋 Creating enrollments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'withdrawn')),
        final_grade DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_id)
      )
    `);
    console.log('✅ Enrollments table ready\n');

    // ASSIGNMENTS TABLE 
    console.log('📋 Creating assignments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP NOT NULL,
        max_score DECIMAL(5,2) DEFAULT 100,
        file_path VARCHAR(500),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Assignments table ready\n');

    //  SUBMISSIONS TABLE 
    console.log('📋 Creating submissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        submission_text TEXT,
        file_path VARCHAR(500),
        score DECIMAL(5,2),
        feedback TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        graded_at TIMESTAMP,
        graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late', 'resubmitted')),
        UNIQUE(assignment_id, student_id)
      )
    `);
    console.log('✅ Submissions table ready\n');

    // ATTENDANCE TABLE
    console.log('📋 Creating attendance table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
        remarks TEXT,
        recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, student_id, date)
      )
    `);
    console.log('✅ Attendance table ready\n');

    // ANNOUNCEMENTS TABLE 
    console.log('📋 Creating announcements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Announcements table ready\n');

    //  STUDY GROUPS TABLE 
    console.log('📋 Creating study_groups table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        max_members INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Study groups table ready\n');

    //  STUDY GROUP MEMBERS TABLE 
    console.log('📋 Creating study_group_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id)
      )
    `);
    console.log('✅ Study group members table ready\n');

    //  INDEXES 
    console.log('📋 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_courses_lecturer ON courses(lecturer_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_course ON attendance(course_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
      CREATE INDEX IF NOT EXISTS idx_study_group_members_group ON study_group_members(group_id);
      CREATE INDEX IF NOT EXISTS idx_study_group_members_user ON study_group_members(user_id);
    `);
    console.log('✅ Indexes created\n');

    //  TRIGGERS 
    console.log('📋 Creating update triggers...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
      CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_enrollments_updated_at ON enrollments;
      CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
      CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
      CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Triggers created\n');

    //  SEED DATA 
    console.log('📋 Checking for seed data...');
    const adminExists = await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    
    if (adminExists.rows.length === 0) {
      console.log('📋 Creating default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
        VALUES ('System Admin', 'admin@academihub.com', $1, 'admin', true, true)
      `, [hashedPassword]);
      console.log('✅ Default admin created (email: admin@academihub.com, password: admin123)\n');
    }

    // Create test lecturer
    const lecturerExists = await client.query(`SELECT id FROM users WHERE email = 'lecturer@test.com' LIMIT 1`);
    if (lecturerExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('test123', 10);
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
        VALUES ('Dr. John Smith', 'lecturer@test.com', $1, 'lecturer', true, true)
      `, [hashedPassword]);
      console.log('✅ Test lecturer created (email: lecturer@test.com, password: test123)\n');
    }

    // Create test student
    const studentExists = await client.query(`SELECT id FROM users WHERE email = 'student@test.com' LIMIT 1`);
    if (studentExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('test123', 10);
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
        VALUES ('Jane Doe', 'student@test.com', $1, 'student', true, true)
      `, [hashedPassword]);
      console.log('✅ Test student created (email: student@test.com, password: test123)\n');
    }

    await client.query('COMMIT');
    console.log('🎉 Complete database migration finished successfully!\n');

    // VERIFICATION 
    console.log('📊 Database Schema Summary:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📁 Tables created:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    const userCount = await client.query(`SELECT COUNT(*) FROM users`);
    console.log(`\n👥 Users in database: ${userCount.rows[0].count}`);

    console.log('\n📋 Default test accounts:');
    console.log('   Admin:    admin@academihub.com / admin123');
    console.log('   Lecturer: lecturer@test.com / test123');
    console.log('   Student:  student@test.com / test123');

    console.log('\n✅ Migration complete! Your database is ready to use.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runFullMigration()
  .then(() => {
    console.log('\n👋 Migration script completed. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
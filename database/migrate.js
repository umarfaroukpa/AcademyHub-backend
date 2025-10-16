const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'university',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...');
    
    await client.query('BEGIN');

    // Add google_id column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE
    `);
    console.log('✅ Added google_id column');

    // Add auth_provider column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email' 
      CHECK (auth_provider IN ('email', 'google'))
    `);
    console.log('✅ Added auth_provider column');

    // Add email_verified column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false
    `);
    console.log('✅ Added email_verified column');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
    `);
    console.log('✅ Created google_id index');

    await client.query('COMMIT');
    console.log('🎉 Database migration completed successfully!');

    // Verify the migration
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Current users table structure:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
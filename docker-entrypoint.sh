#!/bin/sh

# The script to wait for the database connection and run migrations.

# Function to check database readiness
wait_for_db() {
  # We use the 'db' service name as the host
  until pg_isready -h db -p 5432 -U postgres -d university
  do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
  done
  echo "PostgreSQL is ready!"
}

# Check if the 'db' host is defined (i.e., we are in a Docker Compose environment)
if [ "$DB_HOST" = "db" ] || [ -z "$DB_HOST" ]; then
  wait_for_db
fi

# Run the migration script
echo "Running Node.js database migrations..."
#  migrate.js is located /database/migrate.js inside the container
node database/migrate.js

# Execute the main application command (npm start)
exec "$@"
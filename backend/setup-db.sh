#!/bin/bash

# Setup PostgreSQL Database for HRMS
# Run this script to create the database and user

echo "Setting up PostgreSQL for HRMS Backend..."

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Create database and user
psql postgres << EOF
-- Create user if not exists
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'hrms_user') THEN
    CREATE USER hrms_user WITH PASSWORD 'hrms_pass';
  END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE hrms_dev OWNER hrms_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hrms_dev')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO hrms_user;

\c hrms_dev
GRANT ALL ON SCHEMA public TO hrms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hrms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hrms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hrms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hrms_user;

EOF

echo "Database setup complete!"
echo "Database: hrms_dev"
echo "User: hrms_user"
echo "Password: hrms_pass"

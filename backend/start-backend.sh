#!/bin/bash

# Start Backend with all required environment variables
export JWT_SECRET="EIpKw+jjwEbzx1iJ9twBAlSrBDwbQxIePd9eFGFIopMWMVfSMXA/mPfYBnuyzJfMOFcFElTghR27sQ0mslFdNA=="
export SPRING_PROFILES_ACTIVE=dev
export DEV_DATABASE_URL=jdbc:postgresql://localhost:5432/hrms_dev
export DEV_DATABASE_USERNAME=hrms_user
export DEV_DATABASE_PASSWORD=hrms_pass
export DEV_REDIS_HOST=localhost
export DEV_REDIS_PORT=6379
export FRONTEND_URL=http://localhost:3000

echo "Starting HRMS Backend..."
echo "Profile: $SPRING_PROFILES_ACTIVE"
echo "Database: $DEV_DATABASE_URL"
echo ""

mvn spring-boot:run

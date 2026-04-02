# Multi-stage build for HRMS Backend
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Install pre-built internal module JARs into the local Maven cache
# (modules/common and modules/pm source is not in git — bundle JARs instead)
COPY lib/common-module-1.0.0.jar lib/common-module-1.0.0.pom ./lib/
COPY lib/pm-module-1.0.0.jar     lib/pm-module-1.0.0.pom     ./lib/

RUN mvn install:install-file \
      -Dfile=lib/common-module-1.0.0.jar \
      -DpomFile=lib/common-module-1.0.0.pom \
      -Dmaven.repo.local=/root/.m2/repository && \
    mvn install:install-file \
      -Dfile=lib/pm-module-1.0.0.jar \
      -DpomFile=lib/pm-module-1.0.0.pom \
      -Dmaven.repo.local=/root/.m2/repository

# Copy root POM and backend POM for dependency caching
COPY pom.xml .
COPY backend/pom.xml backend/

# Download backend dependencies (cached layer)
RUN mvn dependency:go-offline -B -f backend/pom.xml -Dmaven.repo.local=/root/.m2/repository || true

# Copy backend source code
COPY backend/src backend/src

# Build the application
RUN mvn clean package -DskipTests -B -f backend/pom.xml -Dmaven.repo.local=/root/.m2/repository

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S hrms && \
    adduser -u 1001 -S hrms -G hrms

# Install curl for health checks
RUN apk add --no-cache curl

# Copy JAR from builder
COPY --from=build /app/backend/target/*.jar app.jar

# Change ownership
RUN chown -R hrms:hrms /app

# Switch to non-root user
USER hrms

# Expose port
EXPOSE 8080

# JVM options for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseSerialGC -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -Djava.security.egd=file:/dev/./urandom"

# Render / Railway inject env vars directly — no .env file needed at runtime
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

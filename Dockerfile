# Multi-stage build for HRMS Backend (Multi-module project)
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Copy all POMs first for dependency caching
COPY pom.xml .
COPY modules/common/pom.xml modules/common/
COPY modules/pm/pom.xml modules/pm/
COPY backend/pom.xml backend/

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B -pl backend -am || true

# Copy source code
COPY modules/common/src modules/common/src
COPY modules/pm/src modules/pm/src
COPY backend/src backend/src

# Build the application
RUN mvn clean package -DskipTests -B -pl backend -am

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

# Copy environment file
COPY config/.env.production .env

# Change ownership
RUN chown -R hrms:hrms /app

# Switch to non-root user
USER hrms

# Expose port
EXPOSE 8080

# Health check disabled - let Railway handle it
# HEALTHCHECK --interval=30s --timeout=30s --start-period=180s --retries=5 \
#   CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM options for containers - more memory for Spring Boot
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseSerialGC -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -Djava.security.egd=file:/dev/./urandom"

# Entry point - load env file and start
ENTRYPOINT ["sh", "-c", "set -a && . /app/.env && set +a && java $JAVA_OPTS -jar app.jar"]

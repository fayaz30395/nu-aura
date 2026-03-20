# Multi-stage build for HRMS Backend
# Build context must be the REPO ROOT (not ./backend) because the backend
# depends on a parent POM and sibling modules (modules/common, modules/pm).

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy all POM files first for dependency caching (parent + modules + backend)
COPY pom.xml ./pom.xml
COPY modules/common/pom.xml ./modules/common/pom.xml
COPY modules/pm/pom.xml ./modules/pm/pom.xml
COPY backend/pom.xml ./backend/pom.xml

# Download dependencies (cached unless POMs change)
RUN mvn dependency:go-offline -B -pl backend -am

# Copy source code for all modules
COPY modules/common/src ./modules/common/src
COPY modules/pm/src ./modules/pm/src
COPY backend/src ./backend/src

# Build the backend (and its dependencies)
RUN mvn clean package -DskipTests -B -pl backend -am

# ── Stage 2: Development (used by docker-compose.override.yml) ────────────────
# Full JDK + Maven for hot reload via spring-boot-devtools.
# Source and target dirs are volume-mounted from the host.
FROM maven:3.9-eclipse-temurin-17 AS development

WORKDIR /app

# Copy all POM files
COPY pom.xml ./pom.xml
COPY modules/common/pom.xml ./modules/common/pom.xml
COPY modules/pm/pom.xml ./modules/pm/pom.xml
COPY backend/pom.xml ./backend/pom.xml

RUN mvn dependency:go-offline -B -pl backend -am

# Copy all source
COPY modules/common/src ./modules/common/src
COPY modules/pm/src ./modules/pm/src
COPY backend/src ./backend/src

EXPOSE 8080 5005

WORKDIR /app/backend

# Run with spring-boot:run for devtools class-reload support
CMD ["mvn", "spring-boot:run", "-Dspring-boot.run.jvmArguments=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"]

# ── Stage 3: Production Runtime ───────────────────────────────────────────────
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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM options for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

# Entry point
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

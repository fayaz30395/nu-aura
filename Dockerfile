# Multi-stage build for HRMS Backend
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS build

WORKDIR /app

# Step 1: Copy bundled JARs BEFORE any pom.xml so Maven has no project to scan
# (modules/common and modules/pm source is not in git — bundle pre-built JARs)
COPY infra/mvn-local-deps/ ./lib/

# Step 2: Install internal artifacts into local Maven cache.
# At this point /app has no pom.xml, so Maven won't try to validate the multi-module project.
#   - nulogic-platform:1.0.0 (minimal parent POM without <modules> section)
#   - common-module:1.0.0
#   - pm-module:1.0.0
RUN mvn install:install-file \
      -Dfile=/app/lib/nulogic-platform-1.0.0.pom \
      -DgroupId=com.nulogic \
      -DartifactId=nulogic-platform \
      -Dversion=1.0.0 \
      -Dpackaging=pom \
      -Dmaven.repo.local=/root/.m2/repository && \
    mvn install:install-file \
      -Dfile=/app/lib/common-module-1.0.0.jar \
      -DpomFile=/app/lib/common-module-1.0.0.pom \
      -Dmaven.repo.local=/root/.m2/repository && \
    mvn install:install-file \
      -Dfile=/app/lib/pm-module-1.0.0.jar \
      -DpomFile=/app/lib/pm-module-1.0.0.pom \
      -Dmaven.repo.local=/root/.m2/repository

# Step 3: Now copy project POMs and download dependencies (cached Docker layer)
COPY pom.xml .
COPY backend/pom.xml backend/
RUN mvn dependency:go-offline -B -f backend/pom.xml -Dmaven.repo.local=/root/.m2/repository || true

# Step 4: Copy source and build
COPY backend/src backend/src
RUN mvn clean package -Dmaven.test.skip=true -B -f backend/pom.xml -Dmaven.repo.local=/root/.m2/repository

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -g 1001 -S hrms && \
    adduser -u 1001 -S hrms -G hrms

RUN apk add --no-cache curl socat

RUN printf '%s\n' \
      '#!/bin/sh' \
      "printf 'HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: 17\r\n\r\nService starting\n'" \
      > /usr/local/bin/render-starting-response && \
    printf '%s\n' \
      '#!/bin/sh' \
      'set -eu' \
      'APP_PORT="${APP_PORT:-8080}"' \
      'PUBLIC_PORT="${PORT:-10000}"' \
      '' \
      'ready() {' \
      '  curl --connect-timeout 1 --max-time 2 -sS -o /dev/null "http://127.0.0.1:${APP_PORT}/actuator/health/liveness" >/dev/null 2>&1' \
      '}' \
      '' \
      'start_probe_responder() {' \
      '  socat -T 2 "TCP-LISTEN:${PUBLIC_PORT},fork,reuseaddr" EXEC:/usr/local/bin/render-starting-response &' \
      '  PROBE_PID=$!' \
      '}' \
      '' \
      'start_public_proxy() {' \
      '  start_probe_responder' \
      '  until ready; do' \
      '    sleep 2' \
      '  done' \
      '  kill "${PROBE_PID}" 2>/dev/null || true' \
      '  wait "${PROBE_PID}" 2>/dev/null || true' \
      '  exec socat "TCP-LISTEN:${PUBLIC_PORT},fork,reuseaddr" "TCP:127.0.0.1:${APP_PORT}"' \
      '}' \
      '' \
      'start_public_proxy &' \
      'SERVER_PORT="${APP_PORT}" exec java ${JAVA_OPTS:-} -jar app.jar' \
      > /usr/local/bin/render-entrypoint && \
    chmod +x /usr/local/bin/render-starting-response /usr/local/bin/render-entrypoint

COPY --from=build /app/backend/target/*.jar app.jar

RUN chown -R hrms:hrms /app

USER hrms

EXPOSE 8080

# Render free tier: 512MB RAM total.
# Budget: heap 160MB + metaspace 192MB + code cache 48MB + threads (~30) + JVM native (~50) ≈ 480MB
# Metaspace raised to 192m: Spring Boot 3 + Hibernate 6 + SAML + 274 lazy JPA repos loads
# ~150-180MB of class metadata on first request wave. Previous 128m caused OOM:Metaspace.
# Heap reduced from 192m to 160m to compensate — acceptable for single-instance demo load.
# TieredStopAtLevel=1 disables C2 JIT — reduces startup memory and time on Java 21.
ENV JAVA_OPTS="-XX:+UseContainerSupport -Xms64m -Xmx160m -XX:MaxMetaspaceSize=192m -XX:ReservedCodeCacheSize=48m -Xss512k -XX:+UseSerialGC -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["/usr/local/bin/render-entrypoint"]

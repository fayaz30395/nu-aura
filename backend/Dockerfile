# Multi-stage build for HRMS Backend
# Build context must be the REPO ROOT (not ./backend) because the backend
# depends on a parent POM and sibling modules (pre-built JARs in lib/).

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Step 1: Copy bundled JARs BEFORE any pom.xml so Maven has no project to scan
# (modules/common and modules/pm source is not in git — bundle pre-built JARs)
COPY infra/mvn-local-deps/ ./lib/

# Step 2: Install internal artifacts into local Maven cache.
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

# Step 3: Copy project POMs and download dependencies (cached Docker layer)
COPY pom.xml .
COPY backend/pom.xml backend/
RUN mvn dependency:go-offline -B -f backend/pom.xml -Dmaven.repo.local=/root/.m2/repository || true

# Step 4: Copy source and build
COPY backend/src backend/src
RUN mvn clean package -Dmaven.test.skip=true -B -f backend/pom.xml -Dmaven.repo.local=/root/.m2/repository

# ── Stage 2: Development (used by docker-compose.override.yml) ────────────────
# Full JDK + Maven for hot reload via spring-boot-devtools.
# Source and target dirs are volume-mounted from the host.
FROM maven:3.9-eclipse-temurin-21 AS development

WORKDIR /app

COPY infra/mvn-local-deps/ ./lib/

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

COPY pom.xml .
COPY backend/pom.xml backend/
RUN mvn dependency:go-offline -B -f backend/pom.xml -Dmaven.repo.local=/root/.m2/repository || true

COPY backend/src backend/src

EXPOSE 8080 5005

WORKDIR /app/backend

CMD ["mvn", "spring-boot:run", "-Dspring-boot.run.jvmArguments=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"]

# ── Stage 3: Production Runtime ───────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -g 1001 -S hrms && \
    adduser -u 1001 -S hrms -G hrms

RUN apk add --no-cache curl socat

RUN printf '%s\n' \
      '#!/bin/sh' \
      'read -r request_line || request_line=""' \
      'set -- ${request_line}' \
      'method="${1:-GET}"' \
      'path="${2:-/}"' \
      'case "${path}" in' \
      '  "/"|"/actuator/health"|"/actuator/health/liveness"|"/actuator/health/readiness")' \
      '    if [ "${method}" = "HEAD" ]; then' \
      "      printf 'HTTP/1.1 204 No Content\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'" \
      '    else' \
      "      printf 'HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: 9\r\n\r\nstarting\n'" \
      '    fi' \
      '    ;;' \
      '  *)' \
      "    printf 'HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: 17\r\n\r\nService starting\n'" \
      '    ;;' \
      'esac' \
      > /usr/local/bin/render-starting-response && \
    printf '%s\n' \
      '#!/bin/sh' \
      'set -eu' \
      'APP_PORT="${APP_PORT:-18080}"' \
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
      'SERVER_ADDRESS=127.0.0.1 SERVER_PORT="${APP_PORT}" exec java ${JAVA_OPTS:-} -jar app.jar' \
      > /usr/local/bin/render-entrypoint && \
    chmod +x /usr/local/bin/render-starting-response /usr/local/bin/render-entrypoint

COPY --from=build /app/backend/target/*.jar app.jar

RUN chown -R hrms:hrms /app

USER hrms

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENV JAVA_OPTS="-XX:+UseContainerSupport -Xms64m -Xmx224m -XX:MaxMetaspaceSize=192m -XX:ReservedCodeCacheSize=32m -XX:MaxDirectMemorySize=16m -Xss384k -XX:+UseSerialGC -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["/usr/local/bin/render-entrypoint"]

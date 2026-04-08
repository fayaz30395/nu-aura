# Multi-stage build for HRMS Backend
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS build

WORKDIR /app

# Step 1: Copy bundled JARs BEFORE any pom.xml so Maven has no project to scan
# (modules/common and modules/pm source is not in git — bundle pre-built JARs)
COPY lib/ ./lib/

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

RUN apk add --no-cache curl

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

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

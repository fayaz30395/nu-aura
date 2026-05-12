# Spring Boot 3.4 → 3.5 Upgrade Precheck

**Audit ID:** S13-H
**Date:** 2026-05-12
**Mode:** REPORT-ONLY — no source files modified
**Authoritative sources:** Spring Boot 3.5 reference docs (docs.spring.io/spring-boot/3.5/) via Context7, plus direct read of `pom.xml`, `backend/pom.xml`, `application*.yml`, `SecurityConfig.java`, `SamlSecurityConfig.java`, `DynamicSamlRelyingPartyRegistrationRepository.java`, and `logback-spring.xml`.

> **Brief correction:** The task description lists current Spring Boot as 3.4.1. Actual parent in `pom.xml` is **3.4.5**. The audit below is calibrated to 3.4.5 → 3.5.x.

---

## 1. Current State

| Item | Value | Evidence |
|------|-------|----------|
| Spring Boot parent | **3.4.5** | `pom.xml:23` |
| JDK target | **21** | `pom.xml:28`, `backend/pom.xml:36`, compiler plugin `backend/pom.xml:367-368` |
| Spring Framework | **6.2.x** (managed by Boot 3.4.5 BOM — 6.2.6 effective) | Transitive via `spring-boot-starter-parent:3.4.5` |
| Spring Security | **6.4.x** (managed by 3.4 BOM — 6.4.5 effective) | Transitive; usage evidence: `SecurityConfig.java:166` notes “Spring Security 6.4: permissionsPolicy(...) deprecated → permissionsPolicyHeader(...)” and `DynamicSamlRelyingPartyRegistrationRepository.java:139` notes “Spring Security 6.4: assertingPartyDetails(...) deprecated → assertingPartyMetadata(...)” — both follow-ups already landed in S11-P |
| Hibernate ORM | **6.6.x** (managed by 3.4 BOM) | Transitive via `spring-boot-starter-data-jpa` |
| Tomcat (embedded) | **10.1.x** | Transitive |
| Build modules | parent (`pom.xml`) → `modules/common`, `modules/pm`, `backend` | `pom.xml:14-18`. NOTE: `modules/common/pom.xml` and `modules/pm/pom.xml` are **missing** (only `target/` dirs present). Build is currently broken at the module level OR these are generated/excluded — flag as side-finding for S13 follow-up. |

**Backend-managed explicit override versions (`backend/pom.xml:36-43`):**

| Property | Current | Source |
|----------|---------|--------|
| `jjwt.version` | 0.12.6 | manual override |
| `mapstruct.version` | 1.6.3 | manual override |
| `poi.version` | 5.4.1 | manual override |
| `openpdf.version` | 2.2.2 | manual override |
| `springdoc.version` | **2.8.0** (task brief said 2.7.0 — actual is 2.8.0) | manual override |
| `lombok.version` | 1.18.36 | manual override |

**Other notable backend dep versions (literal):**

| Dependency | Version | Line |
|------------|---------|------|
| `tess4j` | 5.11.0 | `backend/pom.xml:331` |
| `tika-core` / `tika-parsers-standard-package` | 3.3.0 | `backend/pom.xml:337,343` |
| `shedlock-*` | 6.3.0 | `backend/pom.xml:227-233` |
| `bucket4j-core` | 8.7.0 | `backend/pom.xml:239` |
| `logstash-logback-encoder` | 7.4 | `backend/pom.xml:252` |
| `twilio` | 10.1.0 | `backend/pom.xml:323` |
| `google-api-client` | 2.2.0 | `backend/pom.xml:157` |
| `google-api-services-calendar` | v3-rev20231123-2.0.0 | `backend/pom.xml:164` |
| `google-api-services-drive` | v3-rev20231128-2.0.0 | `backend/pom.xml:171` |
| `google-auth-library-oauth2-http` | 1.20.0 | `backend/pom.xml:178` |
| `commons-csv` | 1.10.0 | `backend/pom.xml:220` |
| `archunit-junit5` | 1.2.1 | `backend/pom.xml:309` |

**Codebase size:**
- 1,808 Java source files
- 380 Spring stereotype annotations (@Service / @Component / @Configuration)
- 278 test classes, 68 of which use `@SpringBootTest`
- 5 active test files use deprecated `@MockBean` / `@SpyBean` (totaling **15 occurrences**): see Section 5

---

## 2. Spring Boot 3.5 Release Highlights

Spring Boot 3.5 GA shipped 22 May 2025; latest patch is **3.5.14** (Context7 reference shows `org.springframework.boot:3.5.14` in maintained examples). The task description cites a January 2026 GA date which is incorrect — 3.5.x has been GA for ~12 months and is currently in OSS support. Spring Boot **3.6** has not been released yet; the next major step would be **4.0** (Spring Framework 7).

### 2.1 Key New Features

1. **Structured logging stack-trace controls** (`logging.structured.json.stacktrace.*`) — fine-grained control over how stack traces appear in JSON/ECS/Logstash format. Properties:
   ```
   logging.structured.json.stacktrace.root=first
   logging.structured.json.stacktrace.max-length=1024
   logging.structured.json.stacktrace.include-common-frames=true
   logging.structured.json.stacktrace.include-hashes=true
   ```
   Relevant to us — our `PiiMaskingLogstashEncoder` (`logback-spring.xml:93-113,123-131`) writes JSON to Cloud Logging.

2. **SSL bundle hot-reload** — `JksSslBundleProperties` / `PemSslBundleProperties` with `SslProperties.Bundles.Watch.File`. Spring can reload TLS keystores at runtime without app restart.

3. **Docker Compose lifecycle controls** — `spring.docker.compose.lifecycle-management`, `spring.docker.compose.start.*`, `spring.docker.compose.stop.*`. Not used in our backend today (we run via K8s manifests, not Spring Boot's Compose integration).

4. **Bean background-initialization improvements** — refinement of 3.2-era feature; nothing we currently opt into.

5. **Spring Framework 6.2.x → 6.2.x (newer patch)** — generally additive: better virtual-thread integration, improved `@EnableAsync` semantics, `RestClient` quality-of-life.

6. **Spring Security 6.5** — paired BOM. Notable items affecting us are listed in Section 3.

7. **`@MockitoBean` / `@MockitoSpyBean`** are the Spring-Framework-provided replacements for the now-removable `@MockBean` / `@SpyBean` (see Section 5).

### 2.2 Breaking Changes (relevant to us)

- **None reported in 3.5 that affect our stack at compile or runtime** — `pom.xml` already uses `spring.data.redis.*` (renamed from `spring.redis.*` in 3.x — `application-prod.yml:70-86`). The two security follow-ups (`permissionsPolicyHeader`, `assertingPartyMetadata`) were already taken care of in S11-P, which was forward-looking — those APIs are the SY 6.5 / Boot 3.5 supported form.

### 2.3 Deprecations Resolved vs Introduced

| Item | 3.4 status | 3.5 status |
|------|-----------|-----------|
| `@MockBean`, `@SpyBean`, `MockitoTestExecutionListener` | Deprecated for removal in 4.0 (since 3.4.0) | **Still present, still deprecated.** Removal scheduled for 4.0. We MUST migrate before 4.0; 3.5 is the natural place to do it. |
| `permissionsPolicy(...)` | Deprecated | Already migrated to `permissionsPolicyHeader(...)` in our code (`SecurityConfig.java:167`) |
| `assertingPartyDetails(...)` | Deprecated | Already migrated to `assertingPartyMetadata(...)` (`DynamicSamlRelyingPartyRegistrationRepository.java:140`) |
| Various `@DeprecatedConfigurationProperty` on Flyway / Codec / GraphQL / Gson | Deprecated | Still deprecated; we use none of them |
| `metrics.export.prometheus.enabled` | Long-deprecated path | Our YAML still uses `management.metrics.export.prometheus.enabled` (`application.yml:230-233`, `application-prod.yml:138-141`) — see Section 4 |

---

## 3. Dependency Impact (3.4.5 BOM → 3.5.x BOM)

### 3.1 BOM-managed dependencies (no version pin in our pom — managed by parent)

Spring Boot 3.5 will silently bump these via the BOM. Versions below are the typical 3.5.x BOM values (rule of thumb: 3.5 takes 3.4 versions and bumps minor patches; large minor jumps below).

| Coordinate | 3.4 BOM (effective) | 3.5 BOM (effective) | Risk | Notes |
|------------|---------------------|---------------------|------|-------|
| `spring-core`, `spring-context`, `spring-web`, `spring-tx`, `spring-webmvc` | 6.2.6 | 6.2.x (newer patch) | LOW | Same minor line; patch-only bump |
| `spring-security-*` (web, oauth2-jose, saml2-service-provider, test) | 6.4.5 | **6.5.x** | LOW | See 3.2 below — we already migrated the two deprecations |
| `hibernate-core`, `hibernate-validator` (jakarta) | 6.6.x | **6.6.x (newer patch)** | LOW | Spring Boot 3.5 stays on Hibernate 6.6 line; 6.7 is NOT in 3.5 BOM (it lands in Boot 4.0) |
| `spring-kafka` | 3.3.x | **3.3.x → 3.3.x** | LOW | Same major; patch-only |
| `lettuce-core` | 6.5.x | 6.5.x | LOW | Patch-only |
| `jedis` (not on our classpath but in BOM) | n/a | n/a | n/a | We use Lettuce (default) — `application-prod.yml:82-86` |
| `spring-data-redis`, `spring-data-elasticsearch`, `spring-data-jpa` | 3.4.x | **3.5.x** | LOW | Standard Spring Data train bump |
| `elasticsearch-java` / `elasticsearch-rest-client` | 8.15.x | **8.15.x or 8.17.x** | LOW–MEDIUM | Verify after `mvn dependency:tree` — task brief mentions 8.11.0 but the BOM has been on 8.15+ since Boot 3.3 |
| `flyway-core`, `flyway-database-postgresql` | 10.x | **11.x** | **MEDIUM** | Flyway 11 dropped Java 17 support (we're on 21 — fine) AND deprecated `clean()` defaults to false (we already set `clean-disabled: true` in `application-prod.yml:62`). No action expected but run a smoke test. |
| `micrometer-core`, `micrometer-registry-prometheus` | 1.14.x | **1.15.x** | LOW | Patch additions only |
| `logstash-logback-encoder` (NOT in BOM — pinned by us at 7.4) | — | — | LOW | Our pin (7.4) is current; consider bumping to 8.0 in a separate ticket |
| `postgresql` (JDBC driver) | 42.7.x | 42.7.x | LOW | |
| `tomcat-embed-core` | 10.1.39 | **10.1.x (newer)** | LOW | Patch bump |
| `jackson-bom` | 2.18.x | **2.19.x** | LOW | Backward-compatible |
| `mockito-core`, `mockito-junit-jupiter` | 5.14.x | **5.15.x** | LOW | Patch bump |
| `junit-jupiter` | 5.11.x | **5.11.x or 5.12.x** | LOW | |
| `assertj-core` | 3.26.x | **3.27.x** | LOW | |
| `byte-buddy` | 1.15.x | 1.15.x | LOW | |
| `spring-boot-starter-thymeleaf` | 3.1.x | 3.1.x | LOW | |
| `springdoc-openapi-*` (NOT BOM-managed) | **2.8.0** pinned by us (`backend/pom.xml:41`) | unchanged | LOW | 2.8.0 supports Boot 3.4 AND 3.5. Latest is 2.8.13; bump optional. |
| `mapstruct` (NOT BOM-managed) | 1.6.3 pinned by us | unchanged | LOW | |
| `jjwt-*` (NOT BOM-managed) | 0.12.6 pinned by us | unchanged | LOW | Latest is 0.12.6; we are current |
| `poi-ooxml` (NOT BOM-managed) | 5.4.1 pinned by us | unchanged | LOW | Current line; verify against POI 5.4.x advisories. (Task brief said 5.4.1 — confirmed.) |
| `openpdf` (NOT BOM-managed) | 2.2.2 pinned by us | unchanged | LOW | Current; OpenPDF release cadence is slow |
| `tika-*` (NOT BOM-managed) | 3.3.0 pinned by us | unchanged | LOW | (Task brief said 3.3.0 — confirmed.) |
| `tess4j` (NOT BOM-managed) | 5.11.0 pinned by us | unchanged | LOW | |
| `shedlock-*` (NOT BOM-managed) | 6.3.0 pinned by us | unchanged | LOW | 6.3.0 supports Boot 3.4 and 3.5 |
| `bucket4j-core` (NOT BOM-managed) | 8.7.0 pinned by us | unchanged | LOW | |
| `archunit-junit5` (NOT BOM-managed) | 1.2.1 pinned by us | unchanged | LOW | |
| `twilio` (NOT BOM-managed) | 10.1.0 pinned by us | unchanged | LOW | |
| `google-api-client`, `google-api-services-*`, `google-auth-library-*` | pinned by us | unchanged | LOW | |
| `commons-csv` | 1.10.0 pinned by us | unchanged | LOW | |
| `h2` (test only) | 2.3.x in 3.4 BOM | 2.3.x in 3.5 BOM | LOW | |

**Bottom line for direct deps:** No explicit version override needs to be removed or added for the upgrade. None of our pinned versions conflict with the 3.5 BOM. (The `springdoc.version` brief said 2.7.0 but the file has 2.8.0; either way it works on both BOMs.)

### 3.2 Spring Security 6.4 → 6.5

We already adopted the two breaking-in-6.5 patterns in S11-P:

| 6.4 API (deprecated) | 6.5 API (used by us today) | File |
|----------------------|----------------------------|------|
| `headers().permissionsPolicy(...)` | `headers().permissionsPolicyHeader(...)` | `SecurityConfig.java:166-168` |
| `RelyingPartyRegistration.Builder.assertingPartyDetails(...)` | `RelyingPartyRegistration.Builder.assertingPartyMetadata(...)` | `DynamicSamlRelyingPartyRegistrationRepository.java:139-140` |

Other SY 6.5 items relevant to us:
- **`DaoAuthenticationProvider`** — `SecurityConfig.java:133-138` uses the no-arg constructor + setters. 6.5 deprecates the no-arg form in favor of `new DaoAuthenticationProvider(userDetailsService)`. **Not a build break in 6.5** (still works), but it produces a deprecation warning. **Action:** treat as a fast-follow refactor (out of scope for the version bump).
- **`spring-security-saml2-service-provider`** — `RelyingPartyRegistrations.fromMetadataLocation(...)` (`DynamicSamlRelyingPartyRegistrationRepository.java:123`) is unchanged in 6.5.
- **`AuthenticationManager` lookup** — unchanged.
- **Headers DSL** — `frameOptions`, `contentSecurityPolicy`, `httpStrictTransportSecurity`, `referrerPolicy`, `contentTypeOptions` — all unchanged in 6.5.

### 3.3 Hibernate 6.6 → 6.7

**Spring Boot 3.5 does NOT bump Hibernate to 6.7.** Hibernate 6.7 ships with Boot 4.0. Our Hibernate use stays on the 6.6 train — patch-level only, no JPA breakage expected.

Hibernate-specific YAML in `application.yml:70-93`:
- `default_batch_fetch_size`, `jdbc.batch_size`, `order_inserts`, `order_updates`, `query.plan_cache_max_size`, `query.plan_parameter_metadata_max_size`, `generate_statistics`, `session.events.log.LOG_QUERIES_SLOWER_THAN_MS` — all valid on 6.6 patch line.
- `tenant_identifier_resolver` (custom `com.hrms.common.config.TenantIdentifierResolver`) — unchanged contract.

### 3.4 Lettuce / Jedis

- We use **Lettuce** (default; pool config at `application-prod.yml:82-86` under `spring.data.redis.lettuce.pool.*`).
- 3.5 BOM brings Lettuce 6.5.x patch — no API change for our `RedisTemplate<String, Object>` usage (`RedisConfig.java`, `DistributedRateLimiter.java`, `TenantCacheManager.java`).

### 3.5 Kafka client

- `spring-kafka` 3.3.x stays in the same minor line. Kafka client (`kafka-clients`) typically gets a patch bump.
- Our `EventPublisher` and idempotency layer (Wave-10 P1-1 audit) use the standard `KafkaTemplate` API — no breakage expected.

---

## 4. Configuration Impact

### 4.1 Property renames / removals to watch

| Property we use | Status in 3.5 | File / line | Action |
|-----------------|---------------|-------------|--------|
| `management.metrics.export.prometheus.enabled` | **Replaced** by `management.prometheus.metrics.export.enabled` (since Boot 3.0; legacy form still works via relaxed binding but flagged by `spring-boot-properties-migrator`). | `application.yml:230-233`, `application-prod.yml:138-141` | Add `spring-boot-properties-migrator` (runtime scope) during the upgrade; fix YAML; remove migrator. **LOW effort** — only 2 occurrences. |
| `spring.data.redis.*` | Current, valid | `application-prod.yml:70-86` | OK |
| `spring.flyway.*` | Current | `application.yml:95-100`, `application-prod.yml:59-64` | OK |
| `spring.lifecycle.timeout-per-shutdown-phase` | Current | `application.yml:15-16` | OK |
| `spring.jpa.hibernate.ddl-auto` | Current | `application.yml:67-68` | OK |
| `spring.kafka.*` | Current | (used in env-driven config) | OK |
| `management.endpoint.health.probes.enabled` | Current | `application.yml:212-214` | OK |
| `management.endpoint.health.show-details` | Current | `application.yml:211`, `application-prod.yml:104` | OK |
| `server.shutdown=graceful` | Current | `application.yml:250` | OK |
| `springdoc.*` | External lib — unchanged | `application-prod.yml:158-161` | OK |

> **Recommendation:** Run with `spring-boot-properties-migrator` on the runtime classpath during the first dev build; it logs WARN for any property the migrator detects as renamed/removed. Then remove it.

### 4.2 logback-spring.xml compatibility

`logback-spring.xml` (164 lines) — all elements are standard Logback 1.5.x:
- `<conversionRule>` with custom `PiiMaskingConverter` → still supported
- `<springProfile name="...">` (Spring Boot extension) → still supported
- `<include resource="org/springframework/boot/logging/logback/defaults.xml"/>` → path unchanged in 3.5
- `PiiMaskingLogstashEncoder` (extends `LogstashEncoder` 7.4) → no API break in our use

**Optional 3.5 improvement:** the new `logging.structured.json.stacktrace.*` properties let you trim stack traces in production JSON output (currently we rely on Logback defaults). Out of scope for the version bump; capture as a follow-up.

### 4.3 Profile-specific settings

Reviewed `application.yml`, `application-dev.yml`, `application-prod.yml`, `application-demo.yml`, `application-render.yml`, `application-test.yml` — no settings affected by 3.5 deprecation lists in the Context7 reference. The `application-render.yml` and `application-prod.yml` are the highest-risk profiles (production traffic) but they use only stable property paths.

### 4.4 New 3.5 properties to consider (opt-in only — not required for the bump)

- `logging.structured.format.console=ecs` (or `logstash`) — would let us drop the custom Logstash encoder eventually.
- `spring.threads.virtual.enabled=true` — virtual threads for Tomcat / Scheduled tasks (JDK 21 ready). **Defer** — we have 25 `@Scheduled` jobs (per `.claude/CLAUDE.md`) and `ThreadLocal`-heavy tenant context (`TenantFilter`, `SecurityContext`, MDC for correlation IDs); virtual-thread compatibility needs a separate audit.
- `spring.ssl.bundle.watch.file.location` for TLS hot-reload — defer unless ops requests it.

---

## 5. Test Impact

### 5.1 `@MockBean` / `@SpyBean` deprecation

Confirmed via Spring Boot 3.5 API docs: both annotations are `@Deprecated(since = "3.4.0", forRemoval = true)` and slated for **removal in 4.0**. The replacement is `org.springframework.test.context.bean.override.mockito.MockitoBean` / `MockitoSpyBean` (Spring Framework 6.2+).

**Direct hits in our test tree (15 total occurrences across 5 files):**

| File | Occurrences | Hit details |
|------|-------------|-------------|
| `backend/src/test/java/com/hrms/integration/PayrollControllerTest.java` | 7 | `@MockBean` on 7 services (lines 57+); import at L19 |
| `backend/src/test/java/com/hrms/performance/PerformanceUseCaseBenchmarkTest.java` | 3 | — |
| `backend/src/test/java/com/hrms/integration/AuthControllerTest.java` | 2 | — |
| `backend/src/test/java/com/hrms/e2e/PayrollE2ETest.java` | 2 | — |
| `backend/src/test/java/com/hrms/e2e/WebSocketNotificationE2ETest.java` | 1 | — |

`.skip` files (currently excluded from compilation, but listed for completeness if/when re-enabled): `AssetManagementControllerTest`, `NotificationControllerTest`, `RoleControllerTest`, `PerformanceReviewControllerTest`, `AnalyticsControllerTest`, `LeaveRequestControllerTest` — these likely also use `@MockBean` and will need the same migration if revived.

**Migration (mechanical):**
```java
// Before
import org.springframework.boot.test.mock.mockito.MockBean;
@MockBean private SalaryStructureService salaryStructureService;

// After
import org.springframework.test.context.bean.override.mockito.MockitoBean;
@MockitoBean private SalaryStructureService salaryStructureService;
```
`@MockitoBean` accepts the same usage pattern (field-level + class-level) and is functionally equivalent. **Not a 3.5 build break** — old form compiles and runs in 3.5 with a deprecation warning. **Becomes a hard break in 4.0.**

**Recommendation:** Land the migration in a separate PR right after the 3.5 bump, while it's still optional. Use `find … | xargs sed` style script (not in this audit's scope).

### 5.2 `@SpringBootTest`, `@AutoConfigureMockMvc` behavior

- No documented behavior change in 3.5 vs 3.4 for these annotations.
- We have **68 `@SpringBootTest`** classes. The blast radius is wide if anything regresses, but no Spring 3.5 release-note item targets these annotations.
- `@AutoConfigureMockMvc(addFilters = false)` — used in `PayrollControllerTest.java:43`. Behavior unchanged in 3.5.
- `@WebMvcTest`, `@DataJpaTest` slices — unchanged.

### 5.3 Mockito version implications

- Boot 3.5 BOM bumps Mockito to 5.15.x. We use Mockito 5.14.x today (transitive). No API break: 5.x → 5.x; `@Mock`, `@InjectMocks`, `BDDMockito.given(...)`, `Mockito.verify(...)` patterns are unchanged.

### 5.4 ArchUnit, H2, JUnit, AssertJ

- ArchUnit 1.2.1 (our pin) is compatible with both 3.4 and 3.5. No change needed.
- H2 (test-scope) — patch-level bump in 3.5 BOM; SQL we run against H2 is unchanged.
- JUnit Jupiter 5.11 → 5.11/5.12 — same API surface.

---

## 6. Migration Plan

### 6.1 One-line bump

```xml
<!-- pom.xml line 23 -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.14</version>   <!-- was 3.4.5 -->
    <relativePath/>
</parent>
```

No other manual version changes required for the bump itself.

### 6.2 Pre-flight steps (in order)

1. **Resolve modules build (independent prerequisite).** `modules/common/pom.xml` and `modules/pm/pom.xml` are missing on disk. Either restore them or temporarily remove `<module>` entries from the parent `pom.xml` for the upgrade build. **This blocks the bump regardless of Boot version.**
2. Add `spring-boot-properties-migrator` (runtime, dev profile only) to surface any property warnings:
   ```xml
   <dependency>
     <groupId>org.springframework.boot</groupId>
     <artifactId>spring-boot-properties-migrator</artifactId>
     <scope>runtime</scope>
   </dependency>
   ```
3. `mvn -pl backend dependency:tree -DoutputFile=tree-3.4.txt` — capture baseline.
4. Apply the parent bump.
5. `mvn -pl backend dependency:tree -DoutputFile=tree-3.5.txt` — capture target.
6. Diff: `diff tree-3.4.txt tree-3.5.txt | head -200`. Confirm only patch/minor bumps; no MAJOR jumps unaccounted for.
7. `mvn -pl backend clean compile` — expect 0 errors, expect deprecation warnings for `@MockBean` / `@SpyBean` only.
8. `mvn -pl backend test -DskipITs=false` — expect green. Watch for any startup-time WARN from the properties migrator.
9. Boot the app in `dev` profile; hit `/actuator/health` and `/actuator/prometheus`; verify SAML SP metadata endpoint still resolves.
10. Remove `spring-boot-properties-migrator`.
11. Update YAML if migrator flagged renames (currently expected: `management.metrics.export.prometheus.enabled` → `management.prometheus.metrics.export.enabled` — 2 files).

### 6.3 Test-suite expected breakages

- **None at compile time.** Deprecation warnings only for `@MockBean` / `@SpyBean` (15 occurrences).
- **Possible runtime warnings** from Hibernate / Lettuce patch bumps; none are gate-failing.
- Existing skipped tests (`.skip` files) stay skipped.
- JaCoCo 0.8.13 (`backend/pom.xml:419`) is compatible with JDK 21 + Boot 3.5; coverage gate at 80% remains achievable.

### 6.4 Rollback procedure

Rollback is one revert commit:
```bash
git revert <bump-commit-sha>
mvn -pl backend clean install -DskipTests
```
**Risk:** If a Flyway 11 migration ran during 3.5 testing, ensure no schema state changed. We don't expect new Flyway-side schema effects on a version bump (clean migrations only run new SQL — V129+).

**State to preserve before bumping:**
- Tag the current `main` branch `pre-spring-3.5` for fast rollback reference.
- Capture `mvn dependency:tree` before/after as evidence.

### 6.5 Estimated effort

| Phase | Hours | Notes |
|-------|-------|-------|
| Restore `modules/common` + `modules/pm` poms | 0.5 – 2 | Unknown until we see what's missing — possibly trivial, possibly a full investigation |
| Parent version bump + dependency:tree diff | 0.5 | Mechanical |
| First green local build (`mvn clean compile test`) | 1 – 2 | Assuming module poms restored; primarily downloads + compile |
| YAML property migration (`management.metrics.export.*`) | 0.5 | 2 files, 2 keys |
| Full regression smoke (manual: login, payroll dry-run, SAML SP, Kafka publish, Redis cache, WebSocket relay) | 2 – 3 | Smoke list maps to the 25 scheduled jobs + 7 hot paths |
| `@MockBean` → `@MockitoBean` (optional, but recommended in same wave) | 1 – 2 | 15 occurrences across 5 files; mechanical sed-able |
| CI run + observability check (Prometheus scrape, Grafana dashboards) | 1 | Verify metric names unchanged |
| **Total — first green build** | **2 – 5 hours** | Assuming module pom issue is trivial |
| **Total — full regression release-ready** | **6 – 11 hours** | Including MockitoBean migration |

---

## 7. Risk Assessment

| Module / Concern | Risk | Reasoning |
|------------------|------|-----------|
| Parent `pom.xml` build | **MEDIUM** | `modules/common` and `modules/pm` poms missing on disk — blocks compilation regardless of Boot version. Investigate first. |
| `backend/pom.xml` BOM upgrade | **LOW** | All pinned versions are compatible with 3.5 BOM; no forced override needed |
| `common/security/SecurityConfig.java` | **LOW** | Already on `permissionsPolicyHeader` (6.5 form). `DaoAuthenticationProvider` no-arg ctor → deprecation warning only. |
| `common/security/DynamicSamlRelyingPartyRegistrationRepository.java` | **LOW** | Already on `assertingPartyMetadata` (6.5 form) |
| `common/config/RedisConfig.java` + `DistributedRateLimiter.java` + `TenantCacheManager.java` | **LOW** | `RedisTemplate<String, Object>` API stable; `spring.data.redis.*` properties stable |
| Kafka producer / consumer layer (idempotency) | **LOW** | `spring-kafka` 3.3 patch only |
| Flyway migration runner | **LOW–MEDIUM** | Flyway 10 → 11 in BOM. `clean-disabled: true` is already set in prod (`application-prod.yml:62`). Smoke-test once. |
| Hibernate / JPA layer | **LOW** | Stays on 6.6 train (Boot 3.5 does not jump to 6.7) |
| 25 `@Scheduled` jobs + ShedLock | **LOW** | ShedLock 6.3.0 supports Boot 3.4 and 3.5 |
| Test suite | **LOW** | Source-compatible. 15 `@MockBean` instances warn but pass. |
| YAML configuration | **LOW** | Two occurrences of legacy `management.metrics.export.prometheus.enabled` — migrator-flagged, easy fix |
| Production runtime (Render / GKE) | **LOW** | No platform-affecting changes in 3.5; `forward-headers-strategy`, graceful shutdown, Prometheus scrape all unchanged |
| Observability (Micrometer → Prometheus) | **LOW** | Metric names unchanged; SLO histograms (`http.server.requests`) unchanged |

### Recommendation: **Upgrade now (or as early as Q2 2026)**

**Rationale:**
1. Spring Boot **3.4.x exits OSS support in November 2025** — 3.4.5 is already on the borrowed-time end of its lifecycle. Staying on 3.4 means losing free CVE patches.
2. The 3.5 upgrade is **mechanical** for us — S11-P already paid down the only two Spring Security 6.4 → 6.5 deprecations.
3. The only meaningful work item (`@MockBean` → `@MockitoBean`) is non-blocking; it's required for 4.0 anyway and the codebase has only 15 occurrences in 5 files.
4. **Defer to Q3 2026 only if** the missing `modules/common/pom.xml` and `modules/pm/pom.xml` situation cannot be resolved within the same wave — those are an absolute blocker that has nothing to do with Spring Boot.

**Do NOT couple this with the eventual 4.0 (Spring Framework 7 / Jakarta EE 10 → 11) upgrade** — 4.0 is a much larger lift involving Hibernate 6.7, JDK 25, and the removal of `@MockBean`/`@SpyBean`. Land 3.5 cleanly first, then plan 4.0 in a separate epic.

---

## Appendix A — Evidence summary

| Question from brief | Answer | Evidence file:line |
|---------------------|--------|---------------------|
| Current Spring Boot | 3.4.5 (NOT 3.4.1) | `pom.xml:23` |
| Current Spring Security | 6.4.x via BOM | Comment in `SecurityConfig.java:166` |
| Current Spring Framework | 6.2.x via BOM | Transitive |
| Current JDK target | 21 | `pom.xml:28`, `backend/pom.xml:36`, `backend/pom.xml:367-368` |
| `permissionsPolicyHeader` adopted? | Yes (S11-P) | `SecurityConfig.java:167` |
| `assertingPartyMetadata` adopted? | Yes (S11-P) | `DynamicSamlRelyingPartyRegistrationRepository.java:140` |
| `@MockBean` deprecated in 3.4? | Yes, removal in 4.0, replaced by `@MockitoBean` | Spring Boot 3.5 API javadoc (Context7) |
| Hibernate 6.6 → 6.7 in 3.5? | No — 3.5 stays on 6.6 patch line | Boot 3.5 BOM (Context7) |
| Kafka client version bump in 3.5? | Patch-only (spring-kafka 3.3 → 3.3) | Boot 3.5 BOM |
| Property migration tooling | `spring-boot-properties-migrator` (runtime scope) | docs.spring.io/spring-boot/3.5/upgrading.html |
| `springdoc` version in repo | **2.8.0** (brief said 2.7.0) | `backend/pom.xml:41` |
| `poi.version` | 5.4.1 (matches brief) | `backend/pom.xml:39` |
| `tika` version | 3.3.0 (matches brief) | `backend/pom.xml:337,343` |
| `jjwt.version` | 0.12.6 (matches brief) | `backend/pom.xml:37` |
| `openpdf.version` | 2.2.2 (matches brief) | `backend/pom.xml:40` |

---

## Appendix B — Top 3 Recommendations

1. **Unblock the parent build first.** `modules/common/pom.xml` and `modules/pm/pom.xml` are referenced from `pom.xml:14-18` but not present on disk (only `target/` remnants exist). This is an independent blocker that must be resolved before any Spring Boot upgrade can compile. Investigate whether these poms were accidentally deleted, are generated, or whether the `<module>` entries should simply be removed.
2. **Bump Spring Boot parent from 3.4.5 to 3.5.14 in a focused PR.** The codebase is unusually well-prepared (S11-P already migrated the two Security 6.5 deprecations) — expect ~2–5 hours to first green build and ~6–11 hours to full regression-ready. Risk is LOW across all modules. Pair the bump with the `management.metrics.export.prometheus.enabled` property fix (2 YAML files).
3. **Schedule `@MockBean` → `@MockitoBean` as a follow-up PR within the same wave.** Only 15 occurrences across 5 active test files; mechanical migration. Not required for 3.5 (it's source-compatible) but required before any future 4.0 upgrade, and doing it now keeps the deprecation-warning count at zero, which matches the QA hygiene already established in this branch.

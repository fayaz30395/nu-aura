# Defects - agent be

## DEF-BE-01 (Medium) Integration tests need Docker; no DB-level RLS proof ran
Root cause: shared Spring Boot IT context requires Testcontainers PG; Docker/colima down. 772 errors/78 classes; RLS no-bypass tests (RlsNoBypassTest x2, RlsTenantGucScopeTest x1) skipped. Not a product defect. Repro: `mvn -o test` with Docker down. Fix: run suite with colima up (CI has it) and record result before release; effort S.

## DEF-BE-02 (Medium, prod-start risk) 44 migration files edited after being applied
Files: V0, V2-V12, V19, V65-V67, V69-V70, V74, V80, V82, V87-V89, V93, V96, V111, V113, V115-V118, V132-V133, V171, V265-V268, V292, V307-V308, V313, V315 (list in evidence/logs/NU-BE-030-flyway-checksums.txt). Local DB checksum != file. Prod profile: validate-on-migrate=true, repair-on-migrate=false (application-prod.yml:~101-106) -> any DB holding old checksums fails startup. Repro: python3 -I evidence/scripts/be/flyway_checksum.py <migration dir> <tsv>. Fix: confirm prod history checksums (needs user authorization), then either `flyway repair` as explicit operator step or restore original file contents + forward migration; effort S-M. Also pm-module V1 history row has no matching file (confirm separate history table).

## DEF-BE-03 (Info, withdrawn as defect) mvn exit 0 with 772 errors
No testFailureIgnore in pom.xml/backend/pom.xml or .mvn config; the BUILD SUCCESS in the earlier run most likely came from a -Dmaven.test.failure.ignore flag on that run's command line (not recorded). Not a repo defect; CI exit code behaviour unverified.

## DEF-BE-04 (High, unverified) Resolved versions behind published CVE fixes
Tomcat 10.1.59 (WebSocket constraint bypass CVE-2026-76183 CVSS 9.8; fix 10.1.60/61), Spring Framework 6.2.18 (June batch, fix 6.2.19), Spring Security 6.5.10 (SAML CVE-2026-41694, X.509 CVE-2026-47838; fix 6.5.11), Jackson 2.21.2 (fix 2.21.4+). Source: secondary web advisories; confirm on spring.io/tomcat.apache.org. Fix: Boot parent 3.5.16, tomcat.version 10.1.61, jackson-bom >=2.21.6, rerun tests; effort S. No OSS fix found for CVE-2026-59283 (SpEL), WebAuthn CVE-2026-47841 -> Boot 3.5 is EOL; plan 4.x migration.

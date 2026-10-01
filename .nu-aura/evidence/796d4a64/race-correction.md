# ENVIRONMENT_FAILURE correction — concurrent-Maven `target/` corruption

Date: 2026-09-30

## Symptom

Surefire reports timestamped 20:39–20:42 recorded mass failures across unrelated suites:

- `WebSocketNotificationE2ETest` 17/17 errors
- `LeaveRequestE2ETest` 6 failures + 1 error
- `ValidationAndLoggingE2ETest` 3 failures
- `PayrollProcessingConsumerTest` 3 failures + 2 errors
- `PayrollE2ETest` 1 error
- IDOR/scope test classes reporting `Tests run: 0`

Error signatures: `NoClassDefFoundError: com/nulogic/application/notification/dto/NotificationMessage$NotificationMessageBuilder`
(Lombok-generated builder) and `Unresolved compilation problems: The import lombok.Builder cannot be resolved`.

## Diagnosis

The generated builder class **did exist** on disk (`target/classes/.../NotificationMessage$NotificationMessageBuilder.class`,
mtime 20:36) yet the test JVM could not load it minutes later. "Unresolved compilation problems" on
`import lombok.Builder` indicates test sources were compiled against a classpath momentarily missing the
Lombok-annotated main outputs. This is the signature of **two Maven builds sharing one `backend/target`
directory concurrently** — one invocation cleans/rewrites `target/classes` while another's compile/test
JVM is mid-flight.

Classification: **ENVIRONMENT_FAILURE** (build orchestration), not a product defect and not a flaky test.

## Correction (verified)

Re-ran the same classes in a **single sequential** Maven invocation (no concurrent build; only IntelliJ's
JPS for an unrelated project was running):

- `PayrollProcessingConsumerTest` 8/8 PASS
- `LeaveRequestE2ETest` 12/12 PASS
- `WebSocketNotificationE2ETest` 17/17 PASS
- `ValidationAndLoggingE2ETest` 24/24 PASS
- `AnalyticsE2ETest` 1 genuine failure remaining (separate defect, fixed in `796d4a64`)

The full suite (`mvn -o -pl . test`) then passed 4724/4724.

## Operational rule adopted (SUPERVISOR)

Never run two Maven (or two `next build`) invocations against the same module/`target` concurrently.
Serialize all build/test commands against `backend/target` and `frontend/.next`. Locks under
`.nu-aura/locks/` are advisory only — the concrete protection is serialization.

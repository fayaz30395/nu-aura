# Observability Architecture

Observability in a distributed HRMS platform is non-negotiable. Debugging an issue involving a
failed Payroll run that spans three microservices and Kafka requires standardizing on the three
pillars of observability: Logs, Metrics, and Traces.

## 1. Centralized Logging (The ELK Stack)

Every component (microservices, frontend, gateways) emits structured logs.

- **Format:** All logs must format output as single-line JSON (
  `{"level": "INFO", "service": "payroll-svc", "message": "Run finished"}`). Plain text parsing is
  error-prone.
- **Log Forwards (Fluentd / Logstash):** A DaemonSet runs on every Kubernetes node, capturing
  `stdout`/`stderr` from all containers, enriching them with Kubernetes metadata (Pod Name,
  Namespace), and forwarding them.
- **Storage & Search (Elasticsearch/OpenSearch):** The centralized index for all log data.
- **Visualization (Kibana):** Used by SREs and Devs to query logs.
  - *Example Query:* `service: "attendance-svc" AND tenant_id: "T-1234" AND level: "ERROR"`

### Semantic Logging Requirements

- Logs must NEVER contain sensitive PII (Social Security Numbers, Salary amounts, plain text
  passwords).
- Log `tenant_id` consistently to allow filtering issues by the affected customer.

## 2. Distributed Tracing (OpenTelemetry)

When a user clicks "Approve Leave", the request hits the Gateway -> Leave Service -> Approval
Engine -> Notification Service. Tracing visualizes this entire chain.

- **Trace Context Propagation:** The API Gateway generates a unique `trace_id` (W3C standard) for
  the incoming request, appending it as an HTTP header (e.g., `traceparent`).
- **Microservice Instrumentation:** Each Spring Boot microservice is instrumented using the
  OpenTelemetry Java Agent. It reads the incoming `trace_id`, adds its local execution spans (e.g.,
  `db_query_time`, `calculate_balance`), and injects the `trace_id` into any downstream HTTP calls
  or Kafka messages it produces.
- **Backend (Jaeger / Zipkin / Tempo):** Collects the span data from all services and reconstructs
  the waterfall view of the request latency.
- **Benefit:** Instantly identifies the bottleneck (e.g., "The slow approval was caused by the
  Notification Service taking 4 seconds to reach SendGrid").

## 3. Metrics & Monitoring (Prometheus & Grafana)

Used for alerting and high-level dashboarding of system health.

- **Exposition (Prometheus Micrometer):** Every microservice exposes a `/actuator/prometheus`
  endpoint containing raw time-series metrics.
- **Scraping (Prometheus Server):** Periodically polls the endpoints to collect data.
- **Visualization (Grafana):** Connects to Prometheus to create dashboards.

### Standard Golden Signals to Monitor:

1. **Latency:** The time it takes to service requests (e.g., API P99 response times).
2. **Traffic:** The current demand (e.g., API Gateway HTTP requests per second).
3. **Errors:** Rate of failed requests (e.g., Percentage of HTTP 5xx errors).
4. **Saturation:** Resource utilization (e.g., Pod CPU usage, Database connection pool exhaustion).
5. **Business Metrics:** Track domain-specific counts (e.g., Number of Payslips generated today,
   Number of Active Tenants).

### Alerting (Alertmanager)

Rules configured in Prometheus trigger alerts (routed to Slack or PagerDuty) if thresholds are
breached.

- *Example Alert:* `job: attendance-svc_latency_high` triggers if P95 latency > 1000ms for 5
  consecutive minutes.

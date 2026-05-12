# infra/

Operational and deployment configuration for NU-AURA.

| Path | Contents |
|---|---|
| `deployment/` | GCP cloudbuild, K8s manifests, deploy scripts |
| `monitoring/` | Prometheus, Grafana, AlertManager configs (incl. `prometheus.yml`) |
| `mvn-local-deps/` | Locally-installed Maven artifacts (common-module, pm-module, nulogic-platform). Referenced by `.github/workflows/ci.yml` |

Behavioural-equivalent move from the previous root-level `deployment/`, `monitoring/`, `lib/`, and root `prometheus.yml`. No functional change.

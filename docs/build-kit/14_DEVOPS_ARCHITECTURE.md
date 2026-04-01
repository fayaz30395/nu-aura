# DevOps & Infrastructure Architecture

The HRMS platform targets a highly available, scalable, cloud-native infrastructure model designed to run on managed Kubernetes providers (e.g., Amazon EKS, Google GKE, Azure AKS).

## 1. Containerization
Every microservice and frontend application is packaged as an immutable Docker container.

### Base Images
- **Backend (Java 21/Spring Boot):** Utilizes distroless or Alpine OpenJDK base images to minimize the attack surface. Layered JAR building (Spring Boot 3 feature) is used to optimize push/pull times (caching dependencies separately from application code).
- **Frontend (React/Vite):** Multi-stage build. Node.js builder image compiles the static assets. Production image uses an unprivileged Nginx Alpine image, simply serving the static `/dist` directory.

## 2. Kubernetes Deployment Topology (EKS/GKE)

### Namespaces
Logical isolation within the cluster.
- `ingress`: Nginx Ingress Controller or API Gateway (e.g., Kong).
- `hrms-core`: Core backend microservices (`employee-service`, `leave-service`).
- `hrms-frontend`: Frontend React pod(s).
- `monitoring`: Prometheus, Grafana, OpenTelemetry Collectors.
- `stateful`: (If hosting data layer in-cluster, though managed DBs are preferred).

### Compute Provisioning (Auto-Scaling)
- **HPA (Horizontal Pod Autoscaler):** Automatically scales the number of replicas for services like `attendance-service` (which spikes at 9 AM) based on CPU/Memory thresholds (e.g., TARGET_CPU > 70%).
- **Cluster Autoscaler (or Karpenter):** Provisions underlying EC2/Compute nodes when HPA schedules pods that exceed current cluster capacity.

### Networking & Ingress
- External traffic hits an L7 Cloud Load Balancer, routing to the Ingress Controller.
- **Ingress Controller:** Manages SSL/TLS termination, routing rules based on hostnames (`api.tenant.com`) and paths (`/api/v1/auth`), and enforces basic rate limiting.
- **Service Mesh (Optional but Recommended):** e.g., Istio or Linkerd. Provides zero-trust mTLS encryption for inter-service communication, circuit breaking, and advanced traffic routing (canary deployments).

## 3. CI/CD Pipeline Architecture

The platform demands a robust, automated pipeline (e.g., GitHub Actions, GitLab CI).

### Continuous Integration (CI) - Triggered on standard PRs
1. **Code Checkout.**
2. **Linting & Formatting:** Enforce standard style guides (Checkstyle/ESLint).
3. **Unit & Integration Testing:** Run tests with coverage threshold gates (>80%).
4. **Static Application Security Testing (SAST):** Scans for code vulnerabilities (e.g., SonarQube).
5. **Software Composition Analysis (SCA):** dependency vulnerability scanning (e.g., Snyk or Dependabot).

### Continuous Deployment (CD) - Triggered on Merge to Main
1. **Build Docker Image:** Tagged with the Git commit SHA or SemVer version.
2. **Push Image:** To a private cloud container registry (ECR/GCR).
3. **Update Manifests:** Updates the Kubernetes deployment templates (Helm charts or Kustomize manifests) with the new image tag.
4. **Sync (GitOps):** Tools like ArgoCD or Flux detect the manifest change in the repo and automatically reconcile the cluster state safely, applying rolling updates to pods to maintain zero downtime.

## 4. Environment Strategy
- **Development (`dev`):** Ephemeral or shared testing ground for engineers. Auto-deploys frequently.
- **Staging (`stg`):** A pre-production clone matching production configurations. Used for UAT (User Acceptance Testing) and QA sign-off. Data is typically scrubbed/anonymized from prod.
- **Production (`prod`):** Highly restricted access. Deployments are governed by change control approvals.

## 5. Configuration Management
Following 12-Factor App principles, applications read configuration from the environment, not hardcoded files.
- **Kubernetes ConfigMaps:** Used for non-sensitive data (e.g., logging levels, internal service URLs).
- **Kubernetes Secrets / External Secret Operator:** For sensitive credentials (DB passwords, API keys). Integrates with managed KMS (AWS Secrets Manager or Hashicorp Vault) to sync secrets securely into the cluster at runtime.

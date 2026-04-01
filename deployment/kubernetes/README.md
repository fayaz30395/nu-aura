# Kubernetes Manifests — Apply Order

## IMPORTANT: Do NOT run `kubectl apply -f .` (applies everything including legacy files)

Apply files individually in this order:

```bash
# 1. Namespace first
kubectl apply -f namespace.yaml

# 2. Secrets (fill in all REPLACE_* values first!)
kubectl apply -f secrets.yaml

# 3. ConfigMap (non-secret config, profile settings)
kubectl apply -f configmap.yaml

# 4. Backend
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml

# 5. Frontend
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# 6. Ingress (GCE managed certificates + Cloud Armor)
kubectl apply -f ingress.yaml

# 7. Autoscaling
kubectl apply -f hpa.yaml

# 8. Network policies
kubectl apply -f network-policy.yaml
```

## Legacy Files (DO NOT APPLY)

| File | Why deprecated |
|------|----------------|
| `deployment.yaml` | Superseded by `backend-deployment.yaml`; same resource name, wrong labels |
| `service.yaml` | Superseded by `backend-service.yaml` + `frontend-service.yaml`; wrong label selectors |

## Secret Preparation Checklist

Before applying `secrets.yaml`, replace every `REPLACE_*` placeholder:

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate AES-256 encryption key
openssl rand -base64 32

# Then edit secrets.yaml and apply
kubectl apply -f secrets.yaml

# Verify secrets are present
kubectl get secret hrms-secrets -n hrms -o jsonpath='{.data}' | python3 -m json.tool
```

## Verify Deployment Health

```bash
# Wait for pods to be ready
kubectl rollout status deployment/hrms-backend -n hrms
kubectl rollout status deployment/hrms-frontend -n hrms

# Check liveness
kubectl exec -n hrms deploy/hrms-backend -- curl -s http://localhost:8080/actuator/health | python3 -m json.tool
```

# HRMS Platform - GCP Deployment Guide

This directory contains all the necessary configuration files for deploying the HRMS Platform to Google Cloud Platform (GCP).

## Directory Structure

```
deployment/
├── docker/
│   ├── Dockerfile.backend       # Production Dockerfile for Spring Boot backend
│   └── Dockerfile.frontend      # Production Dockerfile for Next.js frontend
├── gcp/
│   ├── cloudbuild.yaml         # Cloud Build CI/CD pipeline configuration
│   └── app.yaml                # App Engine configuration (alternative to Cloud Run)
├── kubernetes/
│   ├── deployment.yaml         # Kubernetes deployments and autoscaling
│   ├── service.yaml            # Kubernetes services and load balancers
│   ├── ingress.yaml            # Ingress configuration with SSL/TLS
│   ├── configmap.yaml          # Environment configuration
│   └── secrets.yaml            # Secrets template (DO NOT commit actual secrets)
└── README.md                   # This file
```

## Deployment Options

You can deploy the HRMS Platform using one of the following options:

### Option 1: Cloud Run (Recommended for Serverless)

Cloud Run is the easiest and most cost-effective option for most use cases.

**Advantages:**
- Fully managed, serverless
- Auto-scaling to zero (pay only for what you use)
- Simple deployment process
- Built-in SSL certificates
- No cluster management

**Steps:**

1. **Set up GCP Project:**
   ```bash
   # Set your project ID
   export PROJECT_ID="your-project-id"
   gcloud config set project $PROJECT_ID

   # Enable required APIs
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

2. **Create secrets in Secret Manager:**
   ```bash
   # Database credentials
   echo -n "jdbc:postgresql://YOUR_DB_HOST:5432/hrms" | gcloud secrets create DATABASE_URL --data-file=-
   echo -n "hrms_user" | gcloud secrets create DB_USERNAME --data-file=-
   echo -n "your-secure-password" | gcloud secrets create DB_PASSWORD --data-file=-

   # JWT Secret
   openssl rand -base64 64 | gcloud secrets create JWT_SECRET --data-file=-

   # Google OAuth
   echo -n "your-client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
   echo -n "your-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-

   # OpenAI API Key
   echo -n "sk-..." | gcloud secrets create OPENAI_API_KEY --data-file=-
   ```

3. **Deploy using Cloud Build:**
   ```bash
   # Submit build
   gcloud builds submit --config=deployment/gcp/cloudbuild.yaml
   ```

   Or manually:
   ```bash
   # Build and push backend
   gcloud builds submit --tag gcr.io/$PROJECT_ID/hrms-backend ./platform/hrms-backend

   # Deploy backend to Cloud Run
   gcloud run deploy hrms-backend \
     --image gcr.io/$PROJECT_ID/hrms-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --set-secrets DATABASE_URL=DATABASE_URL:latest,DB_USERNAME=DB_USERNAME:latest,DB_PASSWORD=DB_PASSWORD:latest

   # Build and push frontend
   gcloud builds submit --tag gcr.io/$PROJECT_ID/hrms-frontend ./platform/hrms-frontend

   # Deploy frontend to Cloud Run
   gcloud run deploy hrms-frontend \
     --image gcr.io/$PROJECT_ID/hrms-frontend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Option 2: App Engine Flexible

Use App Engine if you prefer a PaaS approach with less configuration.

**Steps:**

1. **Configure app.yaml:**
   Edit `deployment/gcp/app.yaml` and update the beta settings with your Cloud SQL instance.

2. **Deploy:**
   ```bash
   gcloud app deploy deployment/gcp/app.yaml
   ```

### Option 3: Google Kubernetes Engine (GKE)

Use GKE for full control and when you need advanced Kubernetes features.

**Advantages:**
- Full control over infrastructure
- Advanced networking and security options
- Support for stateful workloads
- Multi-region deployments

**Steps:**

1. **Create GKE Cluster:**
   ```bash
   # Create a regional cluster for high availability
   gcloud container clusters create hrms-cluster \
     --region us-central1 \
     --num-nodes 1 \
     --machine-type n1-standard-2 \
     --enable-autoscaling \
     --min-nodes 1 \
     --max-nodes 10 \
     --enable-autorepair \
     --enable-autoupgrade \
     --enable-ip-alias \
     --workload-pool=$PROJECT_ID.svc.id.goog

   # Get credentials
   gcloud container clusters get-credentials hrms-cluster --region us-central1
   ```

2. **Install required components:**
   ```bash
   # Install External Secrets Operator (for GCP Secret Manager integration)
   helm repo add external-secrets https://charts.external-secrets.io
   helm install external-secrets \
     external-secrets/external-secrets \
     -n external-secrets-system \
     --create-namespace

   # Install NGINX Ingress Controller (optional, instead of GCE ingress)
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm install ingress-nginx ingress-nginx/ingress-nginx \
     --create-namespace \
     --namespace ingress-nginx

   # Install cert-manager (for SSL certificates)
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

3. **Create namespace and configure secrets:**
   ```bash
   # Create namespace
   kubectl create namespace hrms

   # Create secrets (choose one method):

   # Method A: Using External Secrets (recommended)
   kubectl apply -f deployment/kubernetes/secrets.yaml

   # Method B: Manual secret creation
   kubectl create secret generic hrms-backend-secrets \
     --from-literal=SPRING_DATASOURCE_URL='jdbc:postgresql://...' \
     --from-literal=SPRING_DATASOURCE_USERNAME='hrms_user' \
     --from-literal=SPRING_DATASOURCE_PASSWORD='secure-password' \
     --from-literal=JWT_SECRET='very-long-random-secret' \
     --namespace=hrms
   ```

4. **Update configuration:**
   ```bash
   # Edit configmap.yaml and update environment-specific values
   # Edit deployment.yaml and update image names
   # Edit ingress.yaml and update domain names
   ```

5. **Deploy to GKE:**
   ```bash
   # Apply all configurations
   kubectl apply -f deployment/kubernetes/configmap.yaml
   kubectl apply -f deployment/kubernetes/secrets.yaml
   kubectl apply -f deployment/kubernetes/deployment.yaml
   kubectl apply -f deployment/kubernetes/service.yaml
   kubectl apply -f deployment/kubernetes/ingress.yaml

   # Check deployment status
   kubectl get pods -n hrms
   kubectl get services -n hrms
   kubectl get ingress -n hrms
   ```

6. **Set up monitoring:**
   ```bash
   # Install Prometheus and Grafana
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm install prometheus prometheus-community/kube-prometheus-stack \
     --namespace monitoring \
     --create-namespace
   ```

## Database Setup

### Cloud SQL (Recommended)

1. **Create Cloud SQL instance:**
   ```bash
   gcloud sql instances create hrms-postgres \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1 \
     --storage-type=SSD \
     --storage-size=10GB \
     --backup \
     --backup-start-time=03:00

   # Create database
   gcloud sql databases create hrms --instance=hrms-postgres

   # Create user
   gcloud sql users create hrms_user \
     --instance=hrms-postgres \
     --password=SECURE_PASSWORD
   ```

2. **Connect from Cloud Run:**
   Add to Cloud Run deployment:
   ```bash
   --add-cloudsql-instances PROJECT_ID:REGION:hrms-postgres
   ```

3. **Connect from GKE:**
   Use Cloud SQL Proxy sidecar or Workload Identity.

## Redis Setup (Optional)

```bash
# Create Memorystore Redis instance
gcloud redis instances create hrms-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x
```

## MinIO Setup (Object Storage)

For GCP, use Google Cloud Storage instead of MinIO:

```bash
# Create storage bucket
gsutil mb -l us-central1 gs://hrms-files-$PROJECT_ID

# Set lifecycle policy (optional)
gsutil lifecycle set storage-lifecycle.json gs://hrms-files-$PROJECT_ID
```

Update backend configuration to use GCS instead of MinIO.

## CI/CD Pipeline

The included `cloudbuild.yaml` sets up a complete CI/CD pipeline:

1. **Trigger on git push:**
   ```bash
   # Connect repository
   gcloud builds triggers create github \
     --repo-name=hrms-platform \
     --repo-owner=your-org \
     --branch-pattern="^main$" \
     --build-config=platform/deployment/gcp/cloudbuild.yaml
   ```

2. **Manual trigger:**
   ```bash
   gcloud builds submit --config=deployment/gcp/cloudbuild.yaml
   ```

## Monitoring and Logging

### Cloud Logging

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=hrms-backend" \
  --limit 50 \
  --format json

# Create log-based metrics
gcloud logging metrics create error_count \
  --description="Count of errors" \
  --log-filter='severity>=ERROR'
```

### Cloud Monitoring

```bash
# Create uptime check
gcloud monitoring uptime-checks create https://api.hrms.example.com/actuator/health
```

## Security

### Cloud Armor (DDoS Protection)

```bash
# Create security policy
gcloud compute security-policies create hrms-security-policy \
  --description "Security policy for HRMS"

# Add rate limiting rule
gcloud compute security-policies rules create 1000 \
  --security-policy hrms-security-policy \
  --expression "true" \
  --action "rate-based-ban" \
  --rate-limit-threshold-count 100 \
  --rate-limit-threshold-interval-sec 60
```

### Identity-Aware Proxy (IAP)

For internal applications, enable IAP:

```bash
gcloud iap web enable --resource-type=app-engine
```

## Scaling Configuration

### Cloud Run Auto-scaling

Cloud Run automatically scales based on:
- Request concurrency (default: 80 concurrent requests per instance)
- CPU and memory usage

Configure in deployment:
```bash
--min-instances=1 \
--max-instances=10 \
--concurrency=80
```

### GKE Horizontal Pod Autoscaling

Already configured in `deployment.yaml`:
- Backend: 3-10 replicas based on 70% CPU and 80% memory
- Frontend: 2-10 replicas based on 70% CPU and 80% memory

### GKE Cluster Autoscaling

```bash
gcloud container clusters update hrms-cluster \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10 \
  --region us-central1
```

## Cost Optimization

1. **Use committed use discounts** for predictable workloads
2. **Enable Cloud Run scale to zero** for non-production environments
3. **Use preemptible nodes** in GKE for non-critical workloads
4. **Set up budget alerts:**
   ```bash
   gcloud billing budgets create \
     --billing-account=BILLING_ACCOUNT_ID \
     --display-name="HRMS Platform Budget" \
     --budget-amount=1000
   ```

## Backup and Disaster Recovery

### Database Backups

```bash
# Manual backup
gcloud sql backups create --instance=hrms-postgres

# Restore from backup
gcloud sql backups restore BACKUP_ID --backup-instance=hrms-postgres
```

### Application State

```bash
# Export Kubernetes resources
kubectl get all -n hrms -o yaml > backup.yaml

# Backup secrets (encrypted)
kubectl get secrets -n hrms -o yaml > secrets-backup.yaml
```

## Troubleshooting

### View application logs

```bash
# Cloud Run
gcloud logging read "resource.type=cloud_run_revision" --limit 100

# GKE
kubectl logs -f deployment/hrms-backend -n hrms
kubectl logs -f deployment/hrms-frontend -n hrms
```

### Check pod status

```bash
kubectl get pods -n hrms
kubectl describe pod POD_NAME -n hrms
kubectl exec -it POD_NAME -n hrms -- /bin/sh
```

### Debug networking

```bash
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
# Inside the pod:
wget -O- http://hrms-backend-service.hrms.svc.cluster.local
```

## Environment Variables Reference

See `kubernetes/configmap.yaml` and `kubernetes/secrets.yaml` for the complete list of environment variables required by the application.

### Required Secrets:
- `SPRING_DATASOURCE_URL` - PostgreSQL connection string
- `SPRING_DATASOURCE_USERNAME` - Database username
- `SPRING_DATASOURCE_PASSWORD` - Database password
- `JWT_SECRET` - Secret key for JWT tokens (min 64 characters)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `MAIL_USERNAME` - Email service username
- `MAIL_PASSWORD` - Email service password

## Support

For issues and questions:
- Check application logs in Cloud Logging
- Review GKE pod events: `kubectl get events -n hrms`
- Check Cloud Build history: `gcloud builds list`

## License

Copyright (c) 2024 HRMS Platform Team

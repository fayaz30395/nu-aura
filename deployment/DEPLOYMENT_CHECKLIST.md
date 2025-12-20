# HRMS Platform - Production Deployment Checklist

Use this checklist to ensure a successful production deployment to Google Cloud Platform.

## Pre-Deployment Checklist

### 1. Code Preparation
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Version tagged in git

### 2. Configuration Files
- [ ] Environment variables configured in `.env.production`
- [ ] Database connection strings updated
- [ ] API endpoints configured correctly
- [ ] CORS settings configured
- [ ] SSL/TLS certificates ready

### 3. GCP Project Setup
- [ ] GCP project created
- [ ] Billing account linked
- [ ] Budget alerts configured
- [ ] IAM roles and permissions set
- [ ] Service accounts created
- [ ] APIs enabled (Cloud Build, Cloud Run/GKE, Secret Manager)

### 4. Database Setup
- [ ] Cloud SQL instance created
- [ ] Database created
- [ ] User credentials created
- [ ] Backup policy configured
- [ ] High availability configured (if needed)
- [ ] Connection security configured (SSL, private IP)
- [ ] Database migrations tested

### 5. Secrets Management
- [ ] All secrets identified
- [ ] Secrets stored in GCP Secret Manager
- [ ] Service accounts have access to secrets
- [ ] No secrets in source code
- [ ] No secrets in Docker images
- [ ] `.env` files in `.gitignore`

**Required Secrets:**
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `DB_USERNAME` - Database username
- [ ] `DB_PASSWORD` - Database password (strong, random)
- [ ] `JWT_SECRET` - JWT signing key (min 64 chars, random)
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- [ ] `OPENAI_API_KEY` - OpenAI API key
- [ ] `MAIL_USERNAME` - Email service username
- [ ] `MAIL_PASSWORD` - Email app password
- [ ] `MINIO_ACCESS_KEY` - Object storage access key (or use GCS)
- [ ] `MINIO_SECRET_KEY` - Object storage secret key (or use GCS)

### 6. Domain and DNS
- [ ] Domain name purchased
- [ ] DNS configured
- [ ] SSL certificates obtained/configured
- [ ] Subdomain for API configured (api.example.com)
- [ ] Subdomain for app configured (app.example.com)
- [ ] DNS propagation verified

### 7. Docker Images
- [ ] Backend Dockerfile tested locally
- [ ] Frontend Dockerfile tested locally
- [ ] Images optimized for size
- [ ] Multi-stage builds working
- [ ] Health checks configured
- [ ] Non-root user configured
- [ ] `.dockerignore` file in place

## Deployment Steps

### Cloud Run Deployment

#### Step 1: Build Images
- [ ] Navigate to project root
- [ ] Run build command:
  ```bash
  gcloud builds submit --config=platform/deployment/gcp/cloudbuild.yaml
  ```
- [ ] Verify images in Container Registry:
  ```bash
  gcloud container images list
  ```

#### Step 2: Deploy Backend
- [ ] Deploy backend service:
  ```bash
  gcloud run deploy hrms-backend \
    --image gcr.io/PROJECT_ID/hrms-backend:latest \
    --region us-central1 \
    --platform managed
  ```
- [ ] Verify deployment
- [ ] Test health endpoint: `/actuator/health`
- [ ] Check logs for errors

#### Step 3: Deploy Frontend
- [ ] Update `NEXT_PUBLIC_API_URL` with backend URL
- [ ] Deploy frontend service:
  ```bash
  gcloud run deploy hrms-frontend \
    --image gcr.io/PROJECT_ID/hrms-frontend:latest \
    --region us-central1 \
    --platform managed
  ```
- [ ] Verify deployment
- [ ] Test frontend loading

#### Step 4: Configure Custom Domain
- [ ] Map custom domain to Cloud Run services
- [ ] Verify SSL certificate provisioned
- [ ] Test HTTPS access

### GKE Deployment

#### Step 1: Create Cluster
- [ ] Create GKE cluster:
  ```bash
  gcloud container clusters create hrms-cluster \
    --region us-central1 \
    --num-nodes 1 \
    --machine-type n1-standard-2
  ```
- [ ] Get cluster credentials
- [ ] Verify kubectl access

#### Step 2: Setup Kubernetes
- [ ] Create namespace: `kubectl create namespace hrms`
- [ ] Update ConfigMaps with production values
- [ ] Create secrets (use External Secrets or manual)
- [ ] Update deployment.yaml with correct image names
- [ ] Update ingress.yaml with correct domain names

#### Step 3: Deploy to Kubernetes
- [ ] Apply ConfigMaps: `kubectl apply -f configmap.yaml`
- [ ] Apply Secrets: `kubectl apply -f secrets.yaml`
- [ ] Apply Deployments: `kubectl apply -f deployment.yaml`
- [ ] Apply Services: `kubectl apply -f service.yaml`
- [ ] Apply Ingress: `kubectl apply -f ingress.yaml`

#### Step 4: Verify Deployment
- [ ] Check pod status: `kubectl get pods -n hrms`
- [ ] Check services: `kubectl get services -n hrms`
- [ ] Check ingress: `kubectl get ingress -n hrms`
- [ ] View logs: `kubectl logs -f deployment/hrms-backend -n hrms`

## Post-Deployment Checklist

### 1. Verification
- [ ] Application is accessible via production URL
- [ ] Health checks are passing
- [ ] Database connectivity verified
- [ ] Authentication working (Google OAuth)
- [ ] Email notifications working
- [ ] File uploads working
- [ ] API responses are correct
- [ ] Frontend renders correctly
- [ ] Mobile responsiveness verified

### 2. Performance Testing
- [ ] Load testing completed
- [ ] Response times acceptable
- [ ] Auto-scaling tested
- [ ] Database performance verified
- [ ] CDN configured (if using)
- [ ] Caching working correctly

### 3. Security
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] DDoS protection enabled (Cloud Armor)
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection verified
- [ ] Sensitive data not logged
- [ ] Error messages don't expose internals

### 4. Monitoring and Alerts
- [ ] Cloud Logging configured
- [ ] Cloud Monitoring dashboards created
- [ ] Uptime checks configured
- [ ] Error rate alerts configured
- [ ] Performance alerts configured
- [ ] Budget alerts configured
- [ ] Slack/email notifications configured

**Key Metrics to Monitor:**
- [ ] Application response time
- [ ] Error rate
- [ ] Request count
- [ ] CPU usage
- [ ] Memory usage
- [ ] Database connections
- [ ] Database query performance
- [ ] Storage usage
- [ ] Network egress

### 5. Backup and Recovery
- [ ] Database automatic backups enabled
- [ ] Backup retention policy set
- [ ] Disaster recovery plan documented
- [ ] Backup restore tested
- [ ] Point-in-time recovery configured
- [ ] File storage backups configured

### 6. Documentation
- [ ] Production architecture documented
- [ ] Deployment process documented
- [ ] Rollback procedure documented
- [ ] Incident response plan created
- [ ] Runbook for common issues created
- [ ] Access credentials securely stored
- [ ] Team members trained

### 7. CI/CD Pipeline
- [ ] Cloud Build triggers configured
- [ ] Automated tests in pipeline
- [ ] Production deployment approval required
- [ ] Rollback procedure automated
- [ ] Build notifications configured

### 8. Compliance and Legal
- [ ] GDPR compliance verified (if applicable)
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Data retention policy configured
- [ ] Cookie consent implemented
- [ ] User data export/delete functionality working

## Production Maintenance

### Daily Tasks
- [ ] Review error logs
- [ ] Check monitoring dashboards
- [ ] Verify backup completion
- [ ] Review security alerts

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Check resource usage and costs
- [ ] Review user feedback
- [ ] Update dependencies (if needed)

### Monthly Tasks
- [ ] Review and optimize costs
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Capacity planning review
- [ ] Test disaster recovery

### Quarterly Tasks
- [ ] Major dependency updates
- [ ] Architecture review
- [ ] Security penetration testing
- [ ] Compliance audit

## Rollback Procedure

If something goes wrong:

1. **Cloud Run:**
   ```bash
   # Rollback to previous revision
   gcloud run services update-traffic hrms-backend --to-revisions=PREVIOUS_REVISION=100
   ```

2. **GKE:**
   ```bash
   # Rollback deployment
   kubectl rollout undo deployment/hrms-backend -n hrms
   ```

3. **Database:**
   ```bash
   # Restore from backup
   gcloud sql backups restore BACKUP_ID --backup-instance=hrms-postgres
   ```

## Emergency Contacts

- [ ] DevOps team contacts documented
- [ ] GCP support contact info saved
- [ ] On-call rotation schedule created
- [ ] Escalation procedure documented

## Final Sign-off

- [ ] Technical lead approval
- [ ] Product owner approval
- [ ] Security team approval
- [ ] Stakeholders notified
- [ ] Go-live date confirmed
- [ ] Communication plan executed

---

## Quick Reference Commands

### Logs
```bash
# Cloud Run
gcloud logging read "resource.type=cloud_run_revision" --limit 100

# GKE
kubectl logs -f deployment/hrms-backend -n hrms
```

### Scale
```bash
# Cloud Run
gcloud run services update hrms-backend --min-instances=2 --max-instances=20

# GKE
kubectl scale deployment hrms-backend --replicas=5 -n hrms
```

### Status
```bash
# Cloud Run
gcloud run services describe hrms-backend

# GKE
kubectl get all -n hrms
```

### Restart
```bash
# Cloud Run (deploy same revision)
gcloud run services update hrms-backend --region us-central1

# GKE
kubectl rollout restart deployment/hrms-backend -n hrms
```

---

**Date Deployed:** _______________

**Deployed By:** _______________

**Version:** _______________

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

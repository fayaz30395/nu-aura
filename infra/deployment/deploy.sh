#!/bin/bash

# HRMS Platform Deployment Script for GCP
# This script automates the deployment process for different GCP services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default values
DEPLOYMENT_TYPE=${DEPLOYMENT_TYPE:-"cloud-run"}
REGION=${REGION:-"us-central1"}
ENVIRONMENT=${ENVIRONMENT:-"production"}

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
    echo ""
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi

    # Check if kubectl is installed (for GKE deployments)
    if [ "$DEPLOYMENT_TYPE" = "gke" ]; then
        if ! command -v kubectl &> /dev/null; then
            print_error "kubectl is not installed. Please install it first."
            exit 1
        fi
    fi

    # Check if project is set
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        print_error "GCP project is not set. Run: gcloud config set project PROJECT_ID"
        exit 1
    fi

    print_info "Using GCP Project: $PROJECT_ID"
    print_info "Deployment Type: $DEPLOYMENT_TYPE"
    print_info "Region: $REGION"
    print_info "Environment: $ENVIRONMENT"
}

enable_apis() {
    print_header "Enabling Required GCP APIs"

    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable containerregistry.googleapis.com

    if [ "$DEPLOYMENT_TYPE" = "cloud-run" ]; then
        gcloud services enable run.googleapis.com
    elif [ "$DEPLOYMENT_TYPE" = "app-engine" ]; then
        gcloud services enable appengine.googleapis.com
    elif [ "$DEPLOYMENT_TYPE" = "gke" ]; then
        gcloud services enable container.googleapis.com
    fi

    gcloud services enable secretmanager.googleapis.com
    gcloud services enable sql-component.googleapis.com
    gcloud services enable sqladmin.googleapis.com

    print_info "APIs enabled successfully"
}

setup_secrets() {
    print_header "Setting Up Secrets in Secret Manager"

    # Check if secrets exist, if not, create placeholders
    SECRETS=(
        "DATABASE_URL:jdbc:postgresql://localhost:5432/hrms"
        "DB_USERNAME:hrms_user"
        "DB_PASSWORD:CHANGE_ME"
        "JWT_SECRET:CHANGE_ME_TO_LONG_RANDOM_STRING"
        "GOOGLE_CLIENT_ID:your-client-id.apps.googleusercontent.com"
        "GOOGLE_CLIENT_SECRET:CHANGE_ME"
        "OPENAI_API_KEY:sk-CHANGE_ME"
    )

    for secret_pair in "${SECRETS[@]}"; do
        IFS=':' read -r secret_name secret_value <<< "$secret_pair"

        if gcloud secrets describe "$secret_name" &> /dev/null; then
            print_info "Secret $secret_name already exists"
        else
            print_warn "Creating placeholder for secret: $secret_name"
            echo -n "$secret_value" | gcloud secrets create "$secret_name" --data-file=-
            print_warn "Please update secret $secret_name with the actual value!"
        fi
    done
}

build_images() {
    print_header "Building Docker Images"

    # Build backend
    print_info "Building backend image..."
    gcloud builds submit \
        --config="${SCRIPT_DIR}/gcp/cloudbuild.yaml" \
        --substitutions="_REGION=${REGION}" \
        "${PROJECT_ROOT}"

    print_info "Images built successfully"
}

deploy_cloud_run() {
    print_header "Deploying to Cloud Run"

    # Deploy backend
    print_info "Deploying backend service..."
    gcloud run deploy hrms-backend \
        --image "gcr.io/${PROJECT_ID}/hrms-backend:latest" \
        --platform managed \
        --region "${REGION}" \
        --allow-unauthenticated \
        --memory 2Gi \
        --cpu 2 \
        --timeout 300s \
        --max-instances 10 \
        --min-instances 1 \
        --port 8080 \
        --set-env-vars "SPRING_PROFILES_ACTIVE=prod,PORT=8080" \
        --set-secrets "SPRING_DATASOURCE_URL=DATABASE_URL:latest,SPRING_DATASOURCE_USERNAME=DB_USERNAME:latest,SPRING_DATASOURCE_PASSWORD=DB_PASSWORD:latest,JWT_SECRET=JWT_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest"

    BACKEND_URL=$(gcloud run services describe hrms-backend --region="${REGION}" --format='value(status.url)')
    print_info "Backend deployed at: $BACKEND_URL"

    # Deploy frontend
    print_info "Deploying frontend service..."
    gcloud run deploy hrms-frontend \
        --image "gcr.io/${PROJECT_ID}/hrms-frontend:latest" \
        --platform managed \
        --region "${REGION}" \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 1 \
        --timeout 60s \
        --max-instances 10 \
        --min-instances 0 \
        --port 3000 \
        --set-env-vars "NEXT_PUBLIC_API_URL=${BACKEND_URL},NODE_ENV=production"

    FRONTEND_URL=$(gcloud run services describe hrms-frontend --region="${REGION}" --format='value(status.url)')
    print_info "Frontend deployed at: $FRONTEND_URL"

    print_header "Deployment Complete!"
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: $FRONTEND_URL"
}

deploy_app_engine() {
    print_header "Deploying to App Engine"

    cd "${PROJECT_ROOT}/platform/hrms-backend"
    gcloud app deploy "${SCRIPT_DIR}/gcp/app.yaml" --quiet

    print_info "App Engine deployment complete"
}

deploy_gke() {
    print_header "Deploying to Google Kubernetes Engine"

    # Get cluster credentials
    gcloud container clusters get-credentials hrms-cluster --region="${REGION}"

    # Apply Kubernetes manifests
    print_info "Applying Kubernetes configurations..."

    kubectl apply -f "${SCRIPT_DIR}/kubernetes/configmap.yaml"
    kubectl apply -f "${SCRIPT_DIR}/kubernetes/secrets.yaml"
    kubectl apply -f "${SCRIPT_DIR}/kubernetes/deployment.yaml"
    kubectl apply -f "${SCRIPT_DIR}/kubernetes/service.yaml"
    kubectl apply -f "${SCRIPT_DIR}/kubernetes/ingress.yaml"

    print_info "Waiting for deployment to be ready..."
    kubectl rollout status deployment/hrms-backend -n hrms --timeout=5m
    kubectl rollout status deployment/hrms-frontend -n hrms --timeout=5m

    print_header "GKE Deployment Complete!"
    kubectl get services -n hrms
    kubectl get ingress -n hrms
}

cleanup() {
    print_header "Cleanup (if needed)"

    read -p "Do you want to delete all resources? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        if [ "$DEPLOYMENT_TYPE" = "cloud-run" ]; then
            gcloud run services delete hrms-backend --region="${REGION}" --quiet
            gcloud run services delete hrms-frontend --region="${REGION}" --quiet
        elif [ "$DEPLOYMENT_TYPE" = "gke" ]; then
            kubectl delete namespace hrms
        fi

        print_info "Resources deleted"
    fi
}

show_help() {
    cat << EOF
HRMS Platform Deployment Script

Usage: ./deploy.sh [OPTIONS]

Options:
    --type TYPE           Deployment type: cloud-run, app-engine, or gke (default: cloud-run)
    --region REGION       GCP region (default: us-central1)
    --env ENVIRONMENT     Environment: production, staging, or development (default: production)
    --build-only          Only build images, don't deploy
    --setup-secrets       Only setup secrets in Secret Manager
    --cleanup             Delete all deployed resources
    -h, --help            Show this help message

Examples:
    ./deploy.sh --type cloud-run --region us-central1
    ./deploy.sh --type gke --region us-east1 --env staging
    ./deploy.sh --build-only
    ./deploy.sh --setup-secrets
    ./deploy.sh --cleanup

EOF
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                DEPLOYMENT_TYPE="$2"
                shift 2
                ;;
            --region)
                REGION="$2"
                shift 2
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --build-only)
                BUILD_ONLY=true
                shift
                ;;
            --setup-secrets)
                SETUP_SECRETS_ONLY=true
                shift
                ;;
            --cleanup)
                cleanup
                exit 0
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    check_prerequisites

    if [ "$SETUP_SECRETS_ONLY" = true ]; then
        setup_secrets
        exit 0
    fi

    enable_apis
    setup_secrets

    if [ "$BUILD_ONLY" = true ]; then
        build_images
        exit 0
    fi

    build_images

    case $DEPLOYMENT_TYPE in
        cloud-run)
            deploy_cloud_run
            ;;
        app-engine)
            deploy_app_engine
            ;;
        gke)
            deploy_gke
            ;;
        *)
            print_error "Invalid deployment type: $DEPLOYMENT_TYPE"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

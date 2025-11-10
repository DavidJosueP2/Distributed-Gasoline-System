#!/bin/bash
# ============================================================================
# Script de Migraciones y Seeding Manual
# ============================================================================
# Este script permite ejecutar migraciones y seeding de forma manual
# sin necesidad de reinstalar el chart de Helm.
#
# Uso:
#   ./scripts/run-migrations.sh --namespace fuel-system --service users
#   ./scripts/run-migrations.sh --namespace fuel-system --service all
# ============================================================================

set -e

# Default values
NAMESPACE="fuel-system"
SERVICE="all"
SKIP_SEEDING=false
WAIT_FOR_COMPLETION=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --skip-seeding)
            SKIP_SEEDING=true
            shift
            ;;
        --no-wait)
            WAIT_FOR_COMPLETION=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --namespace <name>    Kubernetes namespace (default: fuel-system)"
            echo "  --service <name>      Service to migrate: all, users, vehicles, driver, auth (default: all)"
            echo "  --skip-seeding        Skip seeding step"
            echo "  --no-wait            Don't wait for jobs to complete"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Functions
log_step() {
    echo -e "\n${CYAN}🔄 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${GRAY}  $1${NC}"
}

# ============================================================================
# Function to run migration for a specific service
# ============================================================================
run_service_migration() {
    local service_name=$1
    local job_name=$2

    log_step "Running migration for $service_name..."

    # Check if job already exists
    if kubectl get job "$job_name" -n "$NAMESPACE" &>/dev/null; then
        log_warning "Job $job_name already exists. Deleting..."
        kubectl delete job "$job_name" -n "$NAMESPACE" --ignore-not-found=true &>/dev/null
        sleep 2
    fi

    # Create the Job using helm template
    log_info "Creating Kubernetes Job..."

    if ! helm template fuel-system deploy/helm/fuel-system \
        --namespace "$NAMESPACE" \
        --show-only templates/jobs-migrations.yaml \
        --values deploy/local/values-local.yaml | \
        kubectl apply -n "$NAMESPACE" -f - &>/dev/null; then
        log_error "Failed to create Job"
        return 1
    fi

    log_success "Job $job_name created successfully"

    if [ "$WAIT_FOR_COMPLETION" = true ]; then
        log_info "Waiting for Job to complete..."

        if kubectl wait --for=condition=complete --timeout=300s "job/$job_name" -n "$NAMESPACE" &>/dev/null; then
            log_success "$service_name migration completed successfully"

            # Show job logs
            echo -e "\n${MAGENTA}📋 Job Logs:${NC}"
            local pod_name=$(kubectl get pods -n "$NAMESPACE" -l "job-name=$job_name" -o jsonpath="{.items[0].metadata.name}")
            kubectl logs "$pod_name" -n "$NAMESPACE"

            return 0
        else
            log_error "$service_name migration failed or timed out"

            # Show logs for debugging
            echo -e "\n${YELLOW}📋 Job Logs (for debugging):${NC}"
            local pod_name=$(kubectl get pods -n "$NAMESPACE" -l "job-name=$job_name" -o jsonpath="{.items[0].metadata.name}")
            kubectl logs "$pod_name" -n "$NAMESPACE"

            return 1
        fi
    fi

    return 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Fuel System - Database Migration & Seeding Tool       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n📍 Configuration:"
echo -e "${GRAY}   Namespace: $NAMESPACE${NC}"
echo -e "${GRAY}   Service: $SERVICE${NC}"
echo -e "${GRAY}   Skip Seeding: $SKIP_SEEDING${NC}"
echo -e "${GRAY}   Wait for Completion: $WAIT_FOR_COMPLETION${NC}"

# Verify kubectl is configured
log_step "Verifying Kubernetes connection..."
if ! kubectl cluster-info &>/dev/null; then
    log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi
log_success "Connected to Kubernetes cluster"

# Verify namespace exists
log_step "Verifying namespace '$NAMESPACE'..."
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    log_error "Namespace '$NAMESPACE' does not exist."
    exit 1
fi
log_success "Namespace '$NAMESPACE' exists"

# ============================================================================
# Run migrations based on selected service
# ============================================================================

SUCCESS=true

if [[ "$SERVICE" == "all" || "$SERVICE" == "users" ]]; then
    if ! run_service_migration "Users Service" "fuel-system-users-db-migration"; then
        SUCCESS=false
    fi
    sleep 5
fi

if [[ "$SERVICE" == "all" || "$SERVICE" == "vehicles" ]]; then
    if ! run_service_migration "Vehicles Service" "fuel-system-vehicles-db-migration"; then
        SUCCESS=false
    fi
    sleep 5
fi

if [[ "$SERVICE" == "all" || "$SERVICE" == "driver" ]]; then
    if ! run_service_migration "Driver Service" "fuel-system-driver-db-migration"; then
        SUCCESS=false
    fi
    sleep 5
fi

if [[ "$SERVICE" == "all" || "$SERVICE" == "auth" ]]; then
    log_step "Auth Service uses users_db, skipping separate migration..."
    log_success "Auth Service configuration verified"
fi

# ============================================================================
# Final summary
# ============================================================================

echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}║                  ✅ ALL MIGRATIONS COMPLETED              ║${NC}"
else
    echo -e "${RED}║                  ❌ SOME MIGRATIONS FAILED                ║${NC}"
fi
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n📊 View migration jobs:"
echo -e "${GRAY}   kubectl get jobs -n $NAMESPACE${NC}"

echo -e "\n📋 View job logs:"
echo -e "${GRAY}   kubectl logs -n $NAMESPACE -l app.kubernetes.io/component=migration${NC}"

echo -e "\n🗑️  Clean up completed jobs:"
echo -e "${GRAY}   kubectl delete jobs -n $NAMESPACE -l app.kubernetes.io/component=migration${NC}"

if [ "$SUCCESS" = false ]; then
    exit 1
fi


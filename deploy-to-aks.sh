#!/bin/bash

# Deploy to Azure Kubernetes Service Script
# This script deploys the application to AKS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AKS_CLUSTER_NAME="${AKS_CLUSTER_NAME:-your-aks-cluster}"
RESOURCE_GROUP="${RESOURCE_GROUP:-your-resource-group}"
ACR_NAME="${ACR_NAME:-your-acr-name}"
NAMESPACE="${NAMESPACE:-default}"

echo -e "${GREEN}=== Azure Kubernetes Service Deployment ===${NC}"

# Check if required tools are installed
command -v az >/dev/null 2>&1 || { echo -e "${RED}Azure CLI is not installed${NC}"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl is not installed${NC}"; exit 1; }

# Login to Azure
echo -e "${YELLOW}Logging in to Azure...${NC}"
az login

# Get AKS credentials
echo -e "${YELLOW}Getting AKS credentials...${NC}"
az aks get-credentials --resource-group ${RESOURCE_GROUP} --name ${AKS_CLUSTER_NAME} --overwrite-existing

# Attach ACR to AKS (if not already attached)
echo -e "${YELLOW}Attaching ACR to AKS...${NC}"
az aks update -n ${AKS_CLUSTER_NAME} -g ${RESOURCE_GROUP} --attach-acr ${ACR_NAME} || true

# Create namespace if it doesn't exist
echo -e "${YELLOW}Creating namespace if needed...${NC}"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap
echo -e "${YELLOW}Applying ConfigMap...${NC}"
kubectl apply -f k8s/configmap.yaml -n ${NAMESPACE}

# Check if secrets exist
echo -e "${YELLOW}Checking secrets...${NC}"
if ! kubectl get secret financial-analysis-secrets -n ${NAMESPACE} >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Secret 'financial-analysis-secrets' not found!${NC}"
    echo -e "Please create the secret first:"
    echo -e "1. Copy k8s/secret.yaml.template to k8s/secret.yaml"
    echo -e "2. Fill in the values"
    echo -e "3. Run: kubectl apply -f k8s/secret.yaml -n ${NAMESPACE}"
    echo -e "\nOr use kubectl to create secrets:"
    echo -e "kubectl create secret generic financial-analysis-secrets \\"
    echo -e "  --from-literal=DATABASE_URL='postgresql://...' \\"
    echo -e "  --from-literal=AZURE_OPENAI_API_KEY='...' \\"
    echo -e "  --namespace=${NAMESPACE}"
    exit 1
fi

# Apply Deployment
echo -e "${YELLOW}Applying Deployment...${NC}"
kubectl apply -f k8s/deployment.yaml -n ${NAMESPACE}

# Apply Service
echo -e "${YELLOW}Applying Service...${NC}"
kubectl apply -f k8s/service.yaml -n ${NAMESPACE}

# Apply Ingress (if exists)
if [ -f k8s/ingress.yaml ]; then
    echo -e "${YELLOW}Applying Ingress...${NC}"
    kubectl apply -f k8s/ingress.yaml -n ${NAMESPACE}
fi

# Apply HPA (if exists)
if [ -f k8s/hpa.yaml ]; then
    echo -e "${YELLOW}Applying Horizontal Pod Autoscaler...${NC}"
    kubectl apply -f k8s/hpa.yaml -n ${NAMESPACE}
fi

# Wait for deployment to be ready
echo -e "${YELLOW}Waiting for deployment to be ready...${NC}"
kubectl rollout status deployment/financial-analysis-app -n ${NAMESPACE} --timeout=5m

# Get service details
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "\n${YELLOW}Service Information:${NC}"
kubectl get svc -n ${NAMESPACE}

echo -e "\n${YELLOW}Pod Status:${NC}"
kubectl get pods -n ${NAMESPACE} -l app=financial-analysis

echo -e "\n${YELLOW}Deployment Status:${NC}"
kubectl get deployment financial-analysis-app -n ${NAMESPACE}

# Get external IP (if LoadBalancer)
EXTERNAL_IP=$(kubectl get svc financial-analysis-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
if [ "$EXTERNAL_IP" != "pending" ] && [ -n "$EXTERNAL_IP" ]; then
    echo -e "\n${GREEN}✓ Application is accessible at: http://${EXTERNAL_IP}${NC}"
else
    echo -e "\n${YELLOW}Waiting for external IP to be assigned...${NC}"
    echo -e "Run: kubectl get svc financial-analysis-service -n ${NAMESPACE} -w"
fi

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo -e "View logs: kubectl logs -f deployment/financial-analysis-app -n ${NAMESPACE}"
echo -e "View pods: kubectl get pods -n ${NAMESPACE}"
echo -e "Describe pod: kubectl describe pod <pod-name> -n ${NAMESPACE}"
echo -e "Port forward: kubectl port-forward svc/financial-analysis-service 8080:80 -n ${NAMESPACE}"

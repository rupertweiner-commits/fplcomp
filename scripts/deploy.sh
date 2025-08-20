#!/bin/bash

# FPL Live Tracker Production Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="fpl-live-tracker"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"

echo -e "${BLUE}🚀 FPL Live Tracker Production Deployment${NC}"
echo "================================================"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install it and try again.${NC}"
    exit 1
fi

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env.production file not found. Creating from template...${NC}"
    cat > "$ENV_FILE" << EOF
# Production Environment Variables
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Database
POSTGRES_USER=fpl_user
POSTGRES_PASSWORD=$(openssl rand -base64 16)
DATABASE_TYPE=postgresql

# Redis
REDIS_PASSWORD=$(openssl rand -base64 16)

# Monitoring
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# VAPID Keys (for push notifications)
VAPID_PUBLIC_KEY=your-vapid-public-key-here
VAPID_PRIVATE_KEY=your-vapid-private-key-here
EOF
    echo -e "${GREEN}✅ Created .env.production file${NC}"
    echo -e "${YELLOW}⚠️  Please review and update the .env.production file with your actual values${NC}"
    read -p "Press Enter to continue after updating the file..."
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p data logs backups nginx/ssl monitoring

# Check SSL certificates
if [ ! -f "nginx/ssl/certificate.crt" ] || [ ! -f "nginx/ssl/private.key" ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found in nginx/ssl/ directory${NC}"
    echo -e "${BLUE}📝 You can either:${NC}"
    echo "   1. Place your SSL certificates in nginx/ssl/ directory"
    echo "   2. Use Let's Encrypt to generate certificates"
    echo "   3. Continue without SSL (not recommended for production)"
    
    read -p "Do you want to continue without SSL? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Continuing without SSL...${NC}"
        # Modify docker-compose to not use nginx
        sed -i.bak '/nginx:/,/networks:/d' docker-compose.yml
        sed -i.bak '/nginx_data:/d' docker-compose.yml
    else
        echo -e "${RED}❌ SSL certificates required for production deployment${NC}"
        exit 1
    fi
fi

# Build and start services
echo -e "${BLUE}🔨 Building and starting services...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
timeout=300
elapsed=0

while [ $elapsed -lt $timeout ]; do
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "healthy"; then
        echo -e "${GREEN}✅ All services are healthy!${NC}"
        break
    fi
    
    echo -n "."
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}❌ Timeout waiting for services to be healthy${NC}"
    echo -e "${BLUE}📊 Checking service status...${NC}"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    exit 1
fi

# Check application health
echo -e "${BLUE}🏥 Checking application health...${NC}"
sleep 10

if curl -f -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✅ Application is healthy!${NC}"
else
    echo -e "${RED}❌ Application health check failed${NC}"
    exit 1
fi

# Display deployment information
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "================================================"
echo -e "${BLUE}📱 Application URL:${NC} http://localhost:3000"
echo -e "${BLUE}🔗 API Endpoint:${NC} http://localhost:3000/api"
echo -e "${BLUE}📊 Health Check:${NC} http://localhost:3000/health"
echo -e "${BLUE}📈 Grafana:${NC} http://localhost:3001 (admin/admin)"
echo -e "${BLUE}📊 Prometheus:${NC} http://localhost:9090"
echo ""
echo -e "${BLUE}📋 Useful commands:${NC}"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo "  Update application: ./scripts/update.sh"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "  - Update your domain in .env.production"
echo "  - Configure your reverse proxy/load balancer"
echo "  - Set up monitoring alerts"
echo "  - Configure backup schedules"
echo "  - Set up SSL certificates if not already done"

# Optional: Open application in browser
read -p "Open application in browser? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open http://localhost:3000
    elif command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    else
        echo -e "${BLUE}🌐 Please open http://localhost:3000 in your browser${NC}"
    fi
fi

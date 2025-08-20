# 🚀 FPL Live Tracker - Production Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Manual Deployment](#manual-deployment)
4. [SSL Certificate Setup](#ssl-certificate-setup)
5. [Monitoring & Analytics](#monitoring--analytics)
6. [Backup & Recovery](#backup--recovery)
7. [Security Hardening](#security-hardening)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)

## 🎯 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 12+ / Windows 10+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB, Recommended 50GB+
- **CPU**: 2+ cores recommended

### Software Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (for local development)
- **Git**: Latest version

### Domain & SSL
- **Domain Name**: Registered domain for production
- **SSL Certificate**: Let's Encrypt (free) or commercial certificate
- **DNS Access**: Ability to configure A/CNAME records

## ⚡ Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd fpl-live-tracker
```

### 2. Run Deployment Script
```bash
./scripts/deploy.sh
```

The script will:
- ✅ Create production environment file
- ✅ Generate secure secrets
- ✅ Build and start all services
- ✅ Verify deployment health
- ✅ Open application in browser

### 3. Access Your Application
- **Main App**: https://yourdomain.com
- **Grafana**: https://yourdomain.com:3001 (admin/admin)
- **Prometheus**: https://yourdomain.com:9090

## 🔧 Manual Deployment

### Step 1: Environment Configuration

Create `.env.production` file:
```bash
# Production Environment Variables
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Security (Generate these securely)
JWT_SECRET=your-super-secure-32-character-secret-key-here
SESSION_SECRET=another-super-secure-session-secret-key
JWT_EXPIRES_IN=7d

# Database Configuration
DATABASE_TYPE=postgresql  # or 'sqlite'
DATABASE_URL=postgresql://username:password@localhost:5432/fpl_tracker
POSTGRES_USER=fpl_user
POSTGRES_PASSWORD=secure-password-here

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=secure-redis-password

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-new-relic-key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 2: SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/certificate.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/private.key
sudo cp /etc/letsencrypt/live/yourdomain.com/chain.pem nginx/ssl/ca_bundle.crt

# Set permissions
sudo chown -R $USER:$USER nginx/ssl/
chmod 600 nginx/ssl/*
```

#### Option B: Commercial Certificate
Place your SSL certificates in `nginx/ssl/`:
- `certificate.crt` - Your domain certificate
- `private.key` - Your private key
- `ca_bundle.crt` - CA bundle (if required)

### Step 3: Deploy with Docker Compose

```bash
# Create necessary directories
mkdir -p data logs backups nginx/ssl monitoring

# Build and start services
docker-compose -f docker-compose.yml up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Verify Deployment

```bash
# Health check
curl https://yourdomain.com/health

# API test
curl https://yourdomain.com/api/activity/types
```

## 🔒 SSL Certificate Setup

### Let's Encrypt Auto-Renewal

Create renewal script `scripts/renew-ssl.sh`:
```bash
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/certificate.crt
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/private.key
docker-compose restart nginx
```

Add to crontab:
```bash
# Renew SSL certificates monthly
0 0 1 * * /path/to/fpl-live-tracker/scripts/renew-ssl.sh
```

## 📊 Monitoring & Analytics

### Prometheus Configuration

Create `monitoring/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fpl-tracker'
    static_configs:
      - targets: ['fpl-tracker:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/nginx_status'
```

### Grafana Dashboards

Import these dashboard IDs:
- **Node.js Application**: 11159
- **Nginx**: 1113
- **PostgreSQL**: 9628
- **Redis**: 763

### Alerting Rules

Create `monitoring/alerts.yml`:
```yaml
groups:
  - name: fpl-tracker
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
```

## 💾 Backup & Recovery

### Automated Backups

Create `scripts/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d fpl_tracker > $BACKUP_DIR/db_$DATE.sql

# Application data backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /app/data

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### Recovery Process

```bash
# Restore database
psql -h localhost -U fpl_user -d fpl_tracker < backup_file.sql

# Restore application data
tar -xzf backup_file.tar.gz -C /app/
```

## 🛡️ Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# iptables (CentOS)
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -P INPUT DROP
```

### Security Headers

The application already includes:
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ X-XSS-Protection
- ✅ Content Security Policy
- ✅ Referrer Policy

### Rate Limiting

Configured in Nginx:
- API endpoints: 10 requests/second
- Login attempts: 5 requests/minute

## ⚡ Performance Optimization

### Nginx Optimization

```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

### Database Optimization

```sql
-- PostgreSQL
CREATE INDEX CONCURRENTLY idx_user_activity_timestamp ON user_activity(timestamp);
CREATE INDEX CONCURRENTLY idx_user_activity_user_id ON user_activity(user_id);

-- SQLite
CREATE INDEX idx_user_activity_timestamp ON user_activity(timestamp);
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
```

### Caching Strategy

- **Redis**: Session storage, API response caching
- **Browser**: Static assets (1 year), API responses (5 minutes)
- **CDN**: Consider Cloudflare for global distribution

## 🔍 Troubleshooting

### Common Issues

#### 1. SSL Certificate Errors
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/certificate.crt -text -noout

# Verify private key
openssl rsa -in nginx/ssl/private.key -check
```

#### 2. Database Connection Issues
```bash
# Test PostgreSQL connection
docker exec -it fpl-postgres psql -U fpl_user -d fpl_tracker

# Check Redis connection
docker exec -it fpl-redis redis-cli -a your_password ping
```

#### 3. Service Health Issues
```bash
# Check all service logs
docker-compose logs

# Check specific service
docker-compose logs fpl-tracker

# Restart services
docker-compose restart
```

### Performance Monitoring

```bash
# Check resource usage
docker stats

# Monitor logs in real-time
docker-compose logs -f --tail=100

# Check disk usage
df -h
du -sh data/ logs/ backups/
```

### Debug Mode

Enable debug logging:
```bash
# Set log level
export LOG_LEVEL=debug

# Restart services
docker-compose restart fpl-tracker
```

## 📈 Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.override.yml
services:
  fpl-tracker:
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
```

### Load Balancer

Consider using Traefik or HAProxy for advanced load balancing:
```yaml
# traefik.yml
version: '3.8'
services:
  traefik:
    image: traefik:v2.10
    command:
      - --api.dashboard=true
      - --providers.docker=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Domain DNS configured
- [ ] SSL certificates obtained
- [ ] Environment variables set
- [ ] Database credentials configured
- [ ] Firewall rules configured

### Deployment
- [ ] Docker images built
- [ ] Services started successfully
- [ ] Health checks passing
- [ ] SSL working correctly
- [ ] API endpoints accessible

### Post-Deployment
- [ ] Monitoring dashboards configured
- [ ] Alerting rules set up
- [ ] Backup schedule configured
- [ ] SSL auto-renewal working
- [ ] Performance baseline established

## 📞 Support

### Getting Help
1. **Check logs**: `docker-compose logs -f`
2. **Health endpoint**: `https://yourdomain.com/health`
3. **Documentation**: This guide and code comments
4. **Issues**: Create GitHub issue with logs and error details

### Maintenance Schedule
- **Daily**: Check application health
- **Weekly**: Review logs and performance metrics
- **Monthly**: SSL certificate renewal
- **Quarterly**: Security updates and dependency updates

---

**🎉 Congratulations!** Your FPL Live Tracker is now production-ready with enterprise-grade security, monitoring, and scalability features.


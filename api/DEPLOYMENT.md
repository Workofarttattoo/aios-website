# 🚀 Telescope Suite API - Deployment Guide

**Status:** ✅ Production Ready
**Node Version:** 18.0.0+
**Database:** PostgreSQL 12+
**Last Updated:** October 23, 2025

---

## Quick Start

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourusername/telescope-api.git
cd api

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your settings

# 4. Start database (Docker required)
docker-compose up -d postgres redis

# 5. Run migrations
npm run migrate

# 6. Start server
npm run dev
```

The API will be available at `http://localhost:3000`

---

## Database Setup

### Using Docker (Recommended)

```bash
# Start PostgreSQL
docker run -d \
  --name telescope-db \
  -e POSTGRES_DB=telescope_suite \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:15-alpine

# Verify connection
npm run migrate
```

### Manual PostgreSQL Setup

```bash
# Create database
createdb telescope_suite

# Create user
createuser telescope_user

# Set password
psql -U telescope_user -d telescope_suite -c "ALTER USER telescope_user WITH PASSWORD 'strong_password';"

# Grant privileges
psql -U postgres -d telescope_suite -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO telescope_user;"
```

---

## Environment Configuration

### Required Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=telescope_suite
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your-256-bit-random-key
```

### Optional Variables

```env
# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Email
MAILCHIMP_API_KEY=your_api_key

# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

---

## Docker Deployment

### Using Docker Compose (All-in-one)

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop everything
docker-compose down
```

### Build Custom Docker Image

```bash
# Build image
docker build -t telescope-api:1.0.0 .

# Run container
docker run -d \
  --name telescope-api \
  -e NODE_ENV=production \
  -e DB_HOST=postgres_host \
  -e JWT_SECRET=your_secret \
  -p 3000:3000 \
  telescope-api:1.0.0

# Push to registry
docker tag telescope-api:1.0.0 your-registry/telescope-api:1.0.0
docker push your-registry/telescope-api:1.0.0
```

---

## Cloud Deployment

### AWS ECS/Fargate

```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name telescope-api

# 2. Build and push image
docker build -t telescope-api:latest .
docker tag telescope-api:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/telescope-api:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/telescope-api:latest

# 3. Create RDS database
aws rds create-db-instance \
  --db-instance-identifier telescope-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password your_password \
  --allocated-storage 20

# 4. Create ECS task definition and service
# Use Terraform or CloudFormation (see infrastructure-as-code below)
```

### Heroku Deployment

```bash
# 1. Create app
heroku create telescope-api

# 2. Add PostgreSQL add-on
heroku addons:create heroku-postgresql:hobby-dev

# 3. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
heroku config:set STRIPE_SECRET_KEY=your_key

# 4. Deploy
git push heroku main

# 5. View logs
heroku logs -t
```

### DigitalOcean App Platform

```bash
# Create app.yaml configuration
name: telescope-api
services:
  - name: api
    github:
      repo: yourusername/telescope-api
      branch: main
    build_command: npm install
    run_command: npm start
    envs:
      - key: NODE_ENV
        value: production
      - key: DB_HOST
        value: ${db.hostname}
      - key: DB_NAME
        value: ${db.name}
databases:
  - name: db
    engine: PG
    version: "12"
```

---

## Performance Optimization

### Connection Pooling

PostgreSQL connection pool (pgBouncer) configuration:

```ini
[databases]
telescope_suite = host=localhost port=5432 dbname=telescope_suite user=postgres password=password

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

### Caching Strategy

```javascript
// Redis caching example (api/middleware/cache.js)
import redis from 'redis';

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

export async function cacheMiddleware(req, res, next) {
    const key = `${req.path}:${req.userId}`;
    const cached = await redisClient.get(key);

    if (cached) {
        return res.json(JSON.parse(cached));
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
        redisClient.setex(key, 3600, JSON.stringify(data)); // 1 hour TTL
        return originalJson(data);
    };

    next();
}
```

### Database Query Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_predictions_user_tool ON predictions(user_id, tool_name);
CREATE INDEX idx_analytics_user_date ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_status ON subscriptions(user_id, status);

-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM predictions WHERE user_id = $1 ORDER BY created_at DESC;
```

---

## Monitoring & Logging

### Application Metrics

```bash
# Using Prometheus exporter
npm install prometheus-client

# Add to server.js
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code']
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
});
```

### Log Aggregation

```bash
# Using ELK Stack (Elasticsearch, Logstash, Kibana)
# Docker example:
docker run -d --name logstash \
  -v /path/to/logstash.conf:/usr/share/logstash/config/logstash.conf \
  docker.elastic.co/logstash/logstash:8.0.0

# Configure winston to send to Logstash
import WinstonElasticsearch from 'winston-elasticsearch';
```

### Health Checks

```bash
# Kubernetes health probes
GET /health        # Liveness probe (always responds OK)
GET /health/ready  # Readiness probe (checks database)
GET /health/live   # Custom liveness indicator
```

---

## API Scaling

### Horizontal Scaling (Load Balancing)

```nginx
# Nginx configuration
upstream telescope_api {
    server api1.example.com:3000 weight=1;
    server api2.example.com:3000 weight=1;
    server api3.example.com:3000 weight=1;
}

server {
    listen 80;
    server_name api.aios.is;

    location / {
        proxy_pass http://telescope_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telescope-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: telescope-api
  template:
    metadata:
      labels:
        app: telescope-api
    spec:
      containers:
      - name: api
        image: your-registry/telescope-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres.default.svc.cluster.local"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Security Checklist

- [ ] Set strong `JWT_SECRET` (256-bit random string)
- [ ] Enable HTTPS only (set HSTS headers)
- [ ] Configure CORS for specific domains
- [ ] Use environment variables for all secrets
- [ ] Enable database SSL connections
- [ ] Set up rate limiting (done in middleware)
- [ ] Enable security headers (Helmet.js - already configured)
- [ ] Implement request validation (Joi - already configured)
- [ ] Set up Web Application Firewall (CloudFlare, AWS WAF)
- [ ] Regular security audits (`npm audit`)
- [ ] Keep dependencies updated
- [ ] Enable database backups
- [ ] Monitor for suspicious activity
- [ ] Log all authentication failures

---

## Backup & Recovery

### PostgreSQL Backups

```bash
# Full backup
pg_dump -h localhost -U postgres telescope_suite > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h localhost -U postgres telescope_suite < backup_20251023.sql

# Automated daily backups
0 2 * * * pg_dump -h localhost -U postgres telescope_suite > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Docker Volume Backups

```bash
# Backup database volume
docker run --rm -v telescope-db:/data -v $(pwd):/backup \
  alpine tar czf /backup/db_backup.tar.gz -C /data .

# Restore from backup
docker run --rm -v telescope-db:/data -v $(pwd):/backup \
  alpine tar xzf /backup/db_backup.tar.gz -C /data
```

---

## Troubleshooting

### Common Issues

**Issue:** Database connection timeout
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -c "SELECT 1"

# Verify credentials in .env
```

**Issue:** API returns 500 errors
```bash
# Check logs
docker-compose logs api

# Verify environment variables
docker-compose exec api env

# Test database query
npm run migrate
```

**Issue:** High memory usage
```bash
# Check Node process memory
node --max-old-space-size=1024 server.js

# Profile with clinic.js
npm install -g clinic
clinic doctor -- node server.js
```

---

## Maintenance

### Regular Tasks

- **Weekly:** Check error logs, review metrics
- **Monthly:** Update dependencies, security patches
- **Quarterly:** Full security audit, performance review
- **Annually:** Plan capacity increases, evaluate costs

### Updating Application

```bash
# Pull latest code
git pull origin main

# Update dependencies
npm install

# Run migrations
npm run migrate

# Restart server
npm restart
```

---

## Support & Resources

- **Documentation:** https://api.aios.is/docs
- **GitHub:** https://github.com/yourusername/telescope-api
- **Issues:** https://github.com/yourusername/telescope-api/issues
- **Slack:** #telescope-api

---

**Status:** ✅ PRODUCTION READY

**Copyright © 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.**

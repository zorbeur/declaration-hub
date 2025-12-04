# Declaration Hub API - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Database Migrations
```bash
cd API

# List all migrations
./utils.sh migrations

# Ensure all migrations are applied
./utils.sh migrate

# Verify no pending migrations
python manage.py showmigrations | grep "\[ \]"
```

### 2. Tests & Validation
```bash
# Run full test suite
./utils.sh test

# Run Django checks
./utils.sh check
```

### 3. Backup Database
```bash
# Before deployment
./utils.sh backup

# Verify backup exists
ls -lh db_backup_*.sqlite3 | tail -1
```

## Deployment Steps

### Option A: Production Server (Ubuntu/Debian)

#### 1. Environment Setup
```bash
# Install system dependencies
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3.12-dev
sudo apt install -y sqlite3 postgresql postgresql-contrib  # if switching to PostgreSQL
sudo apt install -y nginx gunicorn
sudo apt install -y supervisor  # for process management

# Create app user
sudo useradd -m -s /bin/bash declaration-hub

# Create app directory
sudo mkdir -p /opt/declaration-hub
sudo chown declaration-hub:declaration-hub /opt/declaration-hub
```

#### 2. Code Deployment
```bash
# As root or with sudo
cd /opt/declaration-hub

# Clone repo (adjust to your setup)
sudo -u declaration-hub git clone <your-repo-url> .

# Setup virtualenv
sudo -u declaration-hub python3.12 -m venv venv
sudo -u declaration-hub venv/bin/pip install --upgrade pip

# Install dependencies
cd API
sudo -u declaration-hub ../venv/bin/pip install -r requirements.txt
```

#### 3. Django Configuration
```bash
# Edit settings.py for production
sudo -u declaration-hub nano settings.py

# Key changes needed:
# - DEBUG = False
# - ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']
# - DATABASES: Consider PostgreSQL instead of SQLite
# - SECRET_KEY: Generate new strong key
# - STATIC_ROOT: Set to /opt/declaration-hub/static
# - MEDIA_ROOT: Set to /opt/declaration-hub/media

# Collect static files
sudo -u declaration-hub venv/bin/python manage.py collectstatic --noinput
```

#### 4. Gunicorn Setup
Create `/etc/systemd/system/declaration-hub.service`:
```ini
[Unit]
Description=Declaration Hub API
After=network.target

[Service]
Type=notify
User=declaration-hub
WorkingDirectory=/opt/declaration-hub/API
Environment="PATH=/opt/declaration-hub/venv/bin"
ExecStart=/opt/declaration-hub/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind unix:/opt/declaration-hub/gunicorn.sock \
    --timeout 30 \
    --access-logfile /var/log/declaration-hub/access.log \
    --error-logfile /var/log/declaration-hub/error.log \
    config.wsgi:application

# Auto-restart on failure
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo mkdir -p /var/log/declaration-hub
sudo chown declaration-hub:declaration-hub /var/log/declaration-hub
sudo systemctl daemon-reload
sudo systemctl enable declaration-hub
sudo systemctl start declaration-hub
sudo systemctl status declaration-hub
```

#### 5. Nginx Configuration
Create `/etc/nginx/sites-available/declaration-hub`:
```nginx
upstream declaration_hub {
    server unix:/opt/declaration-hub/gunicorn.sock fail_timeout=0;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    client_max_body_size 10M;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    client_max_body_size 10M;

    # SSL certificates (use Let's Encrypt + certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Static files
    location /static/ {
        alias /opt/declaration-hub/static/;
        expires 30d;
    }

    # Media files
    location /media/ {
        alias /opt/declaration-hub/media/;
        expires 7d;
    }

    # API
    location / {
        proxy_pass http://declaration_hub;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/declaration-hub /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

#### 6. SSL Certificate (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

#### 7. Scheduled Tasks (Cron)

Edit `sudo crontab -u declaration-hub -e`:
```bash
# Daily cleanup at 2 AM
0 2 * * * cd /opt/declaration-hub/API && /opt/declaration-hub/venv/bin/python manage.py cleanup_retention >> /var/log/declaration-hub/cleanup.log 2>&1

# Weekly health check
0 3 * * 0 cd /opt/declaration-hub/API && /opt/declaration-hub/venv/bin/python manage.py check >> /var/log/declaration-hub/health.log 2>&1

# Daily database backup
0 4 * * * cd /opt/declaration-hub && ./utils.sh backup && find . -name "db_backup_*.sqlite3" -mtime +30 -delete
```

#### 8. Monitoring & Logging
```bash
# Follow logs
sudo journalctl -u declaration-hub -f

# Check status
sudo systemctl status declaration-hub

# View access logs
tail -f /var/log/declaration-hub/access.log
tail -f /var/log/declaration-hub/error.log
```

### Option B: Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY API/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY API /app

# Create static directory
RUN mkdir -p /app/static /app/media

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn --bind 0.0.0.0:8000 config.wsgi:application"]
```

Build and run:
```bash
docker build -t declaration-hub-api .
docker run -d \
  --name declaration-hub-api \
  -p 8000:8000 \
  -v declaration_hub_db:/app/db \
  -v declaration_hub_static:/app/static \
  -e DEBUG=False \
  -e ALLOWED_HOSTS=your-domain.com \
  declaration-hub-api
```

### Option C: Heroku Deployment

Add `Procfile`:
```
web: cd API && gunicorn config.wsgi
release: python manage.py migrate
```

Add `runtime.txt`:
```
python-3.12.0
```

Deploy:
```bash
heroku create declaration-hub
heroku config:set DEBUG=False ALLOWED_HOSTS=your-domain.com
git push heroku main
heroku run python manage.py migrate
heroku run python manage.py createsuperuser
```

## Post-Deployment

### 1. Verify Health
```bash
# Check API endpoint
curl -I https://your-domain.com/api/
# Should return 401 Unauthorized (authentication required) or 200 OK

# Check admin panel
curl -I https://your-domain.com/admin/
# Should return 200 OK

# Check API docs
curl -I https://your-domain.com/api/docs/
# Should return 200 OK
```

### 2. Configure Settings
```bash
# SSH into production server
ssh declaration-hub@your-server

# Update admin email
python manage.py shell
>>> from django.contrib.auth.models import User
>>> u = User.objects.get(username='admin')
>>> u.email = 'admin@your-domain.com'
>>> u.save()
>>> exit()

# Set protection settings
>>> from core.models import ProtectionSettings
>>> ps = ProtectionSettings.objects.get_or_create()[0]
>>> ps.retention_days_pending = 30
>>> ps.retention_days_activity = 90
>>> ps.save()
```

### 3. Monitor Metrics
```bash
# Get JWT token
TOKEN=$(curl -X POST http://your-domain.com/api/token/ \
  -d "username=admin&password=..." | jq -r '.access')

# View metrics
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/admin/metrics/
```

### 4. Setup Alerts (Optional)
Consider integrating:
- **Sentry**: Error tracking and alerting
- **DataDog**: System monitoring and metrics
- **Uptimerobot**: Uptime monitoring
- **Mailgun**: Transactional emails

## Rollback Procedure

If issues occur:

```bash
# 1. Stop application
sudo systemctl stop declaration-hub

# 2. Restore database backup
cp db_backup_YYYYMMDD_HHMMSS.sqlite3 db.sqlite3

# 3. Revert code to previous version
git revert <commit-hash>

# 4. Start application
sudo systemctl start declaration-hub

# 5. Verify
sudo systemctl status declaration-hub
```

## Security Checklist

- [ ] Set `SECRET_KEY` to strong random value
- [ ] Set `DEBUG = False`
- [ ] Configure `ALLOWED_HOSTS` correctly
- [ ] Use HTTPS only
- [ ] Setup strong database password
- [ ] Configure CORS properly
- [ ] Setup API rate limiting
- [ ] Enable CSRF protection
- [ ] Use strong admin password
- [ ] Setup firewall rules
- [ ] Regular security patches
- [ ] Monitor logs for suspicious activity
- [ ] Setup automated backups
- [ ] Test disaster recovery

## Support

For issues, check:
- `/var/log/declaration-hub/` (application logs)
- `journalctl -u declaration-hub` (systemd logs)
- Django admin at `/admin/`
- API documentation at `/api/docs/`

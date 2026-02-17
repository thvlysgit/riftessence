# Raspberry Pi 5 Deployment Guide

## Requirements

- Raspberry Pi 5 (8GB recommended)
- 64-bit Raspberry Pi OS
- Static local IP for Pi
- Domain name
- Router with port forwarding

## Setup Steps

### 1. Install Docker on Raspberry Pi

```bash
# SSH into your Pi
ssh pi@raspberrypi.local

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Reboot
sudo reboot
```

### 2. Clone Repository

```bash
git clone <your-repo-url>
cd riftessence
```

### 3. Configure Environment

Create `.env` file:
```bash
DATABASE_URL=postgres://postgres:postgres@db:5432/riftessence
REDIS_URL=redis://redis:6379
JWT_SECRET=<generate-secure-secret>
RIOT_API_KEY=<your-riot-key>
PORT=3333
ALLOW_ORIGIN=true
```

### 4. Update Docker Compose for Production

Your existing `docker-compose.yml` already works! Just start it:

```bash
docker compose up -d
```

### 5. Setup Cloudflare Tunnel (Recommended)

**Why?** No port forwarding, free SSL, DDoS protection!

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create riftessence-api

# Configure tunnel
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
url: http://localhost:3333
tunnel: <tunnel-id-from-above>
credentials-file: /home/pi/.cloudflared/<tunnel-id>.json
EOF

# Route traffic
cloudflared tunnel route dns riftessence-api api.yourdomain.com

# Run as service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### 6. Alternative: Traditional Port Forwarding

If not using Cloudflare Tunnel:

1. **Get static local IP for Pi:**
   ```bash
   # Edit dhcpcd.conf
   sudo nano /etc/dhcpcd.conf
   
   # Add:
   interface eth0
   static ip_address=192.168.1.100/24
   static routers=192.168.1.1
   static domain_name_servers=8.8.8.8
   ```

2. **Setup DDNS (DuckDNS):**
   ```bash
   # Create DuckDNS update script
   echo url="https://www.duckdns.org/update?domains=yourdomain&token=your-token&ip=" | curl -k -o ~/duckdns/duck.log -K -
   
   # Add to crontab (update every 5 min)
   */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
   ```

3. **Configure router:**
   - Forward port 80 → Pi:80
   - Forward port 443 → Pi:443

4. **Setup Nginx + Let's Encrypt:**
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx -y
   
   # Create Nginx config
   sudo nano /etc/nginx/sites-available/riftessence
   
   # Add:
   server {
       listen 80;
       server_name yourdomain.duckdns.org;
       
       location / {
           proxy_pass http://localhost:3333;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   
   # Enable site
   sudo ln -s /etc/nginx/sites-available/riftessence /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d yourdomain.duckdns.org
   ```

### 7. Monitoring & Maintenance

**Auto-restart on failure:**
```bash
# Add to docker-compose.yml under each service:
restart: unless-stopped
```

**Backup script:**
```bash
#!/bin/bash
# backup.sh
docker exec riftessence-db-1 pg_dump -U postgres riftessence > backup_$(date +%Y%m%d).sql
# Upload to cloud storage
rclone copy backup_*.sql remote:backups/
```

**Add to crontab:**
```bash
0 2 * * * /home/pi/backup.sh
```

**Monitor resources:**
```bash
# Install monitoring
docker run -d \
  --name=grafana \
  -p 3001:3000 \
  grafana/grafana
```

### 8. Security Hardening

```bash
# Setup UFW firewall
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable password auth for SSH (use keys)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Setup fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

## Performance Optimization

### 1. Use NVMe instead of microSD
- 10x faster database operations
- More reliable

### 2. Optimize PostgreSQL
```sql
-- In postgresql.conf
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10485kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### 3. Enable Redis persistence
```bash
# In docker-compose.yml, add to redis service:
command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
volumes:
  - redis-data:/data
```

## Troubleshooting

**Check container status:**
```bash
docker ps
docker logs riftessence-api-1
```

**Check resource usage:**
```bash
docker stats
```

**Restart services:**
```bash
docker compose restart
```

**Database backup/restore:**
```bash
# Backup
docker exec riftessence-db-1 pg_dump -U postgres riftessence > backup.sql

# Restore
cat backup.sql | docker exec -i riftessence-db-1 psql -U postgres riftessence
```

## Pros vs Cons Summary

### ✅ Pros:
- Unlimited database storage
- 16x more RAM than Heroku Basic
- 4x CPU cores
- Full control
- $0/month operating cost
- Great for learning

### ❌ Cons:
- Your home internet exposed
- Dynamic IP (need DDNS)
- No redundancy
- Manual maintenance
- Slower for remote users
- Security responsibility
- Power/internet outages = downtime

## Recommendation

**Best approach:** Use Pi for development, Heroku for production

OR

**If you must self-host:** Use Cloudflare Tunnel (free) - it solves:
- Dynamic IP problem
- SSL certificates
- DDoS protection
- No port forwarding
- Better security

#!/bin/bash
# VPS Deployment Script for FourMore
# Run this script on your VPS to deploy the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="fourmore"
APP_DIR="/opt/fourmore"
BACKUP_DIR="/opt/fourmore-backups"
COMPOSE_FILE="docker-compose.prod.yml"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

echo -e "${BLUE}🚀 FourMore VPS Deployment Script${NC}"
echo "======================================"

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ This script must be run as root${NC}"
        echo "Please run: sudo $0"
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing system dependencies...${NC}"

    # Update package list
    apt-get update

    # Install required packages
    apt-get install -y \
        docker.io \
        docker-compose \
        nginx \
        certbot \
        python3-certbot-nginx \
        curl \
        git \
        unzip \
        htop \
        ufw

    # Start and enable services
    systemctl start docker
    systemctl enable docker
    systemctl start nginx
    systemctl enable nginx

    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to setup firewall
setup_firewall() {
    echo -e "${YELLOW}🔒 Setting up firewall...${NC}"

    # Reset UFW to defaults
    ufw --force reset

    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH (adjust port if needed)
    ufw allow ssh

    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Enable firewall
    ufw --force enable

    echo -e "${GREEN}✅ Firewall configured${NC}"
}

# Function to create application directory
setup_app_directory() {
    echo -e "${YELLOW}📁 Setting up application directory...${NC}"

    # Create app directory
    mkdir -p $APP_DIR
    mkdir -p $BACKUP_DIR

    # Set permissions
    chown -R $SUDO_USER:$SUDO_USER $APP_DIR
    chown -R $SUDO_USER:$SUDO_USER $BACKUP_DIR

    echo -e "${GREEN}✅ Application directory created at $APP_DIR${NC}"
}

# Function to prompt for configuration
get_configuration() {
    echo -e "${YELLOW}⚙️  Configuration Setup${NC}"
    echo "Please provide the following information:"

    # Domain name
    read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN_NAME
    if [[ -z "$DOMAIN_NAME" ]]; then
        echo -e "${RED}❌ Domain name is required${NC}"
        exit 1
    fi

    # Database password
    read -s -p "Enter a strong password for the database: " DB_PASSWORD
    echo
    if [[ -z "$DB_PASSWORD" ]]; then
        echo -e "${RED}❌ Database password is required${NC}"
        exit 1
    fi

    # JWT secret
    read -s -p "Enter a JWT secret key (or press Enter to generate): " JWT_SECRET
    echo
    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(openssl rand -hex 32)
        echo -e "${GREEN}✅ Generated JWT secret${NC}"
    fi

    # Email for Let's Encrypt
    read -p "Enter your email for SSL certificate notifications: " SSL_EMAIL
    if [[ -z "$SSL_EMAIL" ]]; then
        echo -e "${RED}❌ Email is required for SSL certificates${NC}"
        exit 1
    fi
}

# Function to create production docker-compose file
create_docker_compose() {
    echo -e "${YELLOW}🐳 Creating production Docker Compose configuration...${NC}"

    cat > $APP_DIR/$COMPOSE_FILE << EOF
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.4
    restart: unless-stopped
    environment:
      POSTGRES_DB: fourmore
      POSTGRES_USER: fourmore
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - fourmore-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fourmore -d fourmore"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - fourmore-network
    command: redis-server --appendonly yes

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://fourmore:${DB_PASSWORD}@postgres:5432/fourmore
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ENVIRONMENT=production
      - ALLOWED_ORIGINS=https://${DOMAIN_NAME}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - fourmore-network
    volumes:
      - ./data:/app/data

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - fourmore-network
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro

volumes:
  postgres_data:
  redis_data:

networks:
  fourmore-network:
    driver: bridge
EOF

    echo -e "${GREEN}✅ Docker Compose configuration created${NC}"
}

# Function to create nginx configuration
create_nginx_config() {
    echo -e "${YELLOW}🌐 Creating Nginx configuration...${NC}"

    mkdir -p $APP_DIR/nginx

    cat > $APP_DIR/nginx/nginx.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN_NAME};

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /usr/share/nginx/html;
    index index.html;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
EOF

    echo -e "${GREEN}✅ Nginx configuration created${NC}"
}

# Function to setup SSL certificate
setup_ssl() {
    echo -e "${YELLOW}🔐 Setting up SSL certificate...${NC}"

    # Stop nginx temporarily
    systemctl stop nginx

    # Get SSL certificate
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email $SSL_EMAIL \
        -d $DOMAIN_NAME

    # Start nginx
    systemctl start nginx

    # Setup auto-renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx" | crontab -

    echo -e "${GREEN}✅ SSL certificate configured${NC}"
}

# Function to deploy application
deploy_application() {
    echo -e "${YELLOW}🚀 Deploying application...${NC}"

    cd $APP_DIR

    # Pull latest images and build
    docker-compose -f $COMPOSE_FILE pull
    docker-compose -f $COMPOSE_FILE build --no-cache

    # Start services
    docker-compose -f $COMPOSE_FILE up -d

    echo -e "${GREEN}✅ Application deployed${NC}"
}

# Function to populate database with Utah data
populate_database() {
    echo -e "${YELLOW}🗺️  Populating database with Utah data...${NC}"

    cd $APP_DIR

    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 30

    # Set environment variable to trigger Utah data population
    echo "POPULATE_UTAH_DATA=true" >> .env

    # Restart backend to trigger migration with data population
    echo "Restarting backend to populate Utah data..."
    docker-compose -f $COMPOSE_FILE restart backend

    # Wait for population to complete
    echo "Waiting for Utah data processing to complete..."
    sleep 60

    # Check if data was loaded successfully
    docker-compose -f $COMPOSE_FILE exec -T postgres psql -U fourmore -d fourmore -c "SELECT COUNT(*) as poi_count FROM pois;"

    echo -e "${GREEN}✅ Database populated with Utah data${NC}"
}

# Function to create management scripts
create_management_scripts() {
    echo -e "${YELLOW}📝 Creating management scripts...${NC}"

    # Backup script
    cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/fourmore-backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U fourmore fourmore > $BACKUP_DIR/fourmore_$DATE.sql
echo "Backup created: $BACKUP_DIR/fourmore_$DATE.sql"
EOF

    # Update script
    cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
cd /opt/fourmore
git pull
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
echo "Application updated and restarted"
EOF

    # Status script
    cat > $APP_DIR/status.sh << 'EOF'
#!/bin/bash
cd /opt/fourmore
echo "=== Service Status ==="
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "=== System Resources ==="
docker stats --no-stream
EOF

    chmod +x $APP_DIR/*.sh

    echo -e "${GREEN}✅ Management scripts created${NC}"
}

# Function to show completion message
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo "======================================"
    echo -e "Your FourMore application is now running at: ${BLUE}https://$DOMAIN_NAME${NC}"
    echo ""
    echo "Management commands:"
    echo "  • Check status: $APP_DIR/status.sh"
    echo "  • Create backup: $APP_DIR/backup.sh"
    echo "  • Update app: $APP_DIR/update.sh"
    echo ""
    echo "Application files: $APP_DIR"
    echo "Backups: $BACKUP_DIR"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Point your domain DNS to this server's IP"
    echo "2. Test the application at https://$DOMAIN_NAME"
    echo "3. Set up monitoring and log management"
    echo "4. Configure regular backups"
}

# Main deployment function
main() {
    echo -e "${BLUE}Starting VPS deployment...${NC}"

    check_root
    get_configuration
    install_dependencies
    setup_firewall
    setup_app_directory
    create_docker_compose
    create_nginx_config
    setup_ssl
    deploy_application
    populate_database
    create_management_scripts
    show_completion
}

# Run main function
main "$@"
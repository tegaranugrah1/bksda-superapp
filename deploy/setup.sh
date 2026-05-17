#!/bin/bash
# BKSDA SuperApp - Production Setup Script
# Run on EC2 instance after cloning repo

set -e

echo "=== BKSDA SuperApp Production Setup ==="

# Generate APP_KEY if not exists
if [ ! -f .env.prod ]; then
    echo "Creating .env.prod..."
    cat > .env.prod << 'EOF'
APP_KEY=base64:$(openssl rand -base64 32)
DB_PASSWORD=BksdaProd2026!
RUSTFS_USER=bksda_admin
RUSTFS_PASSWORD=BksdaStorage2026!
EOF
    echo "⚠️  Edit .env.prod and set a proper APP_KEY!"
fi

# Create SSL directory
mkdir -p deploy/ssl

# Build and start services
echo "Building containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod build

echo "Starting services..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Wait for DB
echo "Waiting for database..."
sleep 10

# Run migrations
echo "Running migrations..."
docker-compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# Setup storage bucket
echo "Setting up storage..."
docker-compose -f docker-compose.prod.yml exec backend php artisan storage:setup

# Cache config
echo "Caching config..."
docker-compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker-compose -f docker-compose.prod.yml exec backend php artisan route:cache

echo ""
echo "=== Setup Complete ==="
echo "Frontend: http://bksdakaltim.net"
echo "API:      http://api.bksdakaltim.net"
echo "Storage:  http://storage.bksdakaltim.net"
echo ""
echo "Next: Setup SSL with certbot:"
echo "  docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot -d bksdakaltim.net -d www.bksdakaltim.net -d api.bksdakaltim.net -d storage.bksdakaltim.net"

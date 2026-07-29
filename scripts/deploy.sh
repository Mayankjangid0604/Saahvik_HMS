#!/bin/bash
set -e

# Default variables
EC2_HOST="${EC2_HOST:-ubuntu@43.205.218.39}"
EC2_KEY="${EC2_KEY:-C:\Users\mayan\.ssh\saahvik.pem}"

echo "=== 1. Building Docker image locally ==="
docker build -t saahvik-api ./backend

echo "=== 2. Exporting and transferring to EC2 ==="
docker save saahvik-api | gzip | ssh -i "$EC2_KEY" "$EC2_HOST" 'docker load'

echo "=== 3. Running migrations and swapping container on EC2 ==="
ssh -i "$EC2_KEY" "$EC2_HOST" << 'EOF'
  cd /opt/saahvik
  echo "--- Running Prisma migrations ---"
  docker run --rm --env-file .env saahvik-api npx prisma migrate deploy
  
  echo "--- Stopping and removing old container ---"
  docker stop saahvik-api 2>/dev/null || true
  docker rm saahvik-api 2>/dev/null || true
  
  echo "--- Starting new container ---"
  docker run -d --name saahvik-api \
    --env-file /opt/saahvik/.env \
    -p 127.0.0.1:3000:3000 \
    -v /opt/saahvik/uploads:/app/uploads \
    --restart unless-stopped \
    saahvik-api
    
  echo "--- Waiting for health check ---"
  sleep 3
  curl -sf http://localhost:3000/api/v1/health || echo 'HEALTH CHECK FAILED'
  echo "=== Deployment Complete ==="
EOF

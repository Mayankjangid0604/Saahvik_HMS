#!/bin/bash
set -e

echo "=== Updating package list ==="
sudo apt-get update

echo "=== Installing dependencies (curl, gnupg, lsb-release, rsync, nginx) ==="
sudo apt-get install -y ca-certificates curl gnupg lsb-release rsync nginx

echo "=== Setting up Docker repository ==="
sudo mkdir -p /etc/apt/keyrings
# Remove existing key if it exists to avoid prompts
sudo rm -f /etc/apt/keyrings/docker.gpg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "=== Installing Docker ==="
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "=== Adding ubuntu user to docker group ==="
sudo usermod -aG docker ubuntu

echo "=== Creating /opt/saahvik directory structure ==="
sudo mkdir -p /opt/saahvik
sudo mkdir -p /opt/saahvik/frontend
sudo mkdir -p /opt/saahvik/uploads

echo "=== Configuring permissions for /opt/saahvik ==="
sudo chown -R ubuntu:ubuntu /opt/saahvik
sudo chmod 755 /opt/saahvik

echo "=== Setup complete ==="

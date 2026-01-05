---
description: How to deploy the frontend application to a server
---

# Deploy Frontend Application

This guide covers two main methods for deploying the frontend: using Docker (recommended) or manual Nginx setup.

## Method 1: Docker Deployment (Recommended)

Thinking "Container" makes deployment consistent across environments.

1. **Build the Docker Image**
   Run this command in the `frontend` directory:
   ```bash
   docker build -t power-economics-frontend .
   ```

2. **Run the Container**
   ```bash
   docker run -d -p 8080:80 --name pe-frontend power-economics-frontend
   ```
   Now the app will be accessible at `http://your-server-ip:8080`.

## Method 2: Manual Nginx Deployment

If you already have an Nginx server running.

1. **Build the Project**
   Run this locally to generate the static files:
   ```bash
   cd frontend
   npm run build
   ```
   This will create a `dist` folder.

2. **Transfer Files to Server**
   Use `scp` or an FTP client to upload the `dist` folder to your server (e.g., `/var/www/power-economics`).
   ```bash
   scp -r dist/* user@your-server:/var/www/power-economics
   ```

3. **Configure Nginx**
   Use the provided `nginx.conf` as a reference. Key configuration for SPA (Single Page Apps):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/power-economics;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```
   Reload Nginx: `sudo nginx -s reload`.

## Files Created
- `frontend/Dockerfile`: Multi-stage build script.
- `frontend/nginx.conf`: Production-ready Nginx configuration.

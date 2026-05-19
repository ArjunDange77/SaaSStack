#!/bin/sh
# Azure App Service: stock nginx image serves /usr/share/nginx/html by default.
# Zip deploy lands in /home/site/wwwroot — reconfigure nginx to serve the SPA.
set -e
cat >/etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    listen [::]:80;
    root /home/site/wwwroot;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
exec nginx -g 'daemon off;'

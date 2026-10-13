#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/resqdeploy/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

for file in \
  /home/ssm-user/ResQDeploy/backend/server-mysql.js \
  /home/ssm-user/ResQDeploy/backend/mysqlDatabase.js \
  /home/ssm-user/ResQDeploy/backend/package.json \
  /home/ssm-user/ResQDeploy/backend/package-lock.json \
  /var/www/resqdeploy/index.html \
  /var/www/resqdeploy/script.js \
  /var/www/resqdeploy/style.css
do
  if [ -f "$file" ]; then
    cp -p "$file" "$BACKUP_DIR/"
  fi
done

echo "Previous release backup created."

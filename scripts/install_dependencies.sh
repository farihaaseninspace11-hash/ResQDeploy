#!/bin/bash
set -euo pipefail

cd /home/ssm-user/ResQDeploy/backend
npm ci --omit=dev

chown -R ssm-user:ssm-user /home/ssm-user/ResQDeploy/backend
chown -R root:root /var/www/resqdeploy

echo "Production dependencies installed."

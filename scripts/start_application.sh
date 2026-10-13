#!/bin/bash
set -euo pipefail

systemctl daemon-reload
systemctl restart resqdeploy
systemctl reload nginx

echo "ResQDeploy services restarted."

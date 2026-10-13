#!/bin/bash
set -euo pipefail

for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:5000/api/health \
      | grep -q '"status":"healthy"'; then
    break
  fi

  if [ "$attempt" -eq 20 ]; then
    echo "Backend health check failed."
    exit 1
  fi

  sleep 3
done

curl -fsS http://127.0.0.1:5000/api/incidents >/dev/null
curl -fsS http://127.0.0.1:5000/api/resources >/dev/null
curl -fsS http://127.0.0.1:5000/api/teams >/dev/null
curl -fsS http://127.0.0.1:5000/api/dashboard >/dev/null
curl -fsS http://127.0.0.1/ >/dev/null

echo "ResQDeploy deployment validation successful."

#!/bin/bash
# ============================================================
# FlowHub Dashboard — Deploy to Firebase Hosting
# Firebase project: calm-acre-465417-i8
# Hosting site: flowhub-dashboard
# ============================================================
#
# FIRST TIME SETUP (run once):
#   firebase hosting:sites:create flowhub-dashboard \
#     --project calm-acre-465417-i8
#
# Usage:
#   ./deploy.sh "commit message here"
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

MSG="${1:-deploy}"

echo "[FlowHub] Building dashboard..."
npm run build

echo "[FlowHub] Deploying to Firebase Hosting..."
firebase deploy --only hosting:flowhub-dashboard \
  --project calm-acre-465417-i8

echo "[FlowHub] Deploy complete."
echo "  https://flowhub-dashboard.web.app"

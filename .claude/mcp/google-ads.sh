#!/bin/bash
# Starts Google's official Google Ads MCP server (read-only reporting).
# https://github.com/googleads/google-ads-mcp
#
# Reads these environment variables (set them in the cloud environment settings, never in the repo):
#   GOOGLE_ADS_DEVELOPER_TOKEN    - Google Ads API developer token (from API Center)
#   GOOGLE_PROJECT_ID             - Google Cloud project ID with the Google Ads API enabled
#   GOOGLE_ADS_CREDENTIALS_JSON   - full contents of the Application Default Credentials JSON
#                                   (from `gcloud auth application-default login --scopes ...adwords...`)
#   GOOGLE_ADS_LOGIN_CUSTOMER_ID  - optional, manager (MCC) account ID, digits only
set -euo pipefail

if [ -n "${GOOGLE_ADS_CREDENTIALS_JSON:-}" ]; then
  CRED_DIR="$HOME/.config/google-ads-mcp"
  mkdir -p "$CRED_DIR"
  umask 077
  printf '%s' "$GOOGLE_ADS_CREDENTIALS_JSON" > "$CRED_DIR/adc.json"
  export GOOGLE_APPLICATION_CREDENTIALS="$CRED_DIR/adc.json"
fi

export PATH="$HOME/.local/bin:$PATH"
if ! command -v uvx >/dev/null 2>&1; then
  pip install -q uv >&2
fi

exec uvx --from "git+https://github.com/googleads/google-ads-mcp.git" google-ads-mcp

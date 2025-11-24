#!/bin/bash

# Git push proxy auto-switch hook helper.
# Tries current proxy first; if unavailable, switches to whichever
# predefined proxy responds, otherwise clears proxy for direct connection.

set -euo pipefail

PROXY_LOCAL="http://127.0.0.1:7890"
PROXY_ROUTER="http://127.0.0.1:7893"

check_proxy() {
  local proxy=$1
  if curl -s --connect-timeout 2 --max-time 3 --proxy "$proxy" "https://api.github.com" >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

CURRENT_PROXY=$(git config --global --get http.proxy 2>/dev/null || true)

if [ -n "${CURRENT_PROXY}" ] && check_proxy "${CURRENT_PROXY}"; then
  exit 0
fi

if check_proxy "${PROXY_LOCAL}"; then
  git config --global http.proxy "${PROXY_LOCAL}"
  git config --global https.proxy "${PROXY_LOCAL}"
  echo "🔄 自动切换到本机 Clash 代理 (7890)"
  exit 0
elif check_proxy "${PROXY_ROUTER}"; then
  git config --global http.proxy "${PROXY_ROUTER}"
  git config --global https.proxy "${PROXY_ROUTER}"
  echo "🔄 自动切换到软路由 OpenClash 代理 (7893)"
  exit 0
else
  if [ -n "${CURRENT_PROXY}" ]; then
    git config --global --unset http.proxy 2>/dev/null || true
    git config --global --unset https.proxy 2>/dev/null || true
    echo "⚠️  所有代理不可用，已清除代理配置，尝试直连"
  fi
  exit 0
fi


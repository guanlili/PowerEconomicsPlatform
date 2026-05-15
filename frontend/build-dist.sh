#!/usr/bin/env bash
# 在挂载式容器里构建前端 dist
# 用途：绕过 rolldown-vite 在 docker build 阶段的 bundleConfigFile bug
# 用法：
#   cd frontend && ./build-dist.sh
# 或在项目根目录：
#   bash frontend/build-dist.sh
set -euo pipefail

# 切到脚本所在目录（即 frontend）
cd "$(dirname "$0")"

echo ">>> 在挂载式 node:22-slim 容器中构建 dist"
docker run --rm \
  -v "$(pwd):/app" \
  -w /app \
  node:22-slim \
  bash -c '
    set -e
    npm config set registry https://registry.npmmirror.com
    npm install --no-audit --no-fund --include=optional
    npm run build
  '

echo ">>> dist 构建完成："
ls -la dist | head -10

echo ""
echo ">>> 接下来执行（在项目根目录）："
echo "    docker compose up -d --build frontend"

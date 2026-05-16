# Frontend Dockerfile - 仅打包预先构建好的 dist 到 nginx
#
# 构建流程（在 docker compose up 之前需要先 build dist）：
#   方式 1：使用脚本（推荐）
#     ./frontend/build-dist.sh
#
#   方式 2：手动一行命令（在 frontend/ 目录下执行）
#     docker run --rm -v $(pwd):/app -w /app node:22-slim bash -c "\
#       npm config set registry https://registry.npmmirror.com && \
#       npm install --no-audit --no-fund && \
#       npm run build"

FROM nginx:alpine

# 复制已构建好的静态资源（要求 frontend/dist 已存在）
COPY dist /usr/share/nginx/html

# Nginx 配置（含 /keti1/ 子路径 alias、/api/ 反代到 backend、/ → /keti1/ 跳转）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

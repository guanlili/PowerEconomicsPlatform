# Build stage
# 注意 1：BuildKit 内置 frontend 已支持 RUN --mount=type=cache，无需 # syntax 指令
#         加上 # syntax 反而会触发 BuildKit 联网拉解析器镜像，离线/弱网环境会失败
# 注意 2：使用 node:22-slim（Debian glibc）而非 node:22-alpine（musl）
#         本项目依赖 rolldown-vite，需要平台特定的 native binary
#         alpine 的 musl libc 在 npm ci 时容易丢失对应 binding，导致 vite build 失败
FROM node:22-slim AS build-stage

WORKDIR /app

# 使用国内 npm 镜像，加速依赖下载
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./

# 注意：不使用 BuildKit cache mount（以及 npm ci），原因：
#   1. cache mount 可能在多次构建间产生污染，与 --prefer-offline 叠加后出现 native binding 丢失
#   2. npm ci 严格按 lock 文件，跨平台使用时不重新选取 optional binding
#   3. 实测：诊断脚本里不加 cache mount 的 npm install 一发即中
RUN npm install --no-audit --no-fund --include=optional \
    && echo "===== rolldown bindings =====" \
    && ls node_modules/@rolldown/ \
    && node -e "require('rolldown'); console.log('✅ rolldown loaded OK')"

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

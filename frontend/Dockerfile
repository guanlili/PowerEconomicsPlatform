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

# 用 BuildKit cache mount 缓存 npm 包，二次构建几乎瞬时完成
# npm ci 比 npm install 快、且严格按 lock 文件安装
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

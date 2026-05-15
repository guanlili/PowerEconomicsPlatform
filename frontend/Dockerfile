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
# 注意：用 npm install --include=optional 而非 npm ci
#   原因：package-lock.json 是在 macOS 生成的，rolldown-vite 依赖平台特定的 native binding（optionalDependencies）
#   npm ci 在跨平台使用 lock 文件时，可能不会为当前平台重新选取 optional binding，导致 vite build 报
#   "Cannot resolve entry module vite.config.ts"
#   npm install 会重新解析当前平台的 optional 依赖，能装上 Linux 对应的 @rolldown/binding-linux-x64-gnu
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --no-audit --no-fund --include=optional

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

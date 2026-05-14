# syntax=docker/dockerfile:1.4
# Build stage
FROM node:22-alpine AS build-stage

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

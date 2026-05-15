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

# 一次性 COPY 全部源码（.dockerignore 已排除 node_modules / dist）
COPY . .

# 在同一个 RUN 内完成 install + 验证 + build，避免中间层任何可能的污染
# 关键：调用 rolldown.rolldown(…) 才会真正加载 native binding，仅 require('rolldown') 不够
RUN set -ex \
    && npm install --no-audit --no-fund --include=optional \
    && echo "===== @rolldown directory =====" \
    && ls -la node_modules/@rolldown/ \
    && echo "===== Test rolldown native binding (must trigger native load) =====" \
    && node -e "const r=require('rolldown'); r.rolldown({input:'./vite.config.ts'}).then(()=>console.log('✅ rolldown bundle OK')).catch(e=>{console.error('❌',e); process.exit(1)})" \
    && echo "===== npm run build =====" \
    && npm run build

# Production stage
FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

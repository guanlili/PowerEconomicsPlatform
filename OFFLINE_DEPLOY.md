# 电力看经济平台 - 离线部署操作手册

## 1. 项目概述

**电力看经济平台（Power Economics Platform）** 是一个基于电力大数据的经济分析与预测系统，由以下三个组件构成，全部通过 `docker-compose` 统一编排、一键启动：

| 组件 | 技术栈 | 端口 | 说明 |
|------|--------|------|------|
| MySQL 数据库 | MySQL 8.0 (Docker) | 3306 | 存储经济数据、影响因素等业务数据 |
| Python 后端 | FastAPI + uvicorn (Docker) | 8000 | 提供数据管理、归因分析、经济预测 API |
| 前端 | Vite + React + Nginx (Docker) | 8094 | 用户界面，Nginx 反向代理 API 请求到 backend 服务 |

本手册适用于**无法连接互联网**的服务器环境。您需要在本地（有网环境）完成镜像构建并导出，然后传输到服务器一键启动。

---

## 2. 环境要求

### 本地开发机（有网络）
- Docker Desktop（支持 `docker build` 和 `docker compose`）
- 若本机是 Apple Silicon（ARM），而服务器是 x86，**必须**使用 `--platform linux/amd64` 跨平台构建

### 目标服务器（离线）
- Docker Engine 20.10+
- Docker Compose V2（`docker compose` 子命令）
- 操作系统：Linux x86_64

---

## 3. 本地构建与导出（开发机）

在项目根目录执行，一次性构建三个镜像：

```bash
cd /path/to/PowerEconomicsPlatform

# 一次性构建 backend 和 frontend 镜像（跨平台 x86_64）
# 注意：Apple Silicon 机器上需显式指定平台
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose build

# 顺便把 MySQL 官方镜像也拉到本地（后面要导出）
docker pull --platform linux/amd64 mysql:8.0
```

导出三个镜像为 tar 包：

```bash
# MySQL
docker save -o mysql-8.0.tar mysql:8.0

# 后端
docker save -o power-economics-platform-backend-v3.0.tar \
  power-economics-platform-backend:v3.0

# 前端
docker save -o power-economics-platform-frontend-v3.0.tar \
  power-economics-platform-frontend:v3.0
```

> 镜像 tag 由 `docker-compose.yml` 中 `image:` 字段定义，如需升级版本号请同步修改 compose 文件与此处命令。

---

## 4. 传输文件清单

将以下文件/目录传输到目标服务器（U 盘、堡垒机或 `scp`）：

| 文件/目录 | 说明 | 来源 |
|-----------|------|------|
| `mysql-8.0.tar` | MySQL Docker 镜像 | 步骤 3 导出 |
| `power-economics-platform-backend-v3.0.tar` | 后端 Docker 镜像 | 步骤 3 导出 |
| `power-economics-platform-frontend-v3.0.tar` | 前端 Docker 镜像 | 步骤 3 导出 |
| `docker-compose.yml` | Docker Compose 编排文件 | 项目根目录 |
| `.env`（可选） | 端口参数化配置，复制自 `.env.example` | 项目根目录 |
| `backend/sql/init.sql` | 数据库初始化脚本（首次启动自动执行） | 项目目录 |

**建议的服务器目录结构**：
```
/data/deploy/power-economics/
├── docker-compose.yml
├── mysql-8.0.tar
├── power-economics-platform-backend-v3.0.tar
├── power-economics-platform-frontend-v3.0.tar
└── backend/
    └── sql/
        └── init.sql
```

传输示例：
```bash
scp -r /path/to/deploy-package root@your-server-ip:/data/deploy/power-economics/
```

> 说明：由于后端已经打进镜像，服务器上**不再需要** `backend/` 下的 Python 源码、`data/*.xlsx`、`offline_packages/` 等内容。仅保留 `backend/sql/init.sql` 供 MySQL 首次启动挂载即可。

---

## 5. 服务器一键部署

### 5.1 导入镜像

```bash
cd /data/deploy/power-economics

docker load -i mysql-8.0.tar
docker load -i power-economics-platform-backend-v3.0.tar
docker load -i power-economics-platform-frontend-v3.0.tar

# 验证镜像已导入
docker images | grep -E "mysql|power-economics-platform"
```

### 5.2 一键启动

```bash
cd /data/deploy/power-economics

# 启动所有服务（MySQL → backend → frontend）
docker compose up -d

# 实时查看启动日志
docker compose logs -f
```

编排逻辑：
- `mysql` 先启动，首次启动会自动执行 `backend/sql/init.sql` 初始化数据库；
- `backend` 等待 `mysql` healthcheck 通过后再启动，通过环境变量 `DATABASE_URL` 连到 `mysql` 服务；
- `frontend` 在 `backend` 启动后启动，Nginx 内 `/api/` 反代到 `http://backend:8000`。

### 5.3 访问地址

- 前端页面：`http://<服务器IP>:8094/keti1/` （访问 `/` 会自动 301 跳转到 `/keti1/`）
- 后端 API：`http://<服务器IP>:8000/`
- MySQL：`<服务器IP>:3306`（用户名 `root`，密码 `root123`）

---

## 6. 验证部署

```bash
# 1) 查看容器状态，三者都应为 Up / healthy
docker compose ps

# 2) 检查 MySQL
docker exec power-economics-mysql \
  mysql -uroot -proot123 -e "USE power_economics; SHOW TABLES;"

# 3) 检查后端
curl http://localhost:8000/
# 预期返回：{"message":"Welcome to Power-to-Economy Insight Platform API"}

curl "http://localhost:8000/api/data/sheets"

# 4) 检查前端（注意：根路径会 301 跳转到 /keti1/）
curl -I http://localhost:8094/keti1/
# 预期返回 HTTP 200
```

浏览器访问 `http://<服务器IP>:8094/keti1/`，确认页面正常加载且数据接口可用。

---

## 7. 常用维护命令

### 全部服务
```bash
cd /data/deploy/power-economics

# 查看状态
docker compose ps

# 查看所有服务日志
docker compose logs -f

# 重启所有服务
docker compose restart

# 停止所有服务
docker compose down

# 停止并删除数据卷（⚠️ 会清空数据库）
docker compose down -v

# 启动所有服务
docker compose up -d
```

### 单个服务操作
```bash
# 只重启后端
docker compose restart backend

# 只看前端日志
docker compose logs -f frontend

# 进入后端容器调试
docker exec -it power-economics-backend sh

# 进入 MySQL
docker exec -it power-economics-mysql mysql -uroot -proot123
```

### 数据库备份/恢复
```bash
# 备份
docker exec power-economics-mysql \
  mysqldump -uroot -proot123 power_economics > backup.sql

# 恢复
docker exec -i power-economics-mysql \
  mysql -uroot -proot123 power_economics < backup.sql
```

---

## 8. 升级部署

当发布新版本时：

```bash
# 本地：重新构建并导出新镜像（修改 compose 中 image tag，如 v3.1）
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose build
docker save -o power-economics-platform-backend-v3.1.tar \
  power-economics-platform-backend:v3.1
docker save -o power-economics-platform-frontend-v3.1.tar \
  power-economics-platform-frontend:v3.1

# 服务器：传输新 tar + 新 docker-compose.yml 后
docker load -i power-economics-platform-backend-v3.1.tar
docker load -i power-economics-platform-frontend-v3.1.tar
docker compose up -d   # compose 会自动按新 image tag 替换容器，数据卷保留
```

---

## 9. 端口与配置说明

| 配置项 | 默认值 | 修改位置 |
|--------|--------|----------|
| 前端端口（唯一对外） | 8094 | `.env` 中 `FRONTEND_PORT` |
| 后端端口 | 8000（默认不对外） | `docker-compose.yml` `backend.ports` + `.env` `BACKEND_PORT` |
| MySQL 端口 | 3306（默认不对外） | `docker-compose.yml` `mysql.ports` + `.env` `MYSQL_PORT` |
| MySQL root 密码 | root123 | `docker-compose.yml` 中 `MYSQL_ROOT_PASSWORD` 与 `DATABASE_URL` 需同步改 |
| 数据库连接地址 | `mysql+pymysql://root:root123@mysql:3306/power_economics` | `backend` 服务的 `DATABASE_URL` 环境变量 |

### 默认端口策略：最小暴露

默认只对外暴露前端 `8094`，后端与 MySQL 仅在 docker 内部网络互通。防火墙只需开放一个端口。需要对外暴露后端 API 或远程连 MySQL 时，在 `docker-compose.yml` 里取消对应 `ports` 注释即可。

### 端口冲突处理

服务器上 `8094` 被占用时，复制一份 `.env` 修改即可，无需改 `docker-compose.yml`：

```bash
cp .env.example .env
# 例如：
# FRONTEND_PORT=18094

docker compose up -d
```

说明：
- 容器内部端口不变，只是映射到宿主机的端口可调整。
- backend 连数据库、frontend Nginx 反代 backend 都走 docker 内部网络，不受宿主机映射端口影响。
- 同样需要调整 backend / MySQL 对外端口时，先在 `docker-compose.yml` 里取消对应 `ports` 注释，再在 `.env` 里调端口。

> 后端 `database.py` 中 `DATABASE_URL` 会优先读取环境变量，本地直接 `python main.py` 时则回落到 `localhost:3306`。

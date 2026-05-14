# 电力看经济平台 - 离线部署操作手册

## 1. 项目概述

**电力看经济平台（Power Economics Platform）** 是一个基于电力大数据的经济分析与预测系统，由以下三个组件构成：

| 组件 | 技术栈 | 端口 | 说明 |
|------|--------|------|------|
| MySQL 数据库 | MySQL 8.0 (Docker) | 3306 | 存储经济数据、影响因素等业务数据 |
| Python 后端 | FastAPI + uvicorn | 8000 | 提供数据管理、归因分析、经济预测 API |
| 前端 | Vite + React + Nginx (Docker) | 8094 | 用户界面，Nginx 反向代理 API 请求 |

本手册适用于**无法连接互联网**的服务器环境。您需要在本地（有网环境）完成构建和依赖下载，然后传输到服务器进行部署。

---

## 2. 环境要求

### 本地开发机（有网络）
- Docker Desktop（支持 `docker build` 和 `docker compose`）
- Python 3.10+
- Node.js 22+（仅构建前端镜像时使用，Dockerfile 内已包含）

### 目标服务器（离线）
- Docker Engine 20.10+
- Docker Compose V2
- Python 3.10+
- 操作系统：Linux x86_64

---

## 3. 本地构建与导出（开发机）

### 3.1 MySQL 数据库

MySQL 使用官方镜像 `mysql:8.0`，无需自行构建。只需确保以下文件可传输：

- `docker-compose.yml`
- `backend/sql/init.sql`（数据库初始化脚本）

**导出 MySQL 官方镜像**（如果服务器无法拉取镜像）：
```bash
# 拉取 x86 架构的 MySQL 镜像
docker pull --platform linux/amd64 mysql:8.0

# 导出为 tar 文件
docker save -o mysql-8.0.tar mysql:8.0
```

### 3.2 Python 后端

后端依赖需要离线安装，使用 `pip download` 提前下载所有 wheel 包：

```bash
cd backend

# 创建离线包目录
mkdir -p offline_packages

# 下载所有依赖的 wheel 包（指定 linux x86_64 平台）
pip download -r requirements.txt \
  --platform manylinux2014_x86_64 \
  --python-version 310 \
  --only-binary=:all: \
  -d offline_packages/

# 部分包可能没有预编译二进制，追加下载源码包
pip download -r requirements.txt \
  --no-binary=:none: \
  -d offline_packages/ 2>/dev/null || true
```

> **提示**：如果目标服务器的 Python 版本不是 3.10，请将 `--python-version` 参数改为对应版本号（如 311 代表 3.11）。

### 3.3 前端 Docker 镜像

**注意**：如果您的本地机器是 Apple M芯片（ARM架构），而服务器是 x86 架构，**必须**加上 `--platform linux/amd64` 参数进行跨平台构建，否则服务器无法运行。

```bash
cd frontend

# 构建前端镜像（跨平台构建）
docker build --platform linux/amd64 -t power-economics-platform-frontend:v3.0 .

# 验证镜像构建成功
docker images | grep power-economics-platform-frontend

# 导出镜像为 tar 文件
docker save -o power-economics-platform-frontend-v3.0.tar power-economics-platform-frontend:v3.0
```

---

## 4. 传输文件清单

将以下文件传输到目标服务器（通过 U盘、堡垒机或 `scp`）：

| 文件/目录 | 说明 | 来源 |
|-----------|------|------|
| `mysql-8.0.tar` | MySQL Docker 镜像 | 步骤 3.1 导出 |
| `power-economics-platform-frontend-v3.0.tar` | 前端 Docker 镜像 | 步骤 3.3 导出 |
| `docker-compose.yml` | Docker Compose 编排文件 | 项目根目录 |
| `backend/` 目录 | 后端代码（含 `sql/init.sql`） | 项目目录 |
| `backend/offline_packages/` | Python 离线依赖包 | 步骤 3.2 下载 |

**建议的服务器目录结构**：
```
/data/deploy/power-economics/
├── docker-compose.yml
├── mysql-8.0.tar
├── power-economics-platform-frontend-v3.0.tar
└── backend/
    ├── main.py
    ├── database.py
    ├── requirements.txt
    ├── offline_packages/
    ├── data/
    │   ├── 区域.xlsx
    │   ├── 行业.xlsx
    │   └── 产业.xlsx
    ├── services/
    ├── utils/
    └── sql/
        └── init.sql
```

传输示例：
```bash
scp -r /path/to/deploy-package root@your-server-ip:/data/deploy/power-economics/
```

---

## 5. 服务器部署

### 步骤1：启动 MySQL 数据库

```bash
cd /data/deploy/power-economics

# 导入 MySQL 镜像
docker load -i mysql-8.0.tar

# 启动 MySQL 容器
docker compose up -d
```

等待 MySQL 完全启动（首次启动会执行 `init.sql` 初始化数据库）：
```bash
# 查看启动日志，等待出现 "ready for connections"
docker logs -f power-economics-mysql

# 验证数据库就绪
docker exec power-economics-mysql mysql -uroot -proot123 -e "SHOW DATABASES;"
```

**关键配置**：
- 容器名：`power-economics-mysql`
- root 密码：`root123`
- 数据库名：`power_economics`
- 字符集：`utf8mb4`（已在 docker-compose.yml 中配置）
- 数据持久化：Docker Volume `mysql_data`

### 步骤2：部署 Python 后端

#### 2.1 创建虚拟环境
```bash
cd /data/deploy/power-economics/backend

# 创建 Python 虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate
```

#### 2.2 离线安装依赖
```bash
# 从离线包目录安装所有依赖
pip install --no-index --find-links=offline_packages -r requirements.txt
```

#### 2.3 启动后端服务
```bash
# 使用 uvicorn 启动（后台运行）
nohup venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

# 或使用 systemd 管理（推荐生产环境，见下方说明）
```

**systemd 服务配置**（推荐）：

创建 `/etc/systemd/system/power-economics-backend.service`：
```ini
[Unit]
Description=Power Economics Platform Backend
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/data/deploy/power-economics/backend
ExecStart=/data/deploy/power-economics/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用并启动服务：
```bash
systemctl daemon-reload
systemctl enable power-economics-backend
systemctl start power-economics-backend
```

### 步骤3：部署前端

```bash
cd /data/deploy/power-economics

# 导入前端镜像
docker load -i power-economics-platform-frontend-v3.0.tar

# 停止并删除旧容器（如果存在）
docker stop power-economics-platform-frontend 2>/dev/null || true
docker rm power-economics-platform-frontend 2>/dev/null || true

# 启动前端容器
docker run -d \
  --name power-economics-platform-frontend \
  --restart always \
  -p 8094:80 \
  power-economics-platform-frontend:v3.0
```

**说明**：
- 前端通过 Nginx 运行在容器内的 80 端口，映射到宿主机 8094 端口
- Nginx 配置了 `/keti1/` 子路径支持
- 访问地址：`http://<服务器IP>:8094/keti1/`

> **注意**：当前 nginx.conf 未配置 `/api` 反向代理。如需前端直接代理 API 请求到后端，需在 nginx.conf 中添加以下配置后重新构建前端镜像：
> ```nginx
> location /api/ {
>     proxy_pass http://host.docker.internal:8000;
>     proxy_set_header Host $host;
>     proxy_set_header X-Real-IP $remote_addr;
> }
> ```
> 或者在服务器上使用 `--add-host` 参数启动容器：
> ```bash
> docker run -d \
>   --name power-economics-platform-frontend \
>   --restart always \
>   --add-host=host.docker.internal:host-gateway \
>   -p 8094:80 \
>   power-economics-platform-frontend:v3.0
> ```

---

## 6. 验证部署

### 6.1 检查 MySQL
```bash
docker exec power-economics-mysql mysql -uroot -proot123 -e "USE power_economics; SHOW TABLES;"
```

### 6.2 检查后端
```bash
# 健康检查
curl http://localhost:8000/

# 预期返回：{"message":"Welcome to Power-to-Economy Insight Platform API"}

# 检查数据接口
curl "http://localhost:8000/api/data/sheets"
```

### 6.3 检查前端
```bash
# 检查容器运行状态
docker ps | grep power-economics-platform-frontend

# 访问前端页面
curl -I http://localhost:8094/keti1/
# 预期返回 HTTP 200
```

### 6.4 端到端验证
在浏览器中访问 `http://<服务器IP>:8094/keti1/`，确认页面正常加载且数据接口可用。

---

## 7. 常用维护命令

### MySQL 数据库
```bash
# 查看日志
docker logs -f power-economics-mysql

# 进入 MySQL 命令行
docker exec -it power-economics-mysql mysql -uroot -proot123

# 重启 MySQL
docker restart power-economics-mysql

# 备份数据库
docker exec power-economics-mysql mysqldump -uroot -proot123 power_economics > backup.sql

# 恢复数据库
docker exec -i power-economics-mysql mysql -uroot -proot123 power_economics < backup.sql
```

### Python 后端
```bash
# 查看后端日志
tail -f /data/deploy/power-economics/backend/backend.log

# 重启后端（nohup 方式）
kill $(pgrep -f "uvicorn main:app")
cd /data/deploy/power-economics/backend
nohup venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

# 重启后端（systemd 方式）
systemctl restart power-economics-backend
systemctl status power-economics-backend
```

### 前端
```bash
# 查看 Nginx 日志
docker logs -f power-economics-platform-frontend

# 进入容器调试
docker exec -it power-economics-platform-frontend sh

# 重启前端
docker restart power-economics-platform-frontend
```

### 全部服务
```bash
# 停止所有服务
docker stop power-economics-platform-frontend
docker stop power-economics-mysql
kill $(pgrep -f "uvicorn main:app")

# 启动所有服务（按顺序）
docker compose up -d                          # MySQL
cd /data/deploy/power-economics/backend
nohup venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &  # 后端
docker start power-economics-platform-frontend  # 前端
```

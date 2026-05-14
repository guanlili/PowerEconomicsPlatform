# 电力看经济平台 (Power-to-Economy Insight Platform)

## 项目简介
本平台基于高频电力数据与月度宏观/行业/气象影响因素，构建**区域 / 行业 / 产业**三级经济指标预测与归因分析系统。

## 功能模块
- **M01 数据管理**：Excel 模板下载、数据导入（智能去重 / 替换两种模式）、分页查看
- **M02 影响因素分析**：基于预置数据计算 Pearson/Kendall/Spearman/MIC 相关性，输出 Top-N 影响因素
- **M03 经济预测**：基于 ARIMA 模型预测核心经济指标，并用真实值评估 MAPE 精度
- **M04 指标体系**：指标体系展示页

## 技术栈
| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Ant Design + ECharts + Axios |
| 后端 | Python + FastAPI + uvicorn + Pandas + NumPy + Scikit-learn + SciPy + Statsmodels (ARIMA) + pmdarima |
| 数据库 | MySQL 8.0（utf8mb4） |
| 部署 | Docker + Docker Compose（前后端与数据库统一编排） |

---

## 快速开始

### 方式一：Docker 全栈一键启动（推荐）

要求：本机已安装 **Docker** 与 **Docker Compose V2**。

```bash
# 在项目根目录
docker compose up -d --build

# 查看启动状态（mysql 应为 healthy，backend / frontend 为 Up）
docker compose ps

# 实时查看日志
docker compose logs -f
```

启动完成后访问：

| 入口 | 地址 |
|------|------|
| 前端页面 | http://localhost:8094/ （会自动 301 跳转到 `/keti1/`） |
| 后端 API | 默认**不对外暴露**，仅前端容器走内网访问；需要调试时可在 `docker-compose.yml` 取消 backend.ports 注释 |
| 后端 API 文档 | 同上，开启后访问 http://localhost:8000/docs |
| MySQL | 默认**不对外暴露**，需要本地 GUI 连库时可在 `docker-compose.yml` 取消 mysql.ports 注释 |

常用维护：

```bash
docker compose restart backend       # 重启某个服务
docker compose logs -f frontend      # 查看单服务日志
docker compose down                  # 停止全部服务（保留数据卷）
docker compose down -v               # ⚠️ 同时清空数据库
docker compose up -d --build         # 重新构建并启动
```

> 离线环境部署（导出镜像 tar 后传输到内网服务器）请参考 [`OFFLINE_DEPLOY.md`](./OFFLINE_DEPLOY.md)。

---

### 方式二：本地开发模式（前后端分离启动）

适合开发调试。MySQL 仍建议用 Docker 起，前后端跑在宿主机。

#### 1. 启动数据库

```bash
docker compose up -d mysql
```

#### 2. 启动后端

```bash
cd backend

python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

`backend/database.py` 中的 `DATABASE_URL` 默认连 `localhost:3306`，本地直接跑无需额外配置。如需指向其他数据库，设置环境变量 `DATABASE_URL` 即可覆盖。

#### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173/keti1/ （Vite dev server 已配置 `base: '/keti1/'`，并把 `/api` 代理到 `http://localhost:8000`）。

---

## 项目目录概览

```
PowerEconomicsPlatform/
├── docker-compose.yml              # 全栈编排：mysql + backend + frontend
├── OFFLINE_DEPLOY.md               # 离线部署手册（导出镜像 tar 方案）
├── backend/
│   ├── Dockerfile                  # 后端镜像构建
│   ├── main.py                     # FastAPI 入口，所有路由
│   ├── database.py                 # SQLAlchemy 引擎，DATABASE_URL 支持环境变量
│   ├── requirements.txt
│   ├── services/
│   │   ├── factor_analysis.py      # 影响因素分析（Pearson/Kendall/Spearman/MIC）
│   │   └── economic_prediction.py  # ARIMA 经济预测
│   ├── utils/
│   │   ├── excel_utils.py          # Excel 读取/列检测
│   │   └── time_utils.py           # 时间列标准化、粒度检测
│   ├── sql/init.sql                # MySQL 首次启动初始化脚本
│   └── data/                       # 模板 fallback 用的种子 Excel
└── frontend/
    ├── Dockerfile                  # 前端镜像（多阶段：node 构建 + nginx 运行）
    ├── nginx.conf                  # /api 反代到 backend、/ 跳转到 /keti1/
    ├── vite.config.ts              # base: '/keti1/'
    └── src/
        ├── App.tsx                 # <Router basename="/keti1">
        ├── layouts/MainLayout.tsx
        └── pages/                  # M01 ~ M04 四个模块
```

---

## API 接口（部分）

| 端点 | 方法 | 说明 |
|---|---|---|
| `/` | GET | 服务健康检查 |
| `/api/data/sheets` | GET | 列出所有 sheet 与各数据类型的列名、行数 |
| `/api/data/columns` | GET | 按数据类型返回目标列、影响因素列、时间范围 |
| `/api/data/list` | GET | 分页获取某 sheet + 数据类型的具体数据 |
| `/api/data/template` | GET | 下载指定 sheet + 数据类型 的导入模板 Excel |
| `/api/data/import` | POST | 导入 Excel 数据，支持 `smart`（去重追加）/ `replace` 两种模式 |
| `/api/analysis` | POST | 影响因素分析：返回 Pearson/Kendall/Spearman/MIC 相关性得分 Top-N |
| `/api/prediction` | POST | 经济预测：ARIMA 训练 + 多步预测 + MAPE 精准度评估 |

完整字段定义见 http://localhost:8000/docs 。

### 调用示例

```bash
# 取产业数据的可选目标列与时间范围
curl "http://localhost:8000/api/data/columns?data_type=产业"

# 影响因素分析
curl -X POST http://localhost:8000/api/analysis \
  -F "data_type=产业" \
  -F "target_col=产业增加值" \
  -F "top_n=5"

# 经济预测
curl -X POST http://localhost:8000/api/prediction \
  -F "data_type=区域" \
  -F 'target_columns=["GDP","CPI"]' \
  -F "forecast_periods=12"
```

---

## 算法说明

### 影响因素分析 (M02)
基于 Pearson、Kendall、Spearman 三种相关系数及最大信息系数（MIC），对所选数据中所有特征列与目标变量进行相关性量化评估。自动清洗列名、剔除缺失值 / 零方差列 / 重复列，按综合得分排序输出 Top-N 显著影响因素。

### 经济预测 (M03)
基于 ARIMA 时间序列模型对历史经济指标进行趋势建模与未来预测。自动区分**率值类**指标（增速、CPI、PPI 等）与**绝对值类**指标，使用差异化的 ARIMA 参数策略。当 `date_end` 截断历史数据时，仍会用全量数据中的真实观测作为预测期"实际值"用于对比与 MAPE 精准度计算。

---

## 端口与配置

| 配置项 | 默认值 | 修改位置 |
|--------|--------|----------|
| 前端端口（唯一对外） | 8094 | `.env` 中 `FRONTEND_PORT` |
| 后端端口 | 8000（**默认不对外**） | `docker-compose.yml` 中 backend.ports + `.env` `BACKEND_PORT` |
| MySQL 端口 | 3306（**默认不对外**） | `docker-compose.yml` 中 mysql.ports + `.env` `MYSQL_PORT` |
| 前端子路径 | `/keti1/` | `vite.config.ts` `base` + `App.tsx` `basename` + `nginx.conf` |
| 数据库连接 | `mysql+pymysql://root:root123@mysql:3306/power_economics` | `backend` 服务的 `DATABASE_URL` 环境变量 |

### 默认部署策略：最小暴露

- 前端是唯一对外的服务，默认端口 `8094`；
- 后端 与 MySQL 默认**不对外暴露**，仅在 docker 内部网络互通；frontend Nginx 通过容器服务名 `backend:8000` 反代 API，backend 通过 `mysql:3306` 访问数据库；
- 防火墙只需开放 `8094` 一个端口。

### 何时需要对外暴露 backend / MySQL

| 场景 | 操作 |
|------|------|
| 需要访问 Swagger 文档 / 第三方调 API | 取消 `docker-compose.yml` 中 `backend.ports` 两行注释 |
| 本地 GUI 工具连 MySQL 排查数据 | 取消 `docker-compose.yml` 中 `mysql.ports` 两行注释 |

### 端口冲突处理

如果服务器上 `8094` 已被占用，不需要修改 `docker-compose.yml`，复制一份 `.env` 后调整即可：

```bash
cp .env.example .env
# 编辑 .env，例如：
# FRONTEND_PORT=18094

docker compose up -d --build
```

如果同时开启了 backend / mysql 的对外暴露，同样可通过 `BACKEND_PORT` / `MYSQL_PORT` 调整。

几点说明：

- **容器内部端口不变**（frontend=80、backend=8000、mysql=3306），只是映射到宿主机的端口可调。
- backend 连数据库走容器网络 `mysql:3306`，**不受 `MYSQL_PORT` 影响**。
- frontend Nginx 反代后端走容器网络 `http://backend:8000/`，**也不受 `BACKEND_PORT` 影响**。

> 修改 MySQL 密码时记得同步更新 `MYSQL_ROOT_PASSWORD` 与 backend 的 `DATABASE_URL`。

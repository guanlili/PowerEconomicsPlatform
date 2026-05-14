# Python backend for Power Economics Platform
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 国内常见基础依赖（pandas/numpy/statsmodels 等运行期需要少量动态库）
# slim 镜像体积小，这里仅安装必要内容
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       curl \
    && rm -rf /var/lib/apt/lists/*

# 先拷贝 requirements 以利用 Docker 层缓存
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 拷贝业务代码
COPY . .

EXPOSE 8000

# 默认数据库连接通过环境变量 DATABASE_URL 注入（见 docker-compose.yml）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

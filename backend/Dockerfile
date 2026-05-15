# Python backend for Power Economics Platform
# 注意：BuildKit 内置 frontend 已支持 RUN --mount=type=cache，无需 # syntax 指令
# 加上 # syntax 反而会触发 BuildKit 联网拉解析器镜像，离线/弱网环境会失败
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 使用国内 PyPI 镜像（清华源），大幅加速依赖下载
# pandas / numpy / scipy / statsmodels / pmdarima 都有 manylinux wheel，无需 build-essential
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple \
    && pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn

# 先拷贝 requirements 以利用 Docker 层缓存
COPY requirements.txt .

# 用 BuildKit cache mount 缓存 pip 下载，二次构建几乎瞬时完成
# 需要启用 BuildKit（Docker Desktop / Docker 20.10+ 默认已启用）
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip \
    && pip install -r requirements.txt

# 拷贝业务代码
COPY . .

EXPOSE 8000

# 默认数据库连接通过环境变量 DATABASE_URL 注入（见 docker-compose.yml）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

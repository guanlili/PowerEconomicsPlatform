# 离线部署操作手册 (Offline Deployment Guide)

本手册适用于**无法连接互联网**的服务器环境。您需要在本地（有网环境）构建镜像，导出为文件，然后传输到服务器进行部署。

## 1. 本地构建与导出 (Local Machine)

在您的开发机（Mac/Windows/Linux）上执行以下步骤：

### 1.1 构建镜像 (关键步骤)
**注意**：由于您的本地机器是 Apple M芯片 (ARM架构)，而服务器是 x86 架构，**必须**加上 `--platform linux/amd64` 参数进行跨平台构建，否则服务器无法运行。

进入前端目录并构建：
```bash
cd frontend
# 使用 --platform linux/amd64 指定构建目标为 x86 架构
docker build --platform linux/amd64 -t power-economics-frontend:v1.0 .
```

### 1.2 验证镜像
确保镜像构建成功：
```bash
docker images | grep power-economics-frontend
```

### 1.3 导出镜像为文件
将镜像保存为 `.tar` 压缩包，方便传输：
```bash
#将镜像保存到当前目录，文件名为 image-pe-frontend-v1.0.tar
docker save -o image-pe-frontend-v1.0.tar power-economics-frontend:v1.0
```
*此时，您的当前目录下会生成一个约为几十 MB 的 `image-pe-frontend-v1.0.tar` 文件。*

---

## 2. 传输文件 (Data Transfer)

通过 U 盘、堡垒机或 `scp` 等方式，将 `image-pe-frontend-v1.0.tar` 文件复制到目标服务器。

示例（如果是通过网络传输）：
```bash
scp image-pe-frontend-v1.0.tar root@your-server-ip:/data/deploy/
```

---

## 3. 服务器部署 (Target Server)

在目标服务器上执行以下步骤（需已安装 Docker）：

### 3.1 导入镜像
加载传输过来的镜像文件：
```bash
cd /data/deploy/
docker load -i image-pe-frontend-v1.0.tar
```
*输出示例：`Loaded image: power-economics-frontend:v1.0`*

### 3.2 启动容器
如果之前运行过旧版本，建议先停止并删除：
```bash
# 停止旧容器
docker stop pe-frontend
# 删除旧容器
docker rm pe-frontend
```

启动新容器：
```bash
docker run -d \
  --name pe-frontend \
  --restart always \
  -p 8094:80 \
  power-economics-frontend:v1.0
```

### 3.3 验证部署
检查容器状态：
```bash
docker ps | grep pe-frontend
```
此时，您可以通过浏览器访问服务器 IP（如 `http://192.168.1.100`）来使用系统。

---

## 4. 常用维护命令

- **查看日志**：
  ```bash
  docker logs -f pe-frontend
  ```
- **进入容器内部**（调试用）：
  ```bash
  docker exec -it pe-frontend sh
  ```
- **重启服务**：
  ```bash
  docker restart pe-frontend
  ```

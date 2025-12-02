# LawTrace 阿里云 Docker 部署指南

## 📋 目录

- [准备工作](#准备工作)
- [快速部署](#快速部署)
- [详细步骤](#详细步骤)
- [配置说明](#配置说明)
- [运维命令](#运维命令)
- [常见问题](#常见问题)

---

## 准备工作

### 1. 阿里云 ECS 配置要求

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| 系统 | Ubuntu 22.04 | 或 CentOS 8 |
| CPU | 2核以上 | Next.js 构建需要 |
| 内存 | 4GB以上 | 推荐 8GB |
| 带宽 | 按需 | 建议 5Mbps 以上 |

### 2. 安全组配置

开放以下端口：
- **22** - SSH 连接
- **80** - HTTP
- **443** - HTTPS
- **3000** - 前端（可选，使用 Nginx 时不需要）
- **8000** - 后端（可选，使用 Nginx 时不需要）

---

## 快速部署

```bash
# 1. 连接服务器
ssh root@你的服务器IP

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker && systemctl enable docker

# 3. 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. 克隆/上传代码
cd /opt
git clone 你的仓库地址 lawtrace
cd lawtrace

# 5. 配置环境变量
cp env.example .env
vim .env  # 编辑填入实际值

# 6. 一键部署
./deploy.sh
```

---

## 详细步骤

### 步骤 1: 准备服务器环境

```bash
# 更新系统
apt update && apt upgrade -y

# 安装必要工具
apt install -y curl git vim

# 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 步骤 2: 上传代码

**方式一：使用 Git**
```bash
cd /opt
git clone 你的仓库地址 lawtrace
cd lawtrace
```

**方式二：使用 SCP**
```bash
# 在本地执行
scp -r /path/to/LawTrace root@服务器IP:/opt/lawtrace
```

### 步骤 3: 配置环境变量

```bash
cd /opt/lawtrace

# 复制环境变量模板
cp env.example .env

# 编辑配置
vim .env
```

**必须配置的变量：**

```env
# OpenRouter API Key（AI 功能需要）
OPENROUTER_API_KEY=sk-or-v1-你的密钥

# 前端访问后端的地址
# 方式1：使用公网IP
NEXT_PUBLIC_API_URL=http://服务器公网IP:8000

# 方式2：使用域名（推荐）
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 步骤 4: 构建和启动

```bash
# 方式1：使用部署脚本（推荐）
./deploy.sh

# 方式2：手动执行
mkdir -p data uploads nginx/ssl
docker-compose up -d --build
```

### 步骤 5: 配置域名和 HTTPS（推荐）

如果使用域名访问：

```bash
# 1. 修改 nginx/nginx.conf 中的 server_name
vim nginx/nginx.conf
# 将 localhost 改为你的域名

# 2. 使用 Nginx 配置启动
docker-compose --profile production up -d

# 3. 申请 SSL 证书
apt install certbot -y
certbot certonly --standalone -d yourdomain.com

# 4. 复制证书到 nginx/ssl 目录
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# 5. 启用 HTTPS（取消 nginx.conf 中的注释）
# 6. 重启 Nginx
docker-compose restart nginx
```

---

## 配置说明

### 文件结构

```
lawtrace/
├── docker-compose.yml      # 主配置文件
├── docker-compose.dev.yml  # 开发环境配置
├── deploy.sh              # 部署脚本
├── env.example            # 环境变量模板
├── nginx/
│   ├── nginx.conf         # Nginx 配置
│   └── ssl/               # SSL 证书目录
├── backend/
│   └── Dockerfile         # 后端镜像配置
├── frontend/
│   ├── Dockerfile         # 前端生产镜像
│   └── Dockerfile.dev     # 前端开发镜像
├── data/                  # 数据库文件（持久化）
└── uploads/               # 上传文件（持久化）
```

### 数据持久化

以下目录会自动持久化到宿主机：

| 容器路径 | 宿主机路径 | 用途 |
|----------|------------|------|
| /app/data | ./data | SQLite 数据库 |
| /app/uploads | ./uploads | 上传的合同文件 |

---

## 运维命令

### 使用部署脚本

```bash
# 启动服务
./deploy.sh start

# 启动生产环境（含 Nginx）
./deploy.sh prod

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看日志
./deploy.sh logs           # 所有日志
./deploy.sh logs backend   # 后端日志
./deploy.sh logs frontend  # 前端日志

# 查看状态
./deploy.sh status

# 更新部署
./deploy.sh update

# 备份数据
./deploy.sh backup

# 清理
./deploy.sh clean
```

### 直接使用 Docker Compose

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 重新构建
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 进入容器
docker exec -it lawtrace-backend sh
docker exec -it lawtrace-frontend sh
```

---

## 常见问题

### Q: 前端无法连接后端 API

**检查步骤：**
1. 确认 `.env` 中的 `NEXT_PUBLIC_API_URL` 配置正确
2. 确认安全组已开放对应端口
3. 查看后端日志：`docker-compose logs backend`

### Q: 构建时内存不足

**解决方案：**
```bash
# 增加 swap 空间
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Q: 上传大文件失败

**解决方案：**
1. 检查 Nginx 配置中的 `client_max_body_size`
2. 默认已设置为 100M，如需更大请修改 nginx.conf

### Q: AI 分析功能不工作

**检查步骤：**
1. 确认 `.env` 中已配置 `OPENROUTER_API_KEY`
2. 确认 API Key 有效
3. 查看后端日志中的错误信息

### Q: 如何查看数据库

```bash
# 进入后端容器
docker exec -it lawtrace-backend sh

# 使用 sqlite3
sqlite3 data/lextrace.db
.tables
SELECT * FROM contracts;
.exit
```

---

## 备份与恢复

### 自动备份（推荐）

创建定时任务：
```bash
crontab -e

# 每天凌晨 3 点备份
0 3 * * * cd /opt/lawtrace && ./deploy.sh backup
```

### 手动备份

```bash
cd /opt/lawtrace
tar -czf backup_$(date +%Y%m%d).tar.gz data/ uploads/
```

### 恢复数据

```bash
# 停止服务
docker-compose down

# 解压备份
tar -xzf backup_20241201.tar.gz

# 重新启动
docker-compose up -d
```

---

## 性能优化

### 1. 启用 Gzip 压缩
已在 nginx.conf 中默认启用

### 2. 静态资源缓存
已在 nginx.conf 中配置 30 天缓存

### 3. 多 Worker 进程
后端默认使用 2 个 worker，可在 Dockerfile 中调整

---

## 技术支持

如有问题，请提交 Issue 或联系开发团队。



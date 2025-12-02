#!/bin/bash
# ============================================
# LawTrace 部署脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
    fi
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装，请先安装 Docker Compose"
    fi
    info "Docker 环境检查通过 ✓"
}

# 检查环境变量文件
check_env() {
    if [ ! -f .env ]; then
        warn ".env 文件不存在，从模板创建..."
        if [ -f env.example ]; then
            cp env.example .env
            warn "请编辑 .env 文件，填入实际配置值"
            exit 1
        else
            error "env.example 模板文件不存在"
        fi
    fi
    info "环境变量文件检查通过 ✓"
}

# 创建必要的目录
create_dirs() {
    mkdir -p data uploads nginx/ssl
    info "目录创建完成 ✓"
}

# 构建镜像
build() {
    info "开始构建 Docker 镜像..."
    docker-compose build --no-cache
    info "镜像构建完成 ✓"
}

# 启动服务
start() {
    info "启动服务..."
    docker-compose up -d
    info "服务已启动 ✓"
    
    echo ""
    info "等待服务就绪..."
    sleep 10
    
    # 检查服务状态
    if curl -s http://localhost:8000/health > /dev/null; then
        info "后端服务正常 ✓"
    else
        warn "后端服务可能还在启动中..."
    fi
    
    echo ""
    info "========================================="
    info "部署完成！访问地址："
    info "  前端: http://localhost:3000"
    info "  后端: http://localhost:8000"
    info "  API文档: http://localhost:8000/docs"
    info "========================================="
}

# 启动带 Nginx 的生产环境
start_production() {
    info "启动生产环境（含 Nginx）..."
    docker-compose --profile production up -d
    info "生产环境已启动 ✓"
}

# 停止服务
stop() {
    info "停止服务..."
    docker-compose down
    info "服务已停止 ✓"
}

# 重启服务
restart() {
    stop
    start
}

# 查看日志
logs() {
    docker-compose logs -f "${1:-}"
}

# 查看状态
status() {
    docker-compose ps
}

# 更新部署
update() {
    info "拉取最新代码..."
    git pull origin main || warn "Git 拉取失败，跳过..."
    
    info "重新构建并启动..."
    docker-compose up -d --build
    
    info "清理旧镜像..."
    docker image prune -f
    
    info "更新完成 ✓"
}

# 备份数据
backup() {
    BACKUP_FILE="lawtrace_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    info "创建备份: $BACKUP_FILE"
    tar -czf "$BACKUP_FILE" data/ uploads/
    info "备份完成 ✓"
}

# 清理
clean() {
    warn "这将删除所有容器和镜像，确定要继续吗？(y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        docker-compose down --rmi all --volumes
        info "清理完成 ✓"
    else
        info "取消清理"
    fi
}

# 帮助信息
help() {
    echo "LawTrace 部署脚本"
    echo ""
    echo "用法: ./deploy.sh <命令>"
    echo ""
    echo "命令:"
    echo "  build       构建 Docker 镜像"
    echo "  start       启动服务（开发环境）"
    echo "  prod        启动服务（生产环境，含 Nginx）"
    echo "  stop        停止服务"
    echo "  restart     重启服务"
    echo "  logs [服务] 查看日志（可选指定服务：backend/frontend）"
    echo "  status      查看服务状态"
    echo "  update      更新并重新部署"
    echo "  backup      备份数据"
    echo "  clean       清理所有容器和镜像"
    echo "  help        显示帮助信息"
}

# 主入口
main() {
    case "${1:-}" in
        build)
            check_docker
            build
            ;;
        start)
            check_docker
            check_env
            create_dirs
            start
            ;;
        prod|production)
            check_docker
            check_env
            create_dirs
            start_production
            ;;
        stop)
            stop
            ;;
        restart)
            check_docker
            restart
            ;;
        logs)
            logs "$2"
            ;;
        status)
            status
            ;;
        update)
            check_docker
            update
            ;;
        backup)
            backup
            ;;
        clean)
            clean
            ;;
        help|--help|-h)
            help
            ;;
        *)
            # 默认执行完整部署
            check_docker
            check_env
            create_dirs
            build
            start
            ;;
    esac
}

main "$@"



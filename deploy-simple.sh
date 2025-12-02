#!/bin/bash
# ============================================
# LawTrace 单服务器一键部署脚本
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 LawTrace 单服务器部署${NC}"
echo "=================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "安装 Docker: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️ 创建 .env 配置文件...${NC}"
    cat > .env << 'EOF'
# LawTrace 配置
DB_PASSWORD=LawTrace2025
OPENROUTER_API_KEY=你的OpenRouter_API_Key
NEXT_PUBLIC_API_URL=http://你的服务器IP
EOF
    echo -e "${YELLOW}请编辑 .env 文件填入正确的配置${NC}"
    echo "  vim .env"
    exit 1
fi

# 创建必要目录
mkdir -p uploads data certbot/conf certbot/www

case "${1:-start}" in
    start)
        echo -e "${GREEN}▶ 启动服务...${NC}"
        docker compose -f docker-compose.simple.yml up -d --build
        echo ""
        echo -e "${GREEN}✅ 部署完成！${NC}"
        echo "访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')"
        ;;
    
    stop)
        echo -e "${YELLOW}⏹ 停止服务...${NC}"
        docker compose -f docker-compose.simple.yml down
        ;;
    
    restart)
        echo -e "${YELLOW}🔄 重启服务...${NC}"
        docker compose -f docker-compose.simple.yml restart
        ;;
    
    logs)
        docker compose -f docker-compose.simple.yml logs -f ${2:-}
        ;;
    
    status)
        echo -e "${GREEN}📊 服务状态:${NC}"
        docker compose -f docker-compose.simple.yml ps
        ;;
    
    update)
        echo -e "${GREEN}🔄 更新代码并重新部署...${NC}"
        git pull
        docker compose -f docker-compose.simple.yml up -d --build
        ;;
    
    backup)
        echo -e "${GREEN}💾 备份数据库...${NC}"
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker compose -f docker-compose.simple.yml exec -T db pg_dump -U postgres lawtrace > "$BACKUP_FILE"
        echo "备份文件: $BACKUP_FILE"
        ;;
    
    *)
        echo "用法: $0 {start|stop|restart|logs|status|update|backup}"
        echo ""
        echo "  start   - 启动所有服务"
        echo "  stop    - 停止所有服务"
        echo "  restart - 重启服务"
        echo "  logs    - 查看日志 (可选: logs backend/frontend/db)"
        echo "  status  - 查看服务状态"
        echo "  update  - 拉取代码并重新部署"
        echo "  backup  - 备份数据库"
        ;;
esac





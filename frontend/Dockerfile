# ============================================
# LawTrace Frontend Dockerfile
# 多阶段构建，优化镜像大小
# ============================================

# 阶段 1: 依赖安装
FROM node:18-alpine AS deps
WORKDIR /app

# 只复制 package 文件以利用 Docker 缓存
COPY package.json package-lock.json* ./
RUN npm ci --only=production=false

# ============================================
# 阶段 2: 构建
# ============================================
FROM node:18-alpine AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建时需要的环境变量
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# 禁用 telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN npm run build

# ============================================
# 阶段 3: 生产运行
# ============================================
FROM node:18-alpine AS runner
WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public

# 设置正确的权限
RUN mkdir .next && chown nextjs:nodejs .next

# 复制构建产物（使用 standalone 模式更优，但需要配置）
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置运行时环境变量
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# 启动命令
CMD ["npm", "start"]

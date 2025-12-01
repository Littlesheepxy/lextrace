import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 数据库配置
# 支持 SQLite（本地开发）和 PostgreSQL（Supabase 生产环境）
DATABASE_URL = os.getenv("DATABASE_URL", "")
SQLITE_FALLBACK = "sqlite:///./data/lextrace.db"

def create_db_engine(url: str):
    """根据数据库类型创建引擎"""
    if url.startswith("sqlite"):
        return create_engine(
            url, 
            connect_args={"check_same_thread": False}
        )
    else:
        # PostgreSQL (Supabase) 配置
        return create_engine(
            url,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10}
        )

def get_working_engine():
    """尝试连接数据库，失败则回退到 SQLite"""
    
    # 1. 如果没有配置 DATABASE_URL 或配置为 SQLite，直接使用 SQLite
    if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
        db_url = DATABASE_URL or SQLITE_FALLBACK
        logger.info(f"📂 使用本地 SQLite 数据库: {db_url}")
        return create_db_engine(db_url)
    
    # 2. 尝试连接 PostgreSQL
    try:
        logger.info(f"🔗 正在连接 PostgreSQL: {DATABASE_URL[:50]}...")
        engine = create_db_engine(DATABASE_URL)
        
        # 测试连接
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        logger.info("✅ PostgreSQL 连接成功!")
        return engine
        
    except Exception as e:
        logger.warning(f"⚠️ PostgreSQL 连接失败: {str(e)[:100]}")
        logger.info(f"📂 回退到本地 SQLite: {SQLITE_FALLBACK}")
        return create_db_engine(SQLITE_FALLBACK)

# 创建数据库引擎
engine = get_working_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_info():
    """返回当前数据库连接信息"""
    url = str(engine.url)
    if "sqlite" in url:
        return {"type": "sqlite", "url": url}
    else:
        # 隐藏密码
        safe_url = url.split("@")[-1] if "@" in url else url
        return {"type": "postgresql", "url": f"postgresql://***@{safe_url}"}

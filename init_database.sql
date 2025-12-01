-- ============================================
-- LawTrace 数据库初始化脚本
-- 适用于 PostgreSQL / Supabase
-- ============================================

-- 创建 projects 表
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- 创建 contracts 表
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_name ON contracts(name);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);

-- 创建 versions 表
CREATE TABLE IF NOT EXISTS versions (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(500),
    commit_message TEXT,
    html_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_versions_contract_id ON versions(contract_id);

-- 创建 diffs 表
CREATE TABLE IF NOT EXISTS diffs (
    id SERIAL PRIMARY KEY,
    version_id INTEGER REFERENCES versions(id) ON DELETE CASCADE,
    previous_version_id INTEGER REFERENCES versions(id) ON DELETE SET NULL,
    content TEXT,
    summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_diffs_version_id ON diffs(version_id);

-- 创建 operation_logs 表
CREATE TABLE IF NOT EXISTS operation_logs (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    action VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_contract_id ON operation_logs(contract_id);

-- 创建 comments 表
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    version_id INTEGER REFERENCES versions(id) ON DELETE CASCADE,
    element_id VARCHAR(255),
    quote TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_contract_id ON comments(contract_id);
CREATE INDEX IF NOT EXISTS idx_comments_version_id ON comments(version_id);

-- ============================================
-- 验证表创建
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;


-- 用户表（存储登录信息和基本资料）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 唯一用户ID
  openid TEXT UNIQUE NOT NULL,           -- 微信openid（登录唯一标识）
  session_key TEXT,                      -- 微信会话密钥（可选，用于敏感信息解密）
  name TEXT NOT NULL,                    -- 用户名（微信昵称或自定义）
  role TEXT NOT NULL DEFAULT 'user',     -- 角色（user/admin/student等，控制权限）
  phone TEXT,                            -- 联系电话（完善资料时补充）
  avatar_url TEXT,                       -- 头像URL（微信头像或自定义）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 账号创建时间
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- 信息更新时间
);

-- 索引：加速openid查询（登录核心字段）
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);

-- 插入管理员账号（用于后台管理）
INSERT OR IGNORE INTO users (openid, name, role, phone, avatar_url) 
VALUES ('admin_openid_123', '系统管理员', 'admin', '13800138000', '');

-- 插入测试用户（模拟微信登录用户）
INSERT OR IGNORE INTO users (openid, name, role, phone, avatar_url) 
VALUES 
  ('openid_001', '张三', 'student', '13800138001', 'https://example.com/avatar/1.png'),
  ('openid_002', '李四', 'teacher', '13800138002', 'https://example.com/avatar/2.png'),
  ('openid_003', '王五', 'researcher', '13800138003', '');
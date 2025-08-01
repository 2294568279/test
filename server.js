const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

// 数据库连接
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('数据库连接错误:', err.message);
  }
});

// 微信登录接口
router.post('/wx/login', async (req, res) => {
  try {
    const { code, userInfo } = req.body;
    
    // 验证请求参数
    if (!code || !userInfo) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必要参数'
      });
    }

    // 1. 调用微信接口获取openid（实际生产环境使用真实参数）
    const appId = '你的微信小程序AppId';
    const appSecret = '你的微信小程序AppSecret';
    const wxLoginUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
    
    let wxResponse;
    try {
      wxResponse = await axios.get(wxLoginUrl);
    } catch (error) {
      console.error('微信接口调用失败:', error);
      return res.status(500).json({
        code: 500,
        msg: '微信授权失败'
      });
    }

    const { openid, session_key } = wxResponse.data;
    if (!openid) {
      return res.status(401).json({
        code: 401,
        msg: '获取用户标识失败'
      });
    }

    // 2. 检查用户是否已存在
    db.get('SELECT * FROM users WHERE openid = ?', [openid], (err, row) => {
      if (err) {
        console.error('数据库查询错误:', err);
        return res.status(500).json({
          code: 500,
          msg: '服务器内部错误'
        });
      }

      if (row) {
        // 3. 用户已存在 - 返回用户信息和token
        return res.json({
          code: 200,
          data: {
            token: generateToken(row.id),
            userInfo: {
              id: row.id,
              name: row.name,
              role: row.role,
              phone: row.phone,
              avatarUrl: row.avatar_url
            },
            isNewUser: false
          }
        });
      }

      // 4. 新用户 - 创建账号
      db.run(`INSERT INTO users (name, role, openid, avatar_url) 
              VALUES (?, ?, ?, ?)`, 
        [userInfo.nickName, 'user', openid, userInfo.avatarUrl || ''], 
        function(err) {
          if (err) {
            console.error('创建用户失败:', err);
            return res.status(500).json({
              code: 500,
              msg: '创建用户失败'
            });
          }

          // 返回新用户信息
          res.json({
            code: 200,
            data: {
              token: generateToken(this.lastID),
              userInfo: {
                id: this.lastID,
                name: userInfo.nickName,
                role: 'user',
                phone: '',
                avatarUrl: userInfo.avatarUrl || ''
              },
              isNewUser: true
            }
          });
        }
      );
    });

  } catch (error) {
    console.error('登录处理异常:', error);
    res.status(500).json({
      code: 500,
      msg: '服务器内部错误'
    });
  }
});

// Token生成函数（实际项目使用JWT等安全方式）
function generateToken(userId) {
  const timestamp = Date.now();
  // 简单加密组合（生产环境需使用JWT+密钥）
  return Buffer.from(`${userId}-${timestamp}`).toString('base64');
}

// Token验证中间件
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ code: 401, msg: '未授权访问' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [userId] = decoded.split('-');
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, msg: '无效的Token' });
  }
}

// 验证Token有效性接口
router.get('/wx/checkToken', verifyToken, (req, res) => {
  res.json({ code: 200, msg: 'Token有效' });
});

module.exports = router;
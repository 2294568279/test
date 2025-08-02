const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT, -- 新增字段：手机号码
      openid TEXT UNIQUE, -- 新增字段：微信openid
      avatar_url TEXT, -- 新增字段：头像URL
      device TEXT, -- 新增字段：设备资源
      usage_time TEXT -- 新增字段：设备使用时间段
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Users table created.');
        // Insert test data into the database
        db.run(`INSERT OR IGNORE INTO users (name, role, phone, openid, avatar_url, device, usage_time) VALUES 
          ('张三', '学生', '13800138001', 'openid_001', '', '显微镜', '上午（8:00-12:00）'),
          ('李四', '教师', '13800138002', 'openid_002', '', '高温炉', '下午（13:00-17:00）'),
          ('王五', '研究员', '13800138003', 'openid_003', '', '电镜', '晚上（18:00-21:00）'),
          ('赵六', '工程师', '13800138004', 'openid_004', '', '3D打印机', '上午（8:00-12:00）'),
          ('admin', 'admin', '13800138000', 'admin_openid', '', '', '')`, (err) => {
          if (err) {
            console.error('Error inserting test data:', err.message);
          } else {
            console.log('Test data inserted successfully.');
          }
        });
      }
    });

    // 创建用户设备权限表
    db.run(`CREATE TABLE IF NOT EXISTS user_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (device_id) REFERENCES devices (id),
      UNIQUE(user_id, device_id)
    )`, (err) => {
      if (err) {
        console.error('Error creating user_devices table:', err.message);
      } else {
        console.log('User_devices table created.');
      }
    });

    // 创建实验室设备表
    db.run(`CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating devices table:', err.message);
      } else {
        console.log('Devices table created.');
        // 插入测试数据
        db.run(`INSERT INTO devices (name) VALUES 
          ('显微镜'),
          ('高温炉'),
          ('电镜'),
          ('3D打印机')`, (err) => {
          if (err) {
            console.error('Error inserting devices data:', err.message);
          } else {
            console.log('Devices test data inserted successfully.');
          }
        });
      }
    });

    // 创建预约表
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device TEXT NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating reservations table:', err.message);
      } else {
        console.log('Reservations table created.');
      }
    });
  }
});

// 修改微信登录接口，支持openid检测
app.post('/api/wx/login', (req, res) => {
  console.log('收到登录请求:', req.body);
  const { code, userInfo } = req.body;

  if (!code || !userInfo) {
    console.log('登录请求参数不完整');
    return res.status(400).json({ code: 400, msg: 'Invalid request' });
  }

  // 模拟获取openid（实际项目中需要调用微信API）
  const mockOpenid = `openid_${code.slice(-6)}`;
  const { nickName, avatarUrl } = userInfo;
  console.log('生成的openid:', mockOpenid);

  // 检查用户是否已存在（通过openid）
  db.get('SELECT * FROM users WHERE openid = ?', [mockOpenid], (err, row) => {
    if (err) {
      console.log('数据库查询错误:', err);
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }

    console.log('数据库查询结果:', row);

    if (row) {
      // 用户已存在，直接返回用户信息
      const responseData = {
        code: 200,
        data: {
          token: `mock-token-${row.id}`,
          userInfo: { 
            id: row.id, 
            name: row.name, 
            role: row.role, 
            phone: row.phone,
            avatarUrl: row.avatar_url
          },
          isNewUser: false
        }
      };
      console.log('返回已存在用户信息:', responseData);
      return res.json(responseData);
    }

    // 用户不存在，创建新用户（角色默认为user）
    console.log('创建新用户:', nickName, mockOpenid);
    db.run(`INSERT INTO users (name, role, openid, avatar_url) VALUES (?, ?, ?, ?)`, 
      [nickName, 'user', mockOpenid, avatarUrl || ''], function(err) {
      if (err) {
        console.log('创建用户失败:', err);
        return res.status(500).json({ code: 500, msg: 'Database error' });
      }

      const responseData = {
        code: 200,
        data: {
          token: `mock-token-${this.lastID}`,
          userInfo: { 
            id: this.lastID, 
            name: nickName, 
            role: 'user', 
            phone: '',
            avatarUrl: avatarUrl || ''
          },
          isNewUser: true
        }
      };
      console.log('返回新用户信息:', responseData);
      res.json(responseData);
    });
  });
});

// 新增接口：更新用户设备和使用时间段
app.put('/api/users/:id/device', (req, res) => {
  const { id } = req.params;
  const { device, usage_time } = req.body;

  if (!device || !usage_time) {
    return res.status(400).json({ code: 400, msg: 'Invalid request' });
  }

  db.run(`UPDATE users SET device = ?, usage_time = ? WHERE id = ?`, [device, usage_time, id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ code: 404, msg: 'User not found' });
    }

    res.json({
      code: 200,
      msg: 'User device and usage time updated successfully'
    });
  });
});

// 更新用户信息
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, role } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ code: 400, msg: 'Invalid request' });
  }

  db.run(`UPDATE users SET name = ?, phone = ?, role = ? WHERE id = ?`, [name, phone, role || 'user', id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ code: 404, msg: 'User not found' });
    }

    res.json({ code: 200, msg: 'User updated successfully' });
  });
});

// 新增接口：获取所有用户
app.get('/api/users', (req, res) => {
  const { name } = req.query;
  const query = name ? 'SELECT * FROM users WHERE name LIKE ?' : 'SELECT * FROM users';
  const params = name ? [`%${name}%`] : [];

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }
    res.json({ code: 200, data: rows.map(row => row.name) }); // 返回用户名称数组
  });
});

// 新增接口：获取单个用户
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ code: 404, msg: 'User not found' });
    }
    res.json({ code: 200, data: row });
  });
});

// 新增接口：删除用户
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ code: 404, msg: 'User not found' });
    }
    res.json({ code: 200, msg: 'User deleted successfully' });
  });
});

// 获取设备列表
app.get('/api/devices', (req, res) => {
  db.all('SELECT * FROM devices', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }
    res.json({ code: 200, data: rows });
  });
});

// 提交预约信息
app.post('/api/reservations', (req, res) => {
  const { device, name, date, time } = req.body;

  if (!device || !name || !date || !time) {
    return res.status(400).json({ code: 400, msg: 'Invalid request' });
  }

  // 检查是否存在冲突的预约
  db.get('SELECT * FROM reservations WHERE device = ? AND date = ? AND time = ?', [device, date, time], (err, row) => {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }

    if (row) {
      // 存在冲突的预约
      return res.status(409).json({ code: 409, msg: 'This time slot is already reserved' });
    }

    // 插入新的预约记录
    db.run(`INSERT INTO reservations (device, name, date, time) VALUES (?, ?, ?, ?)`,
      [device, name, date, time],
      function(err) {
        if (err) {
          return res.status(500).json({ code: 500, msg: 'Database error' });
        }
        res.json({ code: 200, msg: 'Reservation successful', reservationId: this.lastID });
      }
    );
  });
});

// 管理员API：获取所有用户
app.get('/api/admin/users', (req, res) => {
  db.all('SELECT id, name, role, phone FROM users WHERE role != "admin"', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }
    res.json({ code: 200, data: rows });
  });
});

// 管理员API：获取用户的设备权限
app.get('/api/admin/user-devices/:userId', (req, res) => {
  const { userId } = req.params;
  db.all('SELECT device_id FROM user_devices WHERE user_id = ?', [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }
    const deviceIds = rows.map(row => row.device_id);
    res.json({ code: 200, data: deviceIds });
  });
});

// 管理员API：管理用户设备权限
app.post('/api/admin/user-devices', (req, res) => {
  const { userId, deviceId, action } = req.body;

  if (!userId || !deviceId || !action) {
    return res.status(400).json({ code: 400, msg: 'Invalid request' });
  }

  if (action === 'add') {
    db.run('INSERT OR IGNORE INTO user_devices (user_id, device_id) VALUES (?, ?)', [userId, deviceId], function(err) {
      if (err) {
        return res.status(500).json({ code: 500, msg: 'Database error' });
      }
      res.json({ code: 200, msg: 'Device permission added' });
    });
  } else if (action === 'remove') {
    db.run('DELETE FROM user_devices WHERE user_id = ? AND device_id = ?', [userId, deviceId], function(err) {
      if (err) {
        return res.status(500).json({ code: 500, msg: 'Database error' });
      }
      res.json({ code: 200, msg: 'Device permission removed' });
    });
  } else {
    res.status(400).json({ code: 400, msg: 'Invalid action' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// 设备管理接口
// 新增设备
app.post('/api/admin/devices', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ code: 400, msg: '设备名称不能为空' });

  db.run('INSERT INTO devices (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(500).json({ code: 500, msg: 'Database error' });
    res.json({ code: 200, msg: '设备添加成功', id: this.lastID });
  });
});

// 修改设备
app.put('/api/admin/devices/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ code: 400, msg: '设备名称不能为空' });

  db.run('UPDATE devices SET name = ? WHERE id = ?', [name, id], function(err) {
    if (err) return res.status(500).json({ code: 500, msg: 'Database error' });
    res.json({ code: 200, msg: '设备修改成功' });
  });
});

// 删除设备
app.delete('/api/admin/devices/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM devices WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ code: 500, msg: 'Database error' });
    res.json({ code: 200, msg: '设备删除成功' });
  });
});

// 预约管理接口
// 获取所有预约
app.get('/api/admin/reservations', (req, res) => {
  const { date, device } = req.query;
  let query = 'SELECT * FROM reservations';
  const params = [];
  
  if (date || device) {
    query += ' WHERE';
    if (date) {
      query += ' date = ?';
      params.push(date);
    }
    if (device) {
      if (params.length > 0) query += ' AND';
      query += ' device = ?';
      params.push(device);
    }
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ code: 500, msg: 'Database error' });
    res.json({ code: 200, data: rows });
  });
});

// 取消预约
app.delete('/api/admin/reservations/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM reservations WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ code: 500, msg: 'Database error' });
    res.json({ code: 200, msg: '预约已取消' });
  });
});
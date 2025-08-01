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
      device TEXT, -- 新增字段：设备资源
      usage_time TEXT -- 新增字段：设备使用时间段
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Users table created.');
        // Insert test data into the database
        db.run(`INSERT INTO users (name, role, device, usage_time) VALUES 
          ('张三', '学生', '显微镜', '上午（8:00-12:00）'),
          ('李四', '教师', '高温炉', '下午（13:00-17:00）'),
          ('王五', '研究员', '电镜', '晚上（18:00-21:00）'),
          ('赵六', '工程师', '3D打印机', '上午（8:00-12:00）')`, (err) => {
          if (err) {
            console.error('Error inserting test data:', err.message);
          } else {
            console.log('Test data inserted successfully.');
          }
        });
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

// API Endpoints
app.post('/api/wx/login', (req, res) => {
  const { code, userInfo } = req.body;

  if (!code || !userInfo) {
    return res.status(400).json({ code: 400, msg: 'Invalid request' });
  }

  const { nickName, role = 'user' } = userInfo;

  // 检查用户是否已存在
  db.get('SELECT * FROM users WHERE name = ?', [nickName], (err, row) => {
    if (err) {
      return res.status(500).json({ code: 500, msg: 'Database error' });
    }

    if (row) {
      // 用户已存在，直接返回用户信息
      return res.json({
        code: 200,
        data: {
          token: `mock-token-${row.id}`,
          userInfo: { id: row.id, name: row.name, role: row.role }
        }
      });
    }

    // 用户不存在，插入新记录
    db.run(`INSERT INTO users (name, role) VALUES (?, ?)`, [nickName, role], function(err) {
      if (err) {
        return res.status(500).json({ code: 500, msg: 'Database error' });
      }

      res.json({
        code: 200,
        data: {
          token: `mock-token-${this.lastID}`,
          userInfo: { id: this.lastID, name: nickName, role }
        }
      });
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

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

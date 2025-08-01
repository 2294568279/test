const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE users (
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

  // Simulate user login and role assignment
  const { nickName, role = 'user' } = userInfo;

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

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

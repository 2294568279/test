// 在数据库连接成功后执行初始化脚本
const fs = require('fs');
const sql = fs.readFileSync('./init-db.sql', 'utf8');

db.exec(sql, (err) => {
  if (err) {
    console.error('初始化数据库失败:', err.message);
  } else {
    console.log('数据库表结构和测试数据初始化完成');
  }
});
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库文件路径
const dbPath = join(__dirname, '..', 'database.sqlite');

// 初始化SQL文件路径
const initSqlPath = join(__dirname, '..', 'init.sql');

// 创建数据库连接
const db = new sqlite3.Database(dbPath);

// 初始化数据库
try {
  const initSql = fs.readFileSync(initSqlPath, 'utf8');
  console.log('读取到初始化SQL:', initSql);
  
  db.exec(initSql, (err) => {
    if (err) {
      console.error('数据库初始化失败:', err);
      console.error('错误堆栈:', err.stack);
      process.exit(1);
    } else {
      console.log('数据库初始化成功');
    }
  });
} catch (error) {
  console.error('读取初始化SQL文件失败:', error);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}

// 添加错误处理
db.on('error', (err) => {
  console.error('数据库错误:', err);
  console.error('错误堆栈:', err.stack);
});

// 包装数据库方法，使其返回Promise
const dbAsync = {
  get: (sql, params) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run: (sql, params) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

export default dbAsync; 
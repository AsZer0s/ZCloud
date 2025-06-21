import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从环境变量获取配置
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const DB_PATH = process.env.DB_PATH || './database.sqlite';
const DB_TIMEOUT = parseInt(process.env.DB_TIMEOUT) || 30000;

// 中间件
app.use(cors({
  origin: function (origin, callback) {
    // 允许没有origin的请求（比如移动应用或Postman）
    if (!origin) return callback(null, true);
    
    // 允许localhost的任何端口
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return callback(null, true);
    }
    
    // 允许特定的生产域名（如果有的话）
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite默认端口
      'http://localhost:8080', // 其他常见端口
      'http://www.asben.net:1239',
      'https://www.asben.net:1239',
      CORS_ORIGIN
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// 数据库路径
const dbPath = join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
    initDatabase();
  }
});

// 初始化数据库表
function initDatabase() {
  console.log('开始初始化数据库表...');
  
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'agent', 'user')),
    email TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('创建用户表失败:', err.message);
    } else {
      console.log('用户表创建成功');
      
      // 授权码表
      db.run(`CREATE TABLE IF NOT EXISTS auth_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_value TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        days INTEGER DEFAULT 30,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) {
          console.error('创建授权码表失败:', err.message);
        } else {
          console.log('授权码表创建成功');
          
          // 微信账号表
          db.run(`CREATE TABLE IF NOT EXISTS wechat_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            auth_key TEXT UNIQUE NOT NULL,
            device_auth_key TEXT,
            nickname TEXT,
            username TEXT,
            avatar TEXT,
            status TEXT DEFAULT 'waiting' CHECK(status IN ('online', 'offline', 'waiting', 'scanning')),
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            qr_code_url TEXT,
            FOREIGN KEY (auth_key) REFERENCES auth_keys (key_value)
          )`, (err) => {
            if (err) {
              console.error('创建微信账号表失败:', err.message);
            } else {
              console.log('微信账号表创建成功');
              
              // 设备表
              db.run(`CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_name TEXT NOT NULL,
                auth_key TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                status TEXT DEFAULT 'offline',
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (auth_key) REFERENCES auth_keys (key_value)
              )`, (err) => {
                if (err) {
                  console.error('创建设备表失败:', err.message);
                } else {
                  console.log('设备表创建成功');
                  
                  // 创建默认管理员账户
                  createDefaultAdmin();
                }
              });
            }
          });
        }
      });
    }
  });
}

// 创建默认管理员账户
function createDefaultAdmin() {
  const adminPassword = bcrypt.hashSync('admin123', BCRYPT_ROUNDS);
  
  db.run(`INSERT OR IGNORE INTO users (username, password, role, email) 
          VALUES ('admin', ?, 'admin', 'admin@example.com')`, [adminPassword], function(err) {
    if (err) {
      console.error('创建默认管理员账户失败:', err.message);
    } else {
      if (this.changes > 0) {
        console.log('默认管理员账户创建成功');
      } else {
        console.log('默认管理员账户已存在');
      }
      console.log('数据库初始化完成');
    }
  });
}

// 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 角色验证中间件
function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('登录查询失败:', err.message);
      return res.status(500).json({ error: '服务器错误' });
    }
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      }
    });
  });
});

// 注册接口
app.post('/api/register', (req, res) => {
  const { username, password, email, role = 'user' } = req.body;

  if (!['admin', 'agent', 'user'].includes(role)) {
    return res.status(400).json({ error: '无效的角色' });
  }

  const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);

  db.run(
    'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, email, role],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '用户名已存在' });
        }
        return res.status(500).json({ error: '服务器错误' });
      }

      res.json({ message: '注册成功', userId: this.lastID });
    }
  );
});

// 生成授权码接口
app.post('/api/admin/gen-auth-key', authenticateToken, requireRole(['admin']), (req, res) => {
  const { count = 1, days = 30 } = req.body;
  const keys = [];

  for (let i = 0; i < count; i++) {
    const keyValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    db.run(
      'INSERT INTO auth_keys (key_value, user_id, days, expires_at) VALUES (?, ?, ?, ?)',
      [keyValue, req.user.id, days, expiresAt.toISOString()],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '生成授权码失败' });
        }
        keys.push(keyValue);
        
        if (keys.length === count) {
          res.json({ keys, count, days });
        }
      }
    );
  }
});

// 获取授权码列表
app.get('/api/admin/auth-keys', authenticateToken, requireRole(['admin']), (req, res) => {
  db.all(`
    SELECT ak.*, u.username as owner_name 
    FROM auth_keys ak 
    LEFT JOIN users u ON ak.user_id = u.id 
    ORDER BY ak.created_at DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取授权码列表失败' });
    }
    res.json(rows);
  });
});

// 删除授权码
app.delete('/api/admin/auth-key/:key', authenticateToken, requireRole(['admin']), (req, res) => {
  const { key } = req.params;

  db.run('DELETE FROM auth_keys WHERE key_value = ?', [key], function(err) {
    if (err) {
      return res.status(500).json({ error: '删除授权码失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '授权码不存在' });
    }
    res.json({ message: '删除成功' });
  });
});

// 延期授权码
app.post('/api/admin/delay-auth-key', authenticateToken, requireRole(['admin']), (req, res) => {
  const { key, days } = req.body;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  db.run(
    'UPDATE auth_keys SET days = ?, expires_at = ? WHERE key_value = ?',
    [days, expiresAt.toISOString(), key],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '延期失败' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '授权码不存在' });
      }
      res.json({ message: '延期成功' });
    }
  );
});

// 获取微信账号列表
app.get('/api/admin/wechat-accounts', authenticateToken, requireRole(['admin']), (req, res) => {
  db.all(`
    SELECT wa.*, ak.days, ak.expires_at, u.username as owner_name 
    FROM wechat_accounts wa 
    LEFT JOIN auth_keys ak ON wa.auth_key = ak.key_value
    LEFT JOIN users u ON ak.user_id = u.id 
    ORDER BY wa.created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('获取微信账号列表失败:', err.message);
      return res.status(500).json({ error: '获取微信账号列表失败' });
    }
    res.json(rows);
  });
});

// 创建微信账号
app.post('/api/admin/wechat-accounts', authenticateToken, requireRole(['admin']), (req, res) => {
  const { nickname, days = 30, auth_key, username, avatar, status, device_auth_key } = req.body;
  
  // 如果提供了auth_key，说明是更新已存在的账号
  if (auth_key) {
    // 查找是否已存在该授权码的账号
    db.get('SELECT id FROM wechat_accounts WHERE auth_key = ?', [auth_key], (err, existingAccount) => {
      if (err) {
        console.error('查询账号失败:', err.message);
        return res.status(500).json({ error: '查询账号失败' });
      }
      
      if (existingAccount) {
        // 更新现有账号信息
        db.run(
          'UPDATE wechat_accounts SET nickname = ?, username = ?, avatar = ?, status = ?, device_auth_key = ?, last_login = ?, updated_at = ? WHERE auth_key = ?',
          [nickname, username, avatar, status || 'online', device_auth_key, new Date().toISOString(), new Date().toISOString(), auth_key],
          function(err) {
            if (err) {
              console.error('更新微信账号失败:', err.message);
              return res.status(500).json({ error: '更新微信账号失败' });
            }
            res.json({ 
              message: '微信账号信息更新成功',
              account: {
                id: existingAccount.id,
                auth_key: auth_key,
                device_auth_key: device_auth_key,
                nickname: nickname,
                username: username,
                avatar: avatar,
                status: status || 'online'
              }
            });
          }
        );
      } else {
        // 创建新的微信账号记录
        db.run(
          'INSERT INTO wechat_accounts (auth_key, device_auth_key, nickname, username, avatar, status) VALUES (?, ?, ?, ?, ?, ?)',
          [auth_key, device_auth_key, nickname, username, avatar, status || 'online'],
          function(err) {
            if (err) {
              console.error('创建微信账号失败:', err.message);
              return res.status(500).json({ error: '创建微信账号失败' });
            }
            
            res.json({ 
              message: '微信账号创建成功',
              account: {
                id: this.lastID,
                auth_key: auth_key,
                device_auth_key: device_auth_key,
                nickname: nickname,
                username: username,
                avatar: avatar,
                status: status || 'online'
              }
            });
          }
        );
      }
    });
  } else {
    // 原有的创建新账号逻辑
    // 1. 生成授权码
    const keyValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // 2. 插入授权码
    db.run(
      'INSERT INTO auth_keys (key_value, user_id, days, expires_at) VALUES (?, ?, ?, ?)',
      [keyValue, req.user.id, days, expiresAt.toISOString()],
      function(err) {
        if (err) {
          console.error('创建授权码失败:', err.message);
          return res.status(500).json({ error: '创建授权码失败' });
        }
        
        // 3. 创建微信账号记录
        db.run(
          'INSERT INTO wechat_accounts (auth_key, nickname, status) VALUES (?, ?, ?)',
          [keyValue, nickname || '新微信账号', 'waiting'],
          function(err) {
            if (err) {
              console.error('创建微信账号失败:', err.message);
              return res.status(500).json({ error: '创建微信账号失败' });
            }
            
            res.json({ 
              message: '微信账号创建成功',
              account: {
                id: this.lastID,
                auth_key: keyValue,
                nickname: nickname || '新微信账号',
                status: 'waiting',
                days: days
              }
            });
          }
        );
      }
    );
  }
});

// 删除微信账号
app.delete('/api/admin/wechat-accounts/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  
  // 先获取账号信息
  db.get('SELECT auth_key FROM wechat_accounts WHERE id = ?', [id], (err, account) => {
    if (err) {
      return res.status(500).json({ error: '查询账号失败' });
    }
    if (!account) {
      return res.status(404).json({ error: '微信账号不存在' });
    }
    
    // 删除微信账号
    db.run('DELETE FROM wechat_accounts WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除微信账号失败' });
      }
      
      // 删除对应的授权码
      db.run('DELETE FROM auth_keys WHERE key_value = ?', [account.auth_key], function(err) {
        if (err) {
          console.error('删除授权码失败:', err.message);
        }
        res.json({ message: '微信账号删除成功' });
      });
    });
  });
});

// 更新微信账号状态
app.put('/api/admin/wechat-accounts/:id/status', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { status, nickname, username, avatar, qr_code_url } = req.body;
  
  const updates = [];
  const values = [];
  
  if (status) {
    updates.push('status = ?');
    values.push(status);
  }
  if (nickname) {
    updates.push('nickname = ?');
    values.push(nickname);
  }
  if (username) {
    updates.push('username = ?');
    values.push(username);
  }
  if (avatar) {
    updates.push('avatar = ?');
    values.push(avatar);
  }
  if (qr_code_url) {
    updates.push('qr_code_url = ?');
    values.push(qr_code_url);
  }
  
  if (status === 'online') {
    updates.push('last_login = ?');
    values.push(new Date().toISOString());
  }
  
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  
  values.push(id);
  
  db.run(
    `UPDATE wechat_accounts SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        console.error('更新微信账号失败:', err.message);
        return res.status(500).json({ error: '更新微信账号失败' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '微信账号不存在' });
      }
      res.json({ message: '更新成功' });
    }
  );
});

// 获取微信账号详情
app.get('/api/admin/wechat-accounts/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  
  db.get(`
    SELECT wa.*, ak.days, ak.expires_at, u.username as owner_name 
    FROM wechat_accounts wa 
    LEFT JOIN auth_keys ak ON wa.auth_key = ak.key_value
    LEFT JOIN users u ON ak.user_id = u.id 
    WHERE wa.id = ?
  `, [id], (err, account) => {
    if (err) {
      return res.status(500).json({ error: '获取账号详情失败' });
    }
    if (!account) {
      return res.status(404).json({ error: '微信账号不存在' });
    }
    res.json(account);
  });
});

// 唤醒登录接口
app.post('/api/wechat/wakeup-login', authenticateToken, (req, res) => {
  const { auth_key } = req.body;
  
  if (!auth_key) {
    return res.status(400).json({ error: '缺少授权码参数' });
  }
  
  // 查找微信账号
  db.get('SELECT * FROM wechat_accounts WHERE auth_key = ?', [auth_key], (err, account) => {
    if (err) {
      console.error('查询微信账号失败:', err.message);
      return res.status(500).json({ error: '查询账号失败' });
    }
    
    if (!account) {
      return res.status(404).json({ error: '微信账号不存在' });
    }
    
    if (!account.device_auth_key) {
      return res.status(400).json({ error: '该账号未绑定设备，请先扫码登录' });
    }
    
    // 调用外部API进行唤醒登录
    fetch('http://www.asben.net:1239/login/WakeUpLogin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: account.device_auth_key
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log('唤醒登录响应:', data);
      
      if (data.Code === 200) {
        // 更新账号状态
        db.run(
          'UPDATE wechat_accounts SET status = ?, last_login = ?, updated_at = ? WHERE auth_key = ?',
          ['online', new Date().toISOString(), new Date().toISOString(), auth_key],
          function(err) {
            if (err) {
              console.error('更新账号状态失败:', err.message);
            }
          }
        );
        
        res.json({
          success: true,
          message: '唤醒登录成功',
          data: data.Data
        });
      } else {
        res.status(400).json({
          success: false,
          message: '唤醒登录失败',
          error: data.Message || '未知错误'
        });
      }
    })
    .catch(error => {
      console.error('唤醒登录请求失败:', error);
      res.status(500).json({
        success: false,
        message: '唤醒登录请求失败',
        error: error.message
      });
    });
  });
});

// 获取用户列表
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), (req, res) => {
  db.all('SELECT id, username, role, email, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取用户列表失败' });
    }
    res.json(rows);
  });
});

// 获取当前用户信息
app.get('/api/user/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, username, role, email, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '获取用户信息失败' });
    }
    res.json(user);
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`🚀 服务器运行在 http://${HOST}:${PORT}`);
  console.log(`📊 健康检查: http://${HOST}:${PORT}/health`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT密钥: ${JWT_SECRET.substring(0, 10)}...`);
}); 
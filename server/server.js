import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import db from './config/database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
const envPath = join(__dirname, '..', 'emv');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('emv file not found, using default values');
}

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'user-id'],
  credentials: true
}));
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);

// 添加用户计数路由
app.get('/api/users/count', async (req, res) => {
  try {
    const result = await db.all('SELECT COUNT(*) as count FROM users');
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('获取用户数量失败:', error);
    res.status(500).json({ error: '获取用户数量失败' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 管理员权限验证中间件
const adminAuth = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
  } catch (error) {
    console.error('权限验证失败:', error);
    res.status(500).json({ error: '权限验证失败' });
  }
};

// 获取所有用户
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 获取所有设备及归属用户
app.get('/api/admin/devices', adminAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT d.*, u.username as owner_name
      FROM devices d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('获取设备列表失败:', err);
    res.status(500).json({ error: '获取设备列表失败' });
  }
});

// 获取所有微信账号
app.get('/api/admin/wechat-accounts', adminAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT wa.*, u.username as owner_name
      FROM wechat_accounts wa
      LEFT JOIN auth_keys ak ON wa.auth_key = ak.key_value
      LEFT JOIN users u ON ak.user_id = u.id
      ORDER BY wa.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('获取微信账号列表失败:', err);
    res.status(500).json({ error: '获取微信账号列表失败' });
  }
});

// 获取所有授权码
app.get('/api/admin/auth-keys', adminAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT ak.*, u.username as owner_name
      FROM auth_keys ak
      LEFT JOIN users u ON ak.user_id = u.id
      ORDER BY ak.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('获取授权码列表失败:', err);
    res.status(500).json({ error: '获取授权码列表失败' });
  }
});

// 更新用户信息
app.put('/api/admin/users/:userId', adminAuth, async (req, res) => {
  const { userId } = req.params;
  const { username, email, role, phone } = req.body;

  try {
    // 检查用户名是否已被其他用户使用
    const existingUser = await db.get(
      'SELECT * FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );
    if (existingUser) {
      return res.status(400).json({ error: '用户名已被使用' });
    }

    // 检查邮箱是否已被其他用户使用
    const existingEmail = await db.get(
      'SELECT * FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    if (existingEmail) {
      return res.status(400).json({ error: '邮箱已被使用' });
    }

    // 更新用户信息
    await db.run(
      `UPDATE users 
       SET username = ?, email = ?, role = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [username, email, role, phone, userId]
    );

    res.json({ message: '用户信息更新成功' });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 删除用户
app.delete('/api/admin/users/:userId', adminAuth, async (req, res) => {
  const { userId } = req.params;

  try {
    // 检查是否是最后一个管理员
    const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    if (user.role === 'admin') {
      const adminCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: '不能删除最后一个管理员' });
      }
    }

    // 删除用户相关的所有数据
    await db.run('BEGIN TRANSACTION');
    try {
      // 删除用户的设备
      await db.run('DELETE FROM devices WHERE user_id = ?', [userId]);
      // 删除用户的微信账号
      await db.run('DELETE FROM wechat_accounts WHERE user_id = ?', [userId]);
      // 删除用户的授权码
      await db.run('DELETE FROM auth_keys WHERE user_id = ?', [userId]);
      // 删除用户
      await db.run('DELETE FROM users WHERE id = ?', [userId]);
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 用户权限验证中间件
const userAuth = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('权限验证失败:', error);
    res.status(500).json({ error: '权限验证失败' });
  }
};

// 获取用户的微信账号列表
app.get('/api/wechat-accounts', userAuth, (req, res) => {
  console.log('收到获取微信账号列表请求:', {
    userId: req.user.id,
    headers: {
      'user-id': req.headers['user-id'],
      'authorization': req.headers['authorization'] ? 'Bearer [已隐藏]' : undefined
    }
  });

  const startTime = Date.now();
  
  db.all(`
    SELECT wa.*, ak.days, ak.expires_at
    FROM wechat_accounts wa
    LEFT JOIN auth_keys ak ON wa.auth_key = ak.key_value
    WHERE wa.user_id = ?
    ORDER BY wa.created_at DESC
  `, [req.user.id], (err, accounts) => {
    const endTime = Date.now();
    console.log('数据库查询完成:', {
      duration: `${endTime - startTime}ms`,
      error: err ? err.message : null,
      accountCount: accounts ? accounts.length : 0
    });

    if (err) {
      console.error('获取微信账号列表失败:', {
        error: err.message,
        stack: err.stack,
        userId: req.user.id
      });
      return res.status(500).json({ error: '获取微信账号列表失败' });
    }

    console.log('成功获取微信账号列表:', {
      userId: req.user.id,
      accountCount: accounts.length
    });
    
    res.json(accounts);
  });
});

// 获取单个微信账号详情
app.get('/api/wechat-accounts/:id', userAuth, (req, res) => {
  db.get(
    'SELECT * FROM wechat_accounts WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, account) => {
      if (err) {
        console.error('获取微信账号详情失败:', err.message);
        return res.status(500).json({ error: '获取微信账号详情失败' });
      }
      if (!account) {
        return res.status(404).json({ error: '微信账号不存在' });
      }
      res.json(account);
    }
  );
});

// 删除微信账号
app.delete('/api/wechat-accounts/:id', userAuth, (req, res) => {
  db.run(
    'DELETE FROM wechat_accounts WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function(err) {
      if (err) {
        console.error('删除微信账号失败:', err.message);
        return res.status(500).json({ error: '删除微信账号失败' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '微信账号不存在' });
      }
      res.json({ message: '微信账号删除成功' });
    }
  );
});

// 更新微信账号状态
app.put('/api/wechat-accounts/:id/status', userAuth, (req, res) => {
  const { status, qr_code_url } = req.body;
  
  if (!status && !qr_code_url) {
    return res.status(400).json({ error: '缺少更新参数' });
  }
  
  const updates = [];
  const params = [];
  
  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  
  if (qr_code_url) {
    updates.push('qr_code_url = ?');
    params.push(qr_code_url);
  }
  
  params.push(new Date().toISOString()); // for updated_at
  params.push(req.params.id);
  params.push(req.user.id);
  
  db.run(
    `UPDATE wechat_accounts SET ${updates.join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`,
    params,
    function(err) {
      if (err) {
        console.error('更新微信账号状态失败:', err.message);
        return res.status(500).json({ error: '更新微信账号状态失败' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '微信账号不存在' });
      }
      res.json({ message: '微信账号状态更新成功' });
    }
  );
});

// 微信扫码登录 - 请求获取二维码
app.post('/api/wechat/wakeup-login', userAuth, async (req, res) => {
  const { auth_key } = req.body;
  const userId = req.user.id;

  if (!auth_key) {
    return res.status(400).json({ error: '缺少 auth_key 参数' });
  }

  try {
    // 1. 验证 auth_key 是否属于当前用户并且存在
    const account = await db.get(
      'SELECT id FROM wechat_accounts WHERE auth_key = ? AND user_id = ?',
      [auth_key, userId]
    );

    if (!account) {
      return res.status(404).json({ error: '无效的 auth_key 或微信账号不存在' });
    }

    // 2. 模拟从微信API获取二维码
    // In a real scenario, this would involve an API call to WeChat.
    // For now, we'll generate a placeholder URL and set status to 'scanning'.
    const simulatedQrCodeUrl = `https://example.com/qr/${uuidv4()}.png`; // Placeholder QR code
    const newStatus = 'scanning';

    // 3. 更新数据库中的 qr_code_url 和 status
    await db.run(
      'UPDATE wechat_accounts SET qr_code_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE auth_key = ? AND user_id = ?',
      [simulatedQrCodeUrl, newStatus, auth_key, userId]
    );

    console.log(`Wakeup login initiated for auth_key: ${auth_key}, QR URL: ${simulatedQrCodeUrl}`);
    res.json({
      message: '请扫描二维码登录',
      qr_code_url: simulatedQrCodeUrl,
      auth_key: auth_key,
      status: newStatus
    });

  } catch (error) {
    console.error('微信扫码登录失败:', error);
    res.status(500).json({ error: '微信扫码登录失败: ' + error.message });
  }
});

// Simulate user scanning the QR code
app.post('/api/wechat/simulate-scan/:auth_key', userAuth, async (req, res) => {
  const { auth_key } = req.params;
  const userId = req.user.id;
  const newStatus = 'scanned_confirming';

  try {
    const account = await db.get(
      'SELECT id, status FROM wechat_accounts WHERE auth_key = ? AND user_id = ?',
      [auth_key, userId]
    );

    if (!account) {
      return res.status(404).json({ error: '微信账号不存在' });
    }

    if (account.status !== 'scanning') {
      return res.status(400).json({ error: `微信账号状态为 ${account.status}, 不能模拟扫描. 必须为 'scanning'.` });
    }

    await db.run(
      'UPDATE wechat_accounts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE auth_key = ? AND user_id = ?',
      [newStatus, auth_key, userId]
    );

    console.log(`Simulated scan for auth_key: ${auth_key}, status changed to ${newStatus}`);
    res.json({ message: '模拟扫描成功, 等待用户确认', auth_key, status: newStatus });
  } catch (error) {
    console.error('模拟扫描失败:', error);
    res.status(500).json({ error: '模拟扫描失败: ' + error.message });
  }
});

// Simulate user confirming login on phone
app.post('/api/wechat/simulate-confirm/:auth_key', userAuth, async (req, res) => {
  const { auth_key } = req.params;
  const { success } = req.body; // success: boolean
  const userId = req.user.id;
  const newStatus = success ? 'online' : 'failed';

  try {
    const account = await db.get(
      'SELECT id, status FROM wechat_accounts WHERE auth_key = ? AND user_id = ?',
      [auth_key, userId]
    );

    if (!account) {
      return res.status(404).json({ error: '微信账号不存在' });
    }

    if (account.status !== 'scanned_confirming') {
      return res.status(400).json({ error: `微信账号状态为 ${account.status}, 不能模拟确认. 必须为 'scanned_confirming'.` });
    }

    let updateQuery;
    const queryParams = [];

    if (success) {
      const simulatedDeviceAuthKey = `sim_dak_${uuidv4()}`; // Simulated device_auth_key
      updateQuery = 'UPDATE wechat_accounts SET status = ?, last_login = CURRENT_TIMESTAMP, device_auth_key = ?, updated_at = CURRENT_TIMESTAMP WHERE auth_key = ? AND user_id = ?';
      queryParams.push(newStatus, simulatedDeviceAuthKey, auth_key, userId);
      console.log(`Simulated confirm for auth_key: ${auth_key}, success: ${success}, status changed to ${newStatus}, device_auth_key: ${simulatedDeviceAuthKey}`);
      res.json({ message: `模拟确认成功, 状态: ${newStatus}`, auth_key, status: newStatus, device_auth_key: simulatedDeviceAuthKey });
    } else {
      updateQuery = 'UPDATE wechat_accounts SET status = ?, device_auth_key = NULL, updated_at = CURRENT_TIMESTAMP WHERE auth_key = ? AND user_id = ?'; // Clear device_auth_key on failure
      queryParams.push(newStatus, auth_key, userId);
      console.log(`Simulated confirm for auth_key: ${auth_key}, success: ${success}, status changed to ${newStatus}`);
      res.json({ message: `模拟确认成功, 状态: ${newStatus}`, auth_key, status: newStatus });
    }

    await db.run(updateQuery, queryParams);
  } catch (error) {
    console.error('模拟确认失败:', error);
    res.status(500).json({ error: '模拟确认失败: ' + error.message });
  }
});


// 创建微信账号（普通用户）
app.post('/api/wechat-accounts', userAuth, (req, res) => {
  const { nickname, days = 30, auth_key, username, avatar, status, device_auth_key } = req.body;
  
  // 如果提供了auth_key，说明是更新已存在的账号
  if (auth_key) {
    // 查找是否已存在该授权码的账号
    db.get('SELECT id FROM wechat_accounts WHERE auth_key = ? AND user_id = ?', [auth_key, req.user.id], (err, existingAccount) => {
      if (err) {
        console.error('查询账号失败:', err.message);
        return res.status(500).json({ error: '查询账号失败' });
      }
      
      if (existingAccount) {
        // 更新现有账号信息
        db.run(
          'UPDATE wechat_accounts SET nickname = ?, username = ?, avatar = ?, status = ?, device_auth_key = ?, last_login = ?, updated_at = ? WHERE auth_key = ? AND user_id = ?',
          [nickname, username, avatar, status || 'online', device_auth_key, new Date().toISOString(), new Date().toISOString(), auth_key, req.user.id],
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
          'INSERT INTO wechat_accounts (auth_key, device_auth_key, nickname, username, avatar, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [auth_key, device_auth_key, nickname, username, avatar, status || 'online', req.user.id],
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
    // 创建新账号逻辑
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
          'INSERT INTO wechat_accounts (auth_key, nickname, status, user_id) VALUES (?, ?, ?, ?)',
          [keyValue, nickname || '新微信账号', 'waiting', req.user.id],
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

// 管理员接口
app.post('/api/admin/wechat-accounts', adminAuth, (req, res) => {
  // ... existing code ...
});

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;

  // 验证必填字段
  if (!username || !password || !email) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  // 检查用户名是否已存在
  db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('查询用户失败:', err.message);
      return res.status(500).json({ error: '注册失败' });
    }

    if (user) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('查询邮箱失败:', err.message);
        return res.status(500).json({ error: '注册失败' });
      }

      if (user) {
        return res.status(400).json({ error: '邮箱已被注册' });
      }

      try {
        // 检查是否是第一个用户
        const isFirstUser = await new Promise((resolve, reject) => {
          db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
            if (err) reject(err);
            else resolve(row.count === 0);
          });
        });

        // 生成密码哈希
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入新用户
        db.run(
          'INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
          [
            username,
            hashedPassword,
            email,
            isFirstUser ? 'admin' : 'user', // 第一个用户设为管理员，其他用户设为普通用户
            new Date().toISOString()
          ],
          function(err) {
            if (err) {
              console.error('创建用户失败:', err.message);
              return res.status(500).json({ error: '注册失败' });
            }

            // 生成 JWT token
            const token = jwt.sign(
              { 
                id: this.lastID,
                username,
                role: isFirstUser ? 'admin' : 'user'
              },
              process.env.JWT_SECRET,
              { expiresIn: '24h' }
            );

            res.json({
              message: '注册成功',
              token,
              user: {
                id: this.lastID,
                username,
                email,
                role: isFirstUser ? 'admin' : 'user'
              }
            });
          }
        );
      } catch (error) {
        console.error('注册过程出错:', error);
        res.status(500).json({ error: '注册失败' });
      }
    });
  });
});

// 微信账号表
db.run(`CREATE TABLE IF NOT EXISTS wechat_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auth_key TEXT UNIQUE NOT NULL,
  device_auth_key TEXT,
  nickname TEXT,
  username TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'waiting',
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  qr_code_url TEXT,
  user_id INTEGER NOT NULL,
  FOREIGN KEY (auth_key) REFERENCES auth_keys (key_value),
  FOREIGN KEY (user_id) REFERENCES users (id)
)`, (err) => {
  if (err) {
    console.error('创建微信账号表失败:', err.message);
  } else {
    console.log('微信账号表创建成功');
    
    // 检查是否需要添加user_id字段
    db.get("PRAGMA table_info(wechat_accounts)", (err, rows) => {
      if (err) {
        console.error('检查表结构失败:', err.message);
        return;
      }
      
      const hasUserId = rows.some(row => row.name === 'user_id');
      if (!hasUserId) {
        // 添加user_id字段
        db.run("ALTER TABLE wechat_accounts ADD COLUMN user_id INTEGER", (err) => {
          if (err) {
            console.error('添加user_id字段失败:', err.message);
          } else {
            console.log('添加user_id字段成功');
            
            // 更新现有记录的user_id
            db.run(`
              UPDATE wechat_accounts 
              SET user_id = (
                SELECT user_id 
                FROM auth_keys 
                WHERE auth_keys.key_value = wechat_accounts.auth_key
              )
            `, (err) => {
              if (err) {
                console.error('更新user_id失败:', err.message);
              } else {
                console.log('更新user_id成功');
              }
            });
          }
        });
      }
    });
  }
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`服务器运行在 http://${HOST}:${PORT}`);
}); 
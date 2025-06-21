import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// 注册
router.post('/register', async (req, res) => {
  const { username, password, email, role = 'user' } = req.body;

  try {
    console.log('开始注册流程:', { username, email, role });

    // 检查用户名是否已存在
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      console.log('用户名已存在:', username);
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    const existingEmail = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      console.log('邮箱已被注册:', email);
      return res.status(400).json({ error: '邮箱已被注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    console.log('密码加密完成');

    // 创建新用户
    const result = await db.run(
      'INSERT INTO users (username, password, email, role, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [username, hashedPassword, email, role]
    );
    console.log('用户创建成功:', result);

    res.status(201).json({ message: '注册成功', userId: result.lastID });
  } catch (error) {
    console.error('注册失败，详细错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '注册失败: ' + error.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户总数
router.get('/users/count', async (req, res) => {
  try {
    const result = await db.all('SELECT COUNT(*) as count FROM users');
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('获取用户数量失败:', error);
    res.status(500).json({ error: '获取用户数量失败' });
  }
});

// 获取所有用户（仅管理员）
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(user);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router; 
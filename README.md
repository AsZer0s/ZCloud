# ZCloud 微信管理系统

## 项目概述
ZCloud 是一个基于 React + Node.js 的微信账号管理系统，提供微信账号的注册、登录、管理和监控功能。系统采用前后端分离架构，使用 SQLite 作为数据库。

## 技术栈
### 前端
- React 18
- Ant Design 5.x
- Axios
- React Router 6
- JWT 认证

### 后端
- Node.js
- Express
- SQLite3
- JWT
- WeChat API

## 当前进度

### 已完成功能
1. 用户系统
   - [x] 用户注册
   - [x] 用户登录
   - [x] JWT 认证
   - [x] 用户信息管理

2. 微信账号管理
   - [x] 微信账号注册
   - [x] 微信账号列表展示
   - [x] 微信账号状态管理
   - [x] 微信账号编辑
   - [x] 微信账号删除

3. 数据库
   - [x] 数据库初始化脚本
   - [x] 用户表结构
   - [x] 设备表结构
   - [x] 微信账号表结构
   - [x] 授权密钥表结构

### 进行中功能
1. 微信登录流程
   - [ ] 扫码登录实现
   - [ ] 登录状态维护
   - [ ] 会话管理

2. 设备管理
   - [ ] 设备注册
   - [ ] 设备状态监控
   - [ ] 设备绑定管理

### 待开发功能
1. 消息管理
   - [ ] 消息发送
   - [ ] 消息接收
   - [ ] 消息历史记录

2. 群组管理
   - [ ] 群组创建
   - [ ] 群组成员管理
   - [ ] 群组消息管理

3. 系统监控
   - [ ] 系统状态监控
   - [ ] 性能监控
   - [ ] 日志管理

## 已知问题

### 前端问题
1. 认证状态管理
   - [x] 修复：用户状态初始化问题
   - [x] 修复：认证状态检查逻辑
   - [ ] 待解决：Token 过期处理

2. 请求处理
   - [x] 修复：API 请求超时设置
   - [x] 修复：请求重试机制
   - [ ] 待解决：请求队列管理

3. 组件问题
   - [x] 修复：Dashboard 组件初始化顺序
   - [x] 修复：组件重渲染优化
   - [ ] 待解决：组件加载状态优化

### 后端问题
1. 数据库
   - [x] 修复：auth_keys 表结构更新
   - [x] 修复：wechat_accounts 表结构更新
   - [ ] 待解决：数据库连接池优化

2. API 接口
   - [x] 修复：微信账号列表接口超时
   - [x] 修复：认证中间件优化
   - [ ] 待解决：接口响应缓存

3. 微信集成
   - [ ] 待解决：微信登录流程优化
   - [ ] 待解决：微信会话管理
   - [ ] 待解决：微信消息处理

## 接口文档

### 认证接口
```
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

### 微信账号接口
```
GET /api/wechat-accounts
POST /api/wechat-accounts
PUT /api/wechat-accounts/:id
DELETE /api/wechat-accounts/:id
POST /api/wechat/wakeup-login
```

### 设备接口
```
GET /api/devices
POST /api/devices
PUT /api/devices/:id
DELETE /api/devices/:id
```

## 数据库结构

### users 表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### devices 表
```sql
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_id TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'offline',
  last_online DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### wechat_accounts 表
```sql
CREATE TABLE wechat_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  auth_key TEXT UNIQUE NOT NULL,
  device_auth_key TEXT,
  nickname TEXT,
  username TEXT,
  status TEXT DEFAULT 'waiting',
  last_login DATETIME,
  qr_code_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### auth_keys 表
```sql
CREATE TABLE auth_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT UNIQUE NOT NULL,
  days INTEGER DEFAULT 30,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 遗留问题

### 高优先级
1. 微信登录流程
   - 需要完善扫码登录实现
   - 需要优化登录状态维护
   - 需要实现会话管理机制

2. 设备管理
   - 需要实现设备注册流程
   - 需要完善设备状态监控
   - 需要优化设备绑定管理

3. 安全性
   - 需要加强密码加密
   - 需要实现请求频率限制
   - 需要完善错误处理机制

### 中优先级
1. 性能优化
   - 需要实现数据库连接池
   - 需要优化前端组件加载
   - 需要实现接口响应缓存

2. 用户体验
   - 需要优化加载状态显示
   - 需要完善错误提示
   - 需要优化表单验证

### 低优先级
1. 功能扩展
   - 需要实现消息管理
   - 需要实现群组管理
   - 需要添加系统监控

2. 文档完善
   - 需要补充API文档
   - 需要添加部署文档
   - 需要完善开发文档

## 开发环境设置

### 前端
```bash
cd client
npm install
npm start
```

### 后端
```bash
cd server
npm install
npm start
```

## 部署说明
1. 确保 Node.js 环境已安装
2. 配置环境变量
3. 初始化数据库
4. 启动后端服务
5. 构建前端项目
6. 配置 Web 服务器

## 贡献指南
1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证
MIT License 
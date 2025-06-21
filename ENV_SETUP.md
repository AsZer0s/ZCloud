# 环境配置说明

## 快速配置

1. **复制环境配置文件**
   ```bash
   cp env.example .env
   ```

2. **修改配置值**
   根据您的实际需求修改 `.env` 文件中的配置项

3. **重启服务器**
   ```bash
   npm run server
   ```

## 配置项说明

### 🔧 基础配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3001 | 后端服务器端口 |
| `HOST` | localhost | 服务器主机地址 |
| `NODE_ENV` | development | 环境模式 |

### 🔐 安全配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `JWT_SECRET` | your-secret-key | JWT签名密钥（生产环境必须修改） |
| `JWT_EXPIRES_IN` | 24h | JWT过期时间 |
| `BCRYPT_ROUNDS` | 10 | 密码加密轮数 |

### 🗄️ 数据库配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DB_PATH` | ./database.sqlite | SQLite数据库文件路径 |
| `DB_TIMEOUT` | 30000 | 数据库连接超时时间(毫秒) |

### 🌐 CORS配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `CORS_ORIGIN` | http://localhost:3000 | 允许跨域的前端地址 |

### 📊 微信API配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `WECHAT_API_BASE_URL` | http://localhost:8080 | 微信API服务器地址 |
| `WECHAT_API_TIMEOUT` | 30000 | API请求超时时间 |
| `WECHAT_API_RETRY_COUNT` | 3 | API重试次数 |

## 环境配置示例

### 开发环境
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=dev-secret-key-123
CORS_ORIGIN=http://localhost:3000
DEBUG=true
```

### 生产环境
```env
NODE_ENV=production
PORT=8080
JWT_SECRET=your-super-secure-production-key-here
CORS_ORIGIN=https://yourdomain.com
DEBUG=false
BCRYPT_ROUNDS=12
```

### Docker环境
```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=your-docker-secret-key
DB_PATH=/app/data/database.sqlite
```

## 安全建议

### 1. JWT密钥安全
- 生产环境必须使用强密钥
- 密钥长度至少32位
- 定期更换密钥

```env
# 推荐格式
JWT_SECRET=your-super-long-and-random-secret-key-2024
```

### 2. 数据库安全
- 生产环境使用专用数据库
- 定期备份数据
- 设置适当的文件权限

### 3. CORS配置
- 生产环境只允许特定域名
- 避免使用通配符 `*`

```env
# 开发环境
CORS_ORIGIN=http://localhost:3000

# 生产环境
CORS_ORIGIN=https://yourdomain.com
```

## 常见问题

### Q: 如何修改数据库路径？
A: 修改 `DB_PATH` 配置项：
```env
DB_PATH=/path/to/your/database.sqlite
```

### Q: 如何启用HTTPS？
A: 在生产环境中配置SSL证书，并修改CORS配置：
```env
CORS_ORIGIN=https://yourdomain.com
```

### Q: 如何设置日志级别？
A: 修改 `LOG_LEVEL` 配置项：
```env
LOG_LEVEL=debug  # 开发环境
LOG_LEVEL=error  # 生产环境
```

### Q: 如何配置邮件服务？
A: 填写SMTP配置：
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=your-email@gmail.com
```

## 验证配置

启动服务器后，访问健康检查接口验证配置：

```bash
curl http://localhost:3001/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

## 配置优先级

1. 环境变量
2. `.env` 文件
3. 默认值

例如，如果同时设置了环境变量和 `.env` 文件，环境变量优先级更高：

```bash
# 环境变量
export PORT=8080

# .env 文件
PORT=3001

# 实际使用的端口是 8080
``` 
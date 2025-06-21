@echo off
echo 正在启动微信人形机器人管理系统...
echo.

echo 1. 安装依赖...
npm install

echo.
echo 2. 启动后端服务器...
start "后端服务器" cmd /k "npm run server"

echo.
echo 3. 等待3秒后启动前端...
timeout /t 3 /nobreak > nul

echo 4. 启动前端开发服务器...
start "前端服务器" cmd /k "npm start"

echo.
echo 系统启动完成！
echo 后端服务器: http://localhost:3001
echo 前端应用: http://localhost:3000
echo 默认管理员账户: admin / admin123
echo.
pause 
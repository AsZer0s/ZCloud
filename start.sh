#!/bin/bash

echo "正在启动微信人形机器人管理系统..."
echo

echo "1. 安装依赖..."
npm install

echo
echo "2. 启动后端服务器..."
gnome-terminal --title="后端服务器" -- bash -c "npm run server; exec bash" &
# 如果gnome-terminal不可用，使用xterm
# xterm -title "后端服务器" -e "npm run server; bash" &

echo
echo "3. 等待3秒后启动前端..."
sleep 3

echo "4. 启动前端开发服务器..."
gnome-terminal --title="前端服务器" -- bash -c "npm start; exec bash" &
# 如果gnome-terminal不可用，使用xterm
# xterm -title "前端服务器" -e "npm start; bash" &

echo
echo "系统启动完成！"
echo "后端服务器: http://localhost:3001"
echo "前端应用: http://localhost:3000"
echo "默认管理员账户: admin / admin123"
echo
read -p "按回车键退出..." 
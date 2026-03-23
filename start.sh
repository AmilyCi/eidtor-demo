#!/bin/bash

echo "=== OnlyOffice 集成项目启动脚本 ==="

# 检查 onlyOffice 是否运行
echo "检查 OnlyOffice 服务..."
if ! docker ps | grep -q onlyoffice; then
  echo "警告：未检测到运行中的 OnlyOffice 容器"
  echo "请先启动 OnlyOffice: docker run -d -p 8080:80 onlyoffice/documentserver"
fi

# 启动后端
echo "启动后端服务..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 2

# 启动前端
echo "启动前端服务..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== 服务已启动 ==="
echo "后端：http://localhost:3000"
echo "前端：http://localhost:8081"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待退出
wait

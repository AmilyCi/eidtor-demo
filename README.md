# OnlyOffice 集成项目

基于 Node.js + Vue3 的 OnlyOffice 文档编辑器在线协作编辑解决方案。

## 项目结构

```
.
├── backend/          # 后端服务 (Express)
│   ├── src/
│   │   ├── index.js              # 入口文件
│   │   └── routes/
│   │       ├── fileRoutes.js     # 文件管理 API
│   │       └── onlyofficeRoutes.js # OnlyOffice API
│   └── utils/
│       └── storage.js            # 文件存储工具
└── frontend/         # 前端应用 (Vue3 + Vite)
    └── src/
        ├── main.js               # 入口文件
        ├── App.vue               # 根组件
        ├── router.js             # 路由配置
        ├── api.js                # API 封装
        └── views/
            ├── Home.vue          # 首页（文件列表）
            └── Editor.vue        # 编辑器页面
```

## 快速启动

### 方式一：Docker Compose（推荐）

```bash
# 生成 JWT 密钥（生产环境）
export ONLYOFFICE_SECRET=$(openssl rand -hex 32)

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式二：本地开发

```bash
# 启动 OnlyOffice（需要 Docker）
docker run -d -p 8080:80 onlyoffice/documentserver

# 启动后端
cd backend
npm install
npm start

# 启动前端（新终端）
cd frontend
npm install
npm run dev
```

### 方式三：使用启动脚本

```bash
./start.sh
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端应用 | http://localhost:8081 |
| 后端 API | http://localhost:3000 |
| OnlyOffice | http://localhost:8080 |

## 功能特性

- 📁 文件上传/下载/删除
- 📝 在线编辑 Word 文档 (.doc, .docx)
- 📊 在线编辑 Excel 表格 (.xls, .xlsx)
- 📽 在线编辑 PPT 演示文稿 (.ppt, .pptx)
- 💾 自动保存功能
- 👥 多用户协作编辑支持

## API 接口

### 文件管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/files/list | 获取文件列表 |
| POST | /api/files/upload | 上传文件 |
| GET | /api/files/download/:filename | 下载文件 |
| DELETE | /api/files/delete/:filename | 删除文件 |
| GET | /api/files/content/:filename | 获取文件内容 |

### OnlyOffice

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/onlyoffice/editor | 获取编辑器配置 |
| POST | /api/onlyoffice/callback | OnlyOffice 回调保存 |
| GET | /api/onlyoffice/files | 获取可编辑文件列表 |

## 配置说明

### 后端环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 后端服务端口 | 3000 |
| ONLYOFFICE_URL | OnlyOffice 服务地址 | http://localhost:8080 |
| APP_URL | 应用访问地址（回调用） | http://localhost:3000 |
| FILES_DIR | 文件存储目录 | ./files |
| ONLYOFFICE_SECRET | JWT 密钥（生产环境必须修改） | - |

### 前端配置

修改 `frontend/vite.config.js` 中的代理配置。

## 安全提示

1. **JWT 密钥**：生产环境必须修改 `ONLYOFFICE_SECRET` 为随机密钥
2. **文件上传**：已限制文件类型和大小（50MB）
3. **路径遍历**：已添加文件名验证防止路径遍历攻击
4. **环境变量**：不要将 `.env` 文件提交到版本控制

## 技术栈

**后端**
- Node.js 16+
- Express.js
- Multer（文件上传）
- jsonwebtoken（JWT 认证）

**前端**
- Vue 3
- Vite
- Vue Router
- Axios

**其他**
- OnlyOffice Document Server
- Docker & Docker Compose

## 注意事项

1. OnlyOffice 服务需要能够访问后端 API（用于文档保存回调）
2. 文件存储在 `backend/files` 目录下
3. 首次加载编辑器可能需要几秒钟下载 OnlyOffice 资源
4. 使用 Docker 部署时，确保 `APP_URL` 配置正确以便 OnlyOffice 能够回调

## License

MIT

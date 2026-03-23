import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileRoutes from './routes/fileRoutes.js';
import onlyofficeRoutes from './routes/onlyofficeRoutes.js';
import { initStorage } from './utils/storage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化文件存储
initStorage();

// 路由
app.use('/api/files', fileRoutes);
app.use('/api/onlyoffice', onlyofficeRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
  console.log(`OnlyOffice URL: ${process.env.ONLYOFFICE_URL}`);
});

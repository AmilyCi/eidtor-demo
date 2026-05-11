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

/**
 * 流式生成文档内容（SSE）
 * GET /api/stream/generate?prompt=xxx
 */
app.get('/api/stream/generate', cors(), async (req, res) => {
  const { prompt } = req.query;

  console.log('收到流式生成请求，prompt:', prompt);

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let isClientConnected = true;

  req.on('close', () => {
    console.log('客户端断开连接');
    isClientConnected = false;
  });

  // 模拟 AI 生成的中文内容片段
  const mockContent = [
    '这是一个自动生成的文档内容。\n\n',
    '# 标题一\n\n',
    '这是第一段内容，展示流式生成的效果。\n\n',
    '## 标题二\n\n',
    '这是第二段内容，内容会逐步显示在编辑器中。\n\n',
    '### 列表示例\n\n',
    '- 列表项 1\n',
    '- 列表项 2\n',
    '- 列表项 3\n\n',
    '## 结语\n\n',
    '文档生成完毕。'
  ];

  const fullContent = mockContent.join('');
  const chars = Array.from(fullContent);
  let index = 0;

  const sendNextChunk = () => {
    if (!isClientConnected) return;

    if (index >= chars.length) {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    const chunkSize = Math.min(Math.floor(Math.random() * 3) + 1, chars.length - index);
    const chunk = chars.slice(index, index + chunkSize).join('');
    index += chunkSize;

    res.write(`data: ${JSON.stringify({ type: 'content', chunk })}\n\n`);

    const delay = Math.floor(Math.random() * 50) + 50;
    setTimeout(sendNextChunk, delay);
  };

  sendNextChunk();
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
  console.log(`OnlyOffice URL: ${process.env.ONLYOFFICE_URL}`);
});

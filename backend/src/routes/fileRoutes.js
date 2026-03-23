import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  saveFile,
  readFile,
  deleteFile,
  listFiles,
  getFileExtension
} from '../utils/storage.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 配置文件上传限制
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/pdf'
];
const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.pdf'];

// 配置文件存储和验证
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`不允许的文件类型：${ext}`));
    }
    cb(null, true);
  }
});

/**
 * 解码中文文件名（处理 UTF-8 被当作 latin1 解码的问题）
 */
function decodeChineseFilename(filename) {
  if (!filename) return filename;

  try {
    // 将错误解码的 latin1 字符串转回 buffer，再用 UTF-8 解码
    const buffer = Buffer.from(filename, 'latin1');
    const decoded = buffer.toString('utf8');

    // 验证解码后的文件名是否包含中文字符，如果是则使用解码后的名称
    if (/[\u4e00-\u9fa5]/.test(decoded)) {
      return decoded;
    }

    // 如果解码后没有中文，可能是原本就是英文名或其他语言
    // 检查原文件名是否有乱码特征（非 ASCII 但也不是有效 UTF-8）
    if (/^[^\x00-\x7F]+$/.test(filename) && !/^[\x00-\x7F\u4e00-\u9fa5]+$/.test(filename)) {
      // 原文件名看起来像乱码，尝试使用解码结果
      return decoded;
    }
  } catch (e) {
    console.log('文件名解码失败:', e.message);
  }

  return filename;
}

/**
 * 验证文件扩展名（二次检查）
 */
function validateFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }
  // 检查文件名是否包含路径遍历字符
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  return true;
}

/**
 * 上传文件
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未选择文件' });
    }

    // 处理中文文件名编码问题
    let filename = decodeChineseFilename(req.file.originalname);

    // 验证文件名
    if (!validateFilename(filename)) {
      return res.status(400).json({ error: '无效的文件名' });
    }

    // 确保文件名是干净的（去除路径和特殊字符）
    filename = path.basename(filename);

    console.log('上传文件:', filename);

    saveFile(filename, req.file.buffer);

    res.json({
      success: true,
      filename,
      url: `/api/files/download/${filename}`
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    if (error.message.includes('不允许的文件类型')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `文件大小超过限制 (${MAX_FILE_SIZE / 1024 / 1024}MB)` });
    }
    res.status(500).json({ error: '上传文件失败' });
  }
});

/**
 * 下载文件
 */
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;

    // 验证文件名防止路径遍历
    if (!validateFilename(filename)) {
      return res.status(400).json({ error: '无效的文件名' });
    }

    const content = readFile(filename);

    if (!content) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const ext = getFileExtension(filename);
    const mimeTypes = {
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.csv': 'text/csv'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error('下载文件失败:', error);
    res.status(500).json({ error: '下载文件失败' });
  }
});

/**
 * 获取文件列表
 */
router.get('/list', (req, res) => {
  try {
    const files = listFiles();
    res.json({ success: true, files });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

/**
 * 删除文件
 */
router.delete('/delete/:filename', (req, res) => {
  try {
    const filename = req.params.filename;

    // 验证文件名防止路径遍历
    if (!validateFilename(filename)) {
      return res.status(400).json({ error: '无效的文件名' });
    }

    const deleted = deleteFile(filename);

    if (!deleted) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.json({ success: true, message: '文件已删除' });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ error: '删除文件失败' });
  }
});

/**
 * 获取文件内容（用于 onlyOffice 回调）
 */
router.get('/content/:filename', (req, res) => {
  try {
    const filename = req.params.filename;

    // 验证文件名防止路径遍历
    if (!validateFilename(filename)) {
      return res.status(400).json({ error: '无效的文件名' });
    }

    // 检查 Authorization header 中的 JWT token
    const authHeader = req.headers.authorization;
    if (authHeader) {
      console.log('收到 Authorization header:', authHeader.substring(0, 50) + '...');
    } else {
      console.log('未收到 Authorization header');
    }

    const content = readFile(filename);

    if (!content) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.send(content);
  } catch (error) {
    console.error('获取文件内容失败:', error);
    res.status(500).json({ error: '获取文件内容失败' });
  }
});

export default router;

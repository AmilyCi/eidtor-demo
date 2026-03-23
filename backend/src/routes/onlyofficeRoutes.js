import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import {
  readFileContent,
  saveFile,
  listFiles,
  getDocumentType
} from '../utils/storage.js';

const router = express.Router();

// OnlyOffice JWT 密钥 - 必须从环境变量获取
const JWT_SECRET = process.env.ONLYOFFICE_SECRET;

// 警告：如果未设置密钥
if (!JWT_SECRET) {
  console.warn('⚠️  警告：ONLYOFFICE_SECRET 未设置！请使用环境变量设置密钥。');
  console.warn('生成随机密钥命令：openssl rand -hex 32');
}

// 存储文档编辑会话
const editorSessions = new Map();

/**
 * 生成 OnlyOffice JWT token
 */
function generateJwtToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * 获取编辑器配置
 */
router.post('/editor', (req, res) => {
  try {
    const { filename, user } = req.body;

    if (!filename) {
      return res.status(400).json({ error: '文件名不能为空' });
    }

    const documentId = uuidv4();

    // 创建编辑会话
    editorSessions.set(documentId, {
      filename,
      user: user || { id: 'user-1', name: '用户' },
      createdAt: new Date()
    });

    // OnlyOffice 文档服务器 URL
    const onlyofficeUrl = process.env.ONLYOFFICE_URL || 'http://localhost:8080';

    // 后端服务 URL（OnlyOffice 回调用）
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // 文档信息
    const docType = filename.split('.').pop() || 'docx';

    // 用于 JWT token 和配置对象的完整文档信息
    const documentInfo = {
      fileType: docType,
      key: documentId,
      title: filename,
      encoding: 'UTF-8',
      url: `${appUrl}/api/files/content/${encodeURIComponent(filename)}`,
      encoding: 'UTF-8',
      permissions: {
        comment: true,
        copy: true,
        download: true,
        edit: true,
        fillForms: true,
        modifyContentControl: true,
        modifyFilter: true,
        print: true,
        review: true
      }
    };

    // 用于 JWT token 和配置对象的完整编辑器配置
    const editorInfo = {
      mode: 'edit',
      lang: 'zh-CN',
      user: user || {
        id: 'user-1',
        name: '用户'
      },
      customization: {
        autosave: true,
        forcesave: true,
        hideTxtOptions: true,
        hideRightMenu: true
      },
      callbackUrl: `${appUrl}/api/onlyoffice/callback?filename=${encodeURIComponent(filename)}`,
      // TXT 文件编码选项，避免打开时弹出编码选择框
      txtOptions: {
        encoding: 'UTF-8'
      }
    };

    // 生成 JWT token (OnlyOffice 9.x 需要)
    // Token 包含完整的 document 和 editorConfig
    const tokenPayload = {
      document: documentInfo,
      editorConfig: editorInfo
    };

    const token = generateJwtToken(tokenPayload);

    console.log('Token payload:', JSON.stringify(tokenPayload, null, 2));

    // 构建配置对象 - 与 token 中的内容完全一致
    const config = {
      type: 'desktop',
      token,
      document: documentInfo,
      editorConfig: editorInfo,
      height: '100%',
      width: '100%'
    };

    console.log('配置对象:', JSON.stringify(config, null, 2));
    console.log('Token (前 50 字符):', token.substring(0, 50) + '...');

    res.json({
      success: true,
      documentId,
      editorUrl: `${onlyofficeUrl}/web-apps/apps/api/documents/api.js`,
      config
    });
  } catch (error) {
    console.error('获取编辑器配置失败:', error);
    res.status(500).json({ error: '获取编辑器配置失败' });
  }
});

/**
 * OnlyOffice 回调接口 - 保存文档
 */
router.post('/callback', async (req, res) => {
  try {
    const { filename } = req.query;
    const callbackData = req.body;

    console.log('OnlyOffice 回调:', callbackData);

    // status 说明：
    // 0 - 文档正在编辑
    // 1 - 文档准备保存
    // 2 - 文档已保存
    // 3 - 保存失败
    // 4 - 强制保存
    // 5 - 无编辑者，准备关闭
    // 6 - 文档已关闭
    // 7 - 强制保存失败
    // 8 - 准备下载
    if (callbackData.status === 2 || callbackData.status === 6) {
      // 文档已保存，下载新版本
      if (callbackData.url) {
        const response = await axios.get(callbackData.url, {
          responseType: 'arraybuffer'
        });

        // 保存文件
        saveFile(filename, Buffer.from(response.data));
        console.log(`文件已保存：${filename}`);
      }
    }

    res.json({ error: 0 });
  } catch (error) {
    console.error('处理回调失败:', error);
    res.status(500).json({ error: 1 });
  }
});

/**
 * 获取文档会话信息
 */
router.get('/session/:documentId', (req, res) => {
  const { documentId } = req.params;
  const session = editorSessions.get(documentId);

  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }

  res.json({ success: true, session });
});

/**
 * 获取可编辑的文件列表
 */
router.get('/files', (req, res) => {
  try {
    const files = listFiles();
    const editableFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const editableExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
      return editableExts.includes(ext);
    });

    res.json({ success: true, files: editableFiles });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

export default router;

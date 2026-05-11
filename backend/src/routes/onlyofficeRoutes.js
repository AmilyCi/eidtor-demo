/**
 * OnlyOffice 路由 - 简化版
 * 只提供文件内容和回调接口
 * 配置生成在前端完成
 */

import express from 'express';
import axios from 'axios';
import {
  saveFile,
  listFiles
} from '../utils/storage.js';

const router = express.Router();

/**
 * 获取可编辑的文件列表
 */
router.get('/files', (_, res) => {
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

export default router;

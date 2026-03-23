import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILES_DIR = process.env.FILES_DIR || './files';

/**
 * 初始化文件存储目录
 */
export function initStorage() {
  const storagePath = path.join(__dirname, '..', '..', FILES_DIR);
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  console.log(`文件存储目录：${storagePath}`);
}

/**
 * 获取文件存储目录路径
 */
export function getStoragePath() {
  return path.join(__dirname, '..', '..', FILES_DIR);
}

/**
 * 保存文件
 */
export function saveFile(filename, content) {
  const storagePath = getStoragePath();
  const filePath = path.join(storagePath, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * 读取文件
 */
export function readFile(filename) {
  const storagePath = getStoragePath();
  const filePath = path.join(storagePath, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath);
}

/**
 * 读取文件内容（字符串）
 */
export function readFileContent(filename) {
  const storagePath = getStoragePath();
  const filePath = path.join(storagePath, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 删除文件
 */
export function deleteFile(filename) {
  const storagePath = getStoragePath();
  const filePath = path.join(storagePath, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * 列出所有文件
 */
export function listFiles() {
  const storagePath = getStoragePath();
  if (!fs.existsSync(storagePath)) {
    return [];
  }
  return fs.readdirSync(storagePath).map(filename => {
    const filePath = path.join(storagePath, filename);
    const stats = fs.statSync(filePath);
    return {
      name: filename,
      size: stats.size,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime
    };
  });
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * 根据扩展名获取文档类型
 */
export function getDocumentType(ext) {
  const wordExts = ['.doc', '.docx', '.odt', '.rtf', '.txt'];
  const cellExts = ['.xls', '.xlsx', '.ods', '.csv'];
  const slideExts = ['.ppt', '.pptx', '.odp'];

  if (wordExts.includes(ext)) return 'word';
  if (cellExts.includes(ext)) return 'cell';
  if (slideExts.includes(ext)) return 'slide';
  return 'word'; // 默认
}

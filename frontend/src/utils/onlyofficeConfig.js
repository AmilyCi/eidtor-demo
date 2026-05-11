/**
 * OnlyOffice 配置生成工具
 * 在前端生成 JWT token 和编辑器配置
 */

import crypto from 'crypto-js'

// OnlyOffice JWT 密钥 - 需要与后端保持一致
const JWT_SECRET = import.meta.env.VITE_ONLYOFFICE_SECRET || 'sLxraNbqwPx5i5ys6fd88FqG1wD5FOCH'

// 插件配置 - 全部在前端
const PLUGIN_CONFIG = {
  guid: 'asc.{ea8a3b8e-8f3a-4c8e-9c3e-1a2b3c4d5e6f}',
  // 插件静态文件由前端 Vite 开发服务器提供
  baseUrl: '/plugin/stream-plugin'
}

/**
 * 生成文档 key（同一文件名使用相同的 key 以支持协作编辑）
 */
export function generateDocumentKey(filename) {
  return crypto.MD5(filename).toString(crypto.enc.Hex)
}

/**
 * 生成 JWT token（简化的前端版本）
 * 注意：前端生成 token 仅适用于开发/内部环境
 * 生产环境建议在后端生成以保证安全
 */
export function generateToken(documentInfo, editorInfo) {
  const payload = {
    document: documentInfo,
    editorConfig: editorInfo
  }

  // 使用 crypto-js 进行 JWT 签名（HMAC SHA256）
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const headerEncoded = base64UrlEncode(JSON.stringify(header))
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload))

  const signature = base64UrlEncode(
    crypto.HmacSHA256(`${headerEncoded}.${payloadEncoded}`, JWT_SECRET)
  )

  return `${headerEncoded}.${payloadEncoded}.${signature}`
}

/**
 * Base64 URL 编码
 */
function base64UrlEncode(str) {
  if (typeof str === 'string') {
    str = new TextEncoder().encode(str)
  }
  return btoa(String.fromCharCode(...new Uint8Array(str)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/**
 * 生成 OnlyOffice 编辑器配置
 */
export function generateEditorConfig(filename, user, appUrl) {
  // 生成文档 key
  const documentId = generateDocumentKey(filename)

  // 提取文件扩展名
  const ext = filename.split('.').pop() || 'docx'

  // 文档信息
  const documentInfo = {
    fileType: ext,
    key: documentId,
    title: filename,
    encoding: 'UTF-8',
    url: `${appUrl}/api/files/content/${encodeURIComponent(filename)}`,
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
  }

  // 编辑器配置
  const editorInfo = {
    mode: 'edit',
    lang: 'zh-CN',
    user: user || { id: 'user-1', name: '用户' },
    customization: {
      autosave: true,
      forcesave: true,
      hideTxtOptions: true,
      hideRightMenu: true
    },
    callbackUrl: `${appUrl}/api/onlyoffice/callback?filename=${encodeURIComponent(filename)}`,
    txtOptions: {
      encoding: 'UTF-8'
    }
  }

  // 生成 token
  const token = generateToken(documentInfo, editorInfo)

  // 完整配置对象
  const config = {
    type: 'desktop',
    token,
    document: documentInfo,
    editorConfig: editorInfo,
    height: '100%',
    width: '100%',
    events: {},
    onAppReady: function() {
      console.log('OnlyOffice App 就绪')
    }
  }

  return {
    config,
    documentId,
    token
  }
}

/**
 * 获取插件配置
 */
export function getPluginConfig() {
  return {
    guid: PLUGIN_CONFIG.guid,
    baseUrl: PLUGIN_CONFIG.baseUrl,
    // pluginsData 格式：SDK 会自动从 baseUrl + 插件 GUID 加载
    pluginsData: [
      `${PLUGIN_CONFIG.baseUrl}/config.json`
    ]
  }
}

export default {
  generateDocumentKey,
  generateToken,
  generateEditorConfig,
  getPluginConfig
}

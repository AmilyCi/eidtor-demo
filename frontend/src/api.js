import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 文件管理 API
export const fileApi = {
  // 获取文件列表
  list() {
    return api.get('/files/list')
  },

  // 上传文件
  upload(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 删除文件
  delete(filename) {
    return api.delete(`/files/delete/${filename}`)
  },

  // 下载文件
  downloadUrl(filename) {
    return `/api/files/download/${filename}`
  }
}

// OnlyOffice API
export const onlyofficeApi = {
  // 获取编辑器配置
  getEditorConfig(filename, user) {
    return api.post('/onlyoffice/editor', { filename, user })
  },

  // 获取可编辑文件列表
  getFiles() {
    return api.get('/onlyoffice/files')
  }
}

export default api

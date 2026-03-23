<template>
  <div class="home">
    <div class="header-actions">
      <h2>文档列表</h2>
      <label class="upload-btn">
        <input type="file" @change="handleFileUpload" accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" hidden>
        <span>+ 上传文档</span>
      </label>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="files.length === 0" class="empty">
      <p>暂无文档，请上传</p>
    </div>
    <div v-else class="file-list">
      <div v-for="file in files" :key="file.name" class="file-item">
        <div class="file-info">
          <span class="file-icon">{{ getFileIcon(file.name) }}</span>
          <div class="file-details">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-meta">{{ formatFileSize(file.size) }} · {{ formatDate(file.updatedAt) }}</span>
          </div>
        </div>
        <div class="file-actions">
          <button class="btn btn-primary" @click="openEditor(file.name)">
            编辑
          </button>
          <a :href="downloadUrl(file.name)" class="btn btn-secondary" download>
            下载
          </a>
          <button class="btn btn-danger" @click="deleteFile(file.name)">
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { fileApi, onlyofficeApi } from '../api'
import { useRouter } from 'vue-router'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const files = ref([])
    const loading = ref(false)

    const loadFiles = async () => {
      loading.value = true
      try {
        const res = await onlyofficeApi.getFiles()
        files.value = res.data.files || []
      } catch (error) {
        console.error('加载文件列表失败:', error)
        alert('加载文件列表失败')
      } finally {
        loading.value = false
      }
    }

    const handleFileUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      try {
        await fileApi.upload(file)
        alert('上传成功')
        loadFiles()
      } catch (error) {
        console.error('上传失败:', error)
        alert('上传失败')
      }
      event.target.value = ''
    }

    const openEditor = (filename) => {
      router.push(`/editor/${filename}`)
    }

    const deleteFile = async (filename) => {
      if (!confirm(`确定要删除 ${filename} 吗？`)) return

      try {
        await fileApi.delete(filename)
        alert('删除成功')
        loadFiles()
      } catch (error) {
        console.error('删除失败:', error)
        alert('删除失败')
      }
    }

    const downloadUrl = (filename) => {
      return fileApi.downloadUrl(filename)
    }

    const getFileIcon = (filename) => {
      const ext = filename.split('.').pop().toLowerCase()
      const icons = {
        'doc': '📄', 'docx': '📄',
        'xls': '📊', 'xlsx': '📊',
        'ppt': '📽', 'pptx': '📽',
        'txt': '📝', 'csv': '📊'
      }
      return icons[ext] || '📁'
    }

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const formatDate = (dateStr) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-CN')
    }

    onMounted(() => {
      loadFiles()
    })

    return {
      files,
      loading,
      handleFileUpload,
      openEditor,
      deleteFile,
      downloadUrl,
      getFileIcon,
      formatFileSize,
      formatDate
    }
  }
}
</script>

<style scoped>
.home {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-actions h2 {
  font-size: 1.25rem;
  color: #333;
}

.upload-btn {
  background-color: #446e96;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.upload-btn:hover {
  background-color: #3a5a7a;
}

.loading, .empty {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  transition: box-shadow 0.2s;
}

.file-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-icon {
  font-size: 2rem;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  color: #333;
}

.file-meta {
  font-size: 0.875rem;
  color: #666;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: none;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.85;
}

.btn-primary {
  background-color: #446e96;
  color: white;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}
</style>

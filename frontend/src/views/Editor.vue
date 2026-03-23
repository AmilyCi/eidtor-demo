<template>
  <div class="editor-container">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载编辑器，请稍候...</p>
      <p class="loading-tip">首次加载可能需要 10-30 秒，后续访问会更快</p>
    </div>
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button class="btn" @click="goBack">返回</button>
    </div>
    <div v-else id="editor" class="editor"></div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onlyofficeApi } from '../api'

// OnlyOffice 脚本缓存（页面级）
let docsApiPromise = null

export default {
  name: 'Editor',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const loading = ref(true)
    const error = ref(null)
    let docEditor = null

    const filename = route.params.filename
    console.log('原始文件名:', filename)
    // 路由参数可能已经过 URL 编码，需要解码
    const decodedFilename = decodeURIComponent(filename)
    console.log('解码后的文件名:', decodedFilename)

    // 预加载 OnlyOffice 脚本（全局缓存）
    const preloadOnlyOfficeScript = (url) => {
      if (docsApiPromise) return docsApiPromise

      docsApiPromise = new Promise((resolve, reject) => {
        if (window.DocsAPI) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = url
        script.async = true
        script.onload = () => {
          console.log('OnlyOffice 脚本加载完成')
          resolve()
        }
        script.onerror = () => {
          console.error('OnlyOffice 脚本加载失败')
          reject(new Error('加载 OnlyOffice 脚本失败'))
        }
        document.head.appendChild(script)
      })

      return docsApiPromise
    }

    const loadEditor = async () => {
      try {
        // 并行加载：同时请求配置和预加载脚本
        const proxyEditorUrl = '/onlyoffice/web-apps/apps/api/documents/api.js'

        // 预加载脚本（后台进行）
        preloadOnlyOfficeScript(proxyEditorUrl)

        // 获取编辑器配置
        const res = await onlyofficeApi.getEditorConfig(decodedFilename, {
          id: 'CX',
          name: 'CX'
        })

        console.log('编辑器配置:', res.data)

        const { config } = res.data

        console.log('Token:', config.token?.substring(0, 50) + '...')

        // 添加事件回调到配置中
        config.events = {
          'onError': (event) => {
            console.error('编辑器错误:', event)
            error.value = '编辑器发生错误：' + JSON.stringify(event)
          },
          'onRequestClose': () => {
            console.log('编辑器请求关闭')
          },
          'onRequestEditRights': () => {
            console.log('编辑器请求编辑权限')
          },
          'onDocumentStateChange': (event) => {
            console.log('文档状态变化:', event)
          },
          'onAppReady': () => {
            console.log('OnlyOffice App 就绪')
            loading.value = false
          },
          'onInfo': (event) => {
            console.log('OnlyOffice 信息:', event)
          }
        }

        // 确保容器元素存在
        const container = document.getElementById('editor')
        console.log('编辑器容器:', container)

        if (!container) {
          throw new Error('编辑器容器未找到')
        }

        // 等待脚本加载完成
        await docsApiPromise

        // 创建编辑器实例
        if (window.DocsAPI && window.DocsAPI.DocEditor) {
          console.log('开始创建编辑器...')
          docEditor = new window.DocsAPI.DocEditor('editor', config)
          console.log('编辑器已创建', docEditor)

          // 设置超时检测
          const loadTimeout = setTimeout(() => {
            const iframe = document.querySelector('#editor iframe')
            if (!iframe && loading.value) {
              console.warn('编辑器加载超时，检查 OnlyOffice 服务')
              error.value = '编辑器加载超时，请检查 OnlyOffice 服务是否正常运行'
              loading.value = false
            }
          }, 15000)

          // 检查 DOM 变化
          if (container) {
            const observer = new MutationObserver(() => {
              const iframe = document.querySelector('#editor iframe')
              if (iframe) {
                console.log('iframe 已创建:', iframe.src)
                clearTimeout(loadTimeout)
                observer.disconnect()
              }
            })
            observer.observe(container, { childList: true, subtree: true })
          }
        } else {
          throw new Error('DocsAPI.DocEditor 不可用')
        }

      } catch (err) {
        console.error('加载编辑器失败:', err)
        loading.value = false
        error.value = '加载编辑器失败：' + err.message
      }
    }

    const goBack = () => {
      router.push('/')
    }

    onMounted(() => {
      loadEditor()
    })

    onBeforeUnmount(() => {
      if (docEditor) {
        docEditor.destroyEditor()
      }
    })

    return {
      loading,
      error,
      goBack
    }
  }
}
</script>

<style scoped>
.editor-container {
  width: 100%;
  height: 100vh;
  background: white;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 1rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e0e0e0;
  border-top-color: #446e96;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-tip {
  font-size: 0.875rem;
  color: #666;
}

.error {
  color: #dc3545;
}

.editor {
  width: 100%;
  height: 100%;
}

.btn {
  padding: 0.5rem 1rem;
  background-color: #446e96;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn:hover {
  background-color: #3a5a7a;
}
</style>

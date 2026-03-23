<template>
  <div class="editor-container">
    <div v-if="loading" class="loading">
      <p>加载编辑器中...</p>
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

    const loadEditor = async () => {
      try {
        const res = await onlyofficeApi.getEditorConfig(decodedFilename, {
          id: 'CX',
          name: 'CX'
        })

        console.log('编辑器配置:', res.data)

        const { config } = res.data

        // 使用代理 URL 避免 CORS 问题
        const proxyEditorUrl = '/onlyoffice/web-apps/apps/api/documents/api.js'

        console.log('完整配置:', JSON.stringify(config, null, 2))
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
          },
          'onInfo': (event) => {
            console.log('OnlyOffice 信息:', event)
          }
        }

        // 先设置 loading 为 false，让编辑器容器渲染出来
        loading.value = false
        await nextTick()

        // 确保容器元素存在
        const container = document.getElementById('editor')
        console.log('编辑器容器:', container)

        if (!container) {
          throw new Error('编辑器容器未找到')
        }

        // 加载 OnlyOffice 脚本
        await loadOnlyOfficeScript(proxyEditorUrl)

        // 创建编辑器实例
        if (window.DocsAPI && window.DocsAPI.DocEditor) {
          console.log('开始创建编辑器...')
          docEditor = new window.DocsAPI.DocEditor('editor', config)
          console.log('编辑器已创建', docEditor)

          // 检查 DOM 变化
          if (container) {
            const observer = new MutationObserver(() => {
              const iframe = document.querySelector('#editor iframe')
              if (iframe) {
                console.log('iframe 已创建:', iframe.src)
                observer.disconnect()
              }
            })
            observer.observe(container, { childList: true, subtree: true })

            // 5 秒后检查是否渲染成功
            setTimeout(() => {
              const iframe = document.querySelector('#editor iframe')
              if (!iframe) {
                console.warn('编辑器 iframe 未创建，可能是配置问题')
                console.log('编辑器容器内容:', container.innerHTML.substring(0, 500))
              }
              observer.disconnect()
            }, 5000)
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

    const loadOnlyOfficeScript = (url) => {
      return new Promise((resolve, reject) => {
        if (window.DocsAPI) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = url
        script.async = true
        script.onload = resolve
        script.onerror = () => reject(new Error('加载 OnlyOffice 脚本失败'))
        document.head.appendChild(script)
      })
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

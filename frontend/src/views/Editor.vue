<template>
  <div class="editor-container" :class="{ 'panel-open': isPanelOpen }">
    <!-- 编辑器区域 -->
    <div class="editor-wrapper">
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>正在加载编辑器，请稍候...</p>
        <p class="loading-tip">首次加载可能需要 10-30 秒，后续访问会更快</p>
        <p class="loading-progress">{{ progressMessage }}</p>
      </div>
      <div v-if="error" class="error">
        <p>{{ error }}</p>
        <button class="btn" @click="goBack">返回</button>
      </div>
      <div id="editor"></div>
    </div>
    <!-- AI 流式面板 -->
    <AIStreamPanel v-model:open="isPanelOpen" @close="isPanelOpen = false" />
  </div>
</template>
<script>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onlyofficeApi } from '../api'
import AIStreamPanel from '../components/AIStreamPanel.vue'
import { generateEditorConfig, getPluginConfig } from '../utils/onlyofficeConfig'
// OnlyOffice 脚本缓存（页面级）
let docsApiPromise = null
export default {
  name: 'Editor',
  components: {
    AIStreamPanel
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const loading = ref(true)
    const error = ref(null)
    const progressMessage = ref('初始化中...')
    // 面板默认打开
    const isPanelOpen = ref(true)
    let docEditor = null
    let progressTimer = null
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
    // 👇 新增：消息监听函数
    const setupMessageListener = () => {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'insertText') {
          console.log('收到插入文本消息:', event.data.text)
          // 直接通过 iframe postMessage 转发
          const tryInsert = () => {
            const editorIframe = document.querySelector('#editor iframe')
            if (editorIframe && editorIframe.contentWindow) {
              editorIframe.contentWindow.postMessage({
                type: 'insertText',
                text: event.data.text
              }, '*')
              console.log('已转发消息给编辑器 iframe')
            } else {
              console.warn('未找到编辑器 iframe，500ms 后重试...')
              setTimeout(tryInsert, 500)
            }
          }
          tryInsert()
        }
      })
    }
    const loadEditor = async () => {
      try {
        // 预加载脚本（后台进行）
        const proxyEditorUrl = '/onlyoffice/web-apps/apps/api/documents/api.js'
        preloadOnlyOfficeScript(proxyEditorUrl)

        // 进度提示
        progressTimer = setInterval(() => {
          progressMessage.value = '正在加载编辑器资源...'
        }, 5000)

        // 在前端生成 OnlyOffice 配置
        const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000'
        const user = { id: 'CX', name: 'CX' }
        const { config, documentId } = generateEditorConfig(decodedFilename, user, appUrl)

        // 添加插件配置
        const pluginConfig = getPluginConfig()
        config.plugins = {
          [pluginConfig.guid]: {
            baseUrl: pluginConfig.baseUrl
          }
        }
        config.editorConfig.plugins = {
          pluginsData: pluginConfig.pluginsData
        }

        console.log('生成的配置:', config)
        console.log('Document ID:', documentId)
    // 添加事件回调到配置中
    config.events = {
      'onError': (event) => {
        console.error('编辑器错误:', event)
        error.value = '编辑器发生错误：' + JSON.stringify(event)
        loading.value = false
        if (progressTimer) clearInterval(progressTimer)
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
        if (progressTimer) clearInterval(progressTimer)
        setupMessageListener()  // 👈 编辑器就绪后才开始监听消息
      },
      'onInfo': (event) => {
        console.log('OnlyOffice 信息:', event)
      },
      'onLoadComponent': (event) => {
        console.log('组件加载:', event)
        progressMessage.value = '加载编辑器组件...'
      },
      'onRequestInsertText': (event) => {
        console.log('请求插入文本:', event)
      }
    }
    // 等待脚本加载完成
    await docsApiPromise
    progressMessage.value = '脚本加载完成，正在初始化编辑器...'
    // 确保容器元素存在（等待 Vue 渲染完成）
    await nextTick()
    const container = document.getElementById('editor')
    console.log('编辑器容器:', container)
    if (!container) {
      throw new Error('编辑器容器未找到')
    }
    // 创建编辑器实例
    if (window.DocsAPI && window.DocsAPI.DocEditor) {
      console.log('开始创建编辑器...')
      progressMessage.value = '正在创建编辑器实例...'
      docEditor = new window.DocsAPI.DocEditor('editor', config)
      console.log('编辑器已创建', docEditor)
      // 设置超时检测
      const loadTimeout = setTimeout(() => {
        const iframe = document.querySelector('#editor iframe')
        if (!iframe && loading.value) {
          console.warn('编辑器加载超时，检查 OnlyOffice 服务')
          error.value = '编辑器加载超时，请检查 OnlyOffice 服务是否正常运行'
          loading.value = false
          if (progressTimer) clearInterval(progressTimer)
        }
      }, 30000)
      // 检查 DOM 变化
      if (container) {
        const observer = new MutationObserver(() => {
          const iframe = document.querySelector('#editor iframe')
          if (iframe) {
            console.log('iframe 已创建:', iframe.src)
            progressMessage.value = '编辑器即将就绪...'
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
    if (progressTimer) clearInterval(progressTimer)
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
  if (progressTimer) {
    clearInterval(progressTimer)
  }
})
return {
  loading,
  error,
  progressMessage,
  isPanelOpen,
  goBack
}
}
}
</script>

<style scoped>
.editor-container {
display: flex;
width: 100%;
height: 100vh;
background: white;
overflow: hidden;
}

.editor-wrapper {
flex: 1;
position: relative;
height: 100%;
min-width: 0;
transition: width 0.3s ease;
}
/* 面板打开时，编辑器区域自动缩小 */
.editor-container.panel-open .editor-wrapper {
width: calc(100% - 400px);
}

/* 面板关闭时，编辑器占满全屏 */
.editor-container:not(.panel-open) .editor-wrapper {
width: 100%;
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

.loading-progress {
font-size: 0.75rem;
color: #999;
margin-top: 0.5rem;
}

.error {
color: #dc3545;
}

#editor {
width: 100%;
height: 100%;
}

/* loading 时遮挡编辑器 */
.loading {
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
background: white;
z-index: 10;
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
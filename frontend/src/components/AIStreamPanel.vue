<template>
  <div class="ai-stream-panel" :class="{ 'open': isOpen }">
    <div class="panel-header">
      <h3>AI 写作助手</h3>
      <button class="close-btn" @click="togglePanel" :title="isOpen ? '收起面板' : '展开面板'">
        <svg v-if="isOpen" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
          <polyline points="19 18 13 12 19 6"></polyline>
        </svg>
      </button>
    </div>

    <div class="panel-content" v-show="isOpen">
      <div class="subtitle">输入提示词，AI 将自动写作并插入到文档</div>

      <textarea
        v-model="prompt"
        placeholder="请输入提示词，例如：&#10;写一篇关于人工智能的科普文章...&#10;生成一份产品需求文档模板...&#10;写一封商务邮件..."
        :disabled="isGenerating"
      ></textarea>

      <div class="btn-group">
        <button class="btn btn-primary" @click="startGenerate" :disabled="isGenerating">
          {{ isGenerating ? '生成中...' : '开始生成' }}
        </button>
        <button class="btn btn-danger" @click="stopGenerate" :disabled="!isGenerating">
          停止
        </button>
      </div>

      <div class="status" :class="statusClass">
        <span>{{ statusText }}</span>
        <div v-if="insertedCount > 0" class="progress-info">
          已插入 {{ insertedCount }} 字
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="tip">
        <p>正在使用剪贴板 API 插入文本到编辑器</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'close'])

const prompt = ref('')
const isGenerating = ref(false)
const statusText = ref('就绪')
const statusClass = ref('')
const insertedCount = ref(0)

let eventSource = null
let messageListener = null
let typewriterQueue = []
let isTyping = false

// 同步 isOpen 状态
const isOpen = ref(props.open)
watch(() => props.open, (val) => {
  isOpen.value = val
})

const togglePanel = () => {
  emit('update:open', !isOpen.value)
}

const closePanel = () => {
  emit('update:open', false)
  emit('close')
}

/**
 * 打字机效果：逐字插入内容
 */
const processTypewriterQueue = () => {
  if (typewriterQueue.length === 0) {
    isTyping = false
    return
  }

  isTyping = true

  // 每次处理 1-3 个字
  const chunkSize = Math.min(Math.floor(Math.random() * 3) + 1, typewriterQueue.length)
  const chunk = typewriterQueue.slice(0, chunkSize).join('')
  typewriterQueue = typewriterQueue.slice(chunkSize)

  // 发送字符给插件插入到编辑器
  insertTextToEditor(chunk)

  insertedCount.value += chunk.length
  statusText.value = `正在插入... ${insertedCount.value} 字`

  // 继续处理队列，50-80ms 间隔模拟打字机效果
  setTimeout(processTypewriterQueue, Math.floor(Math.random() * 30) + 50)
}

const startGenerate = () => {
  if (isGenerating.value) return

  const promptText = prompt.value || '生成一篇示例文章'
  insertedCount.value = 0
  typewriterQueue = []
  statusText.value = '正在连接 AI 服务...'
  statusClass.value = 'generating'
  isGenerating.value = true
  isTyping = false

  // 连接后端 SSE 接口
  eventSource = new EventSource('/api/stream/generate?prompt=' + encodeURIComponent(promptText))

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'content') {
      // 将收到的字符加入队列
      const chars = Array.from(data.chunk)
      typewriterQueue.push(...chars)

      statusText.value = `接收中... 队列 ${typewriterQueue.length} 字`

      // 如果打字机没有在运行，启动它
      if (!isTyping) {
        processTypewriterQueue()
      }
    } else if (data.type === 'done') {
      // 等待队列处理完成
      const checkQueueEmpty = setInterval(() => {
        if (typewriterQueue.length === 0 && !isTyping) {
          clearInterval(checkQueueEmpty)
          stopGenerate()
          statusText.value = '生成完成！'
          statusClass.value = 'done'
        }
      }, 100)
    }
  }

  eventSource.onerror = (error) => {
    console.error('SSE 错误:', error)
    statusText.value = '生成失败，请重试'
    statusClass.value = 'error'
    stopGenerate()
  }
}

const stopGenerate = () => {
  if (!isGenerating.value) return

  if (eventSource) {
    eventSource.close()
    eventSource = null
  }

  isGenerating.value = false
  typewriterQueue = []
  isTyping = false

  if (statusText.value.includes('接收中') || statusText.value.includes('正在插入')) {
    statusText.value = '已停止'
    statusClass.value = ''
  }
}

/**
 * 插入文本到 OnlyOffice 编辑器
 */
const insertTextToEditor = (text) => {
  console.log('[Panel] 准备插入文本:', text)

  // 发送给父窗口（Editor.vue），由它转发给编辑器 iframe
  window.parent.postMessage({
    type: 'insertText',
    text: text
  }, '*')
  
  console.log('[Panel] 已发送消息给父窗口')
}

onMounted(() => {
  // 监听来自插件的消息
  messageListener = (event) => {
    if (event.data && event.data.type === 'fromPlugin') {
      console.log('收到插件消息:', event.data)
    }
  }
  window.addEventListener('message', messageListener)
})

onBeforeUnmount(() => {
  if (eventSource) {
    eventSource.close()
  }
  if (messageListener) {
    window.removeEventListener('message', messageListener)
  }
})
</script>

<style scoped>
.ai-stream-panel {
  position: relative;
  width: 400px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.ai-stream-panel.open {
  width: 400px;
}

.ai-stream-panel:not(.open) {
  width: 60px;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

/* 面板收起时的样式 */
.ai-stream-panel:not(.open) .panel-header {
  justify-content: center;
  padding: 16px 0;
  border-bottom: none;
}

.ai-stream-panel:not(.open) .panel-header h3 {
  display: none;
}

.ai-stream-panel:not(.open) .close-btn {
  width: 36px;
  height: 36px;
}

.ai-stream-panel:not(.open) .panel-content {
  display: none;
}

.panel-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subtitle {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

textarea {
  width: 100%;
  height: 120px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

textarea:focus {
  outline: none;
  border-color: #446e96;
  box-shadow: 0 0 0 2px rgba(68, 110, 150, 0.2);
}

textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #446e96;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3a5a7a;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.status {
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  min-height: 50px;
  background: #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status.generating {
  background: #e3f2fd;
  color: #1976d2;
}

.status.done {
  background: #e8f5e9;
  color: #388e3c;
}

.status.error {
  background: #ffebee;
  color: #c62828;
}

.progress-info {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
}

.tip {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
}

.tip p {
  margin: 0;
  text-align: center;
}
</style>

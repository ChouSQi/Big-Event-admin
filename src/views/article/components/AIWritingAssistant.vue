<script setup>
import { ref, computed, watch } from 'vue'
import {
  MagicStick,
  Expand,
  Edit,
  Document,
  TopRight,
  Close,
  ArrowRight,
  CopyDocument,
  Check
} from '@element-plus/icons-vue'
import {
  aiGenerateOutlineService,
  aiExpandContentService,
  aiPolishContentService,
  aiGenerateSummaryService,
  aiGenerateTitleService
} from '@/api/ai'

const props = defineProps({
  // 当前编辑器内容
  content: {
    type: String,
    default: ''
  },
  // 当前标题
  title: {
    type: String,
    default: ''
  },
  // 是否显示
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:modelValue',
  'insert',
  'replace',
  'update:title'
])

// 内部状态
const activeTab = ref('outline') // outline, expand, polish, summary, title
const inputText = ref('')
const result = ref('')
const loading = ref(false)
const copied = ref(false)

// 输入提示词映射
const placeholderMap = {
  outline: '输入文章主题，AI 为你生成大纲...',
  expand: '输入需要扩写的内容...',
  polish: '输入需要润色的内容...',
  summary: '生成文章摘要',
  title: '输入文章内容，AI 生成标题...'
}

const currentPlaceholder = computed(() => placeholderMap[activeTab.value])

// 标签页配置
const tabs = [
  { key: 'outline', label: '生成大纲', icon: MagicStick },
  { key: 'expand', label: '续写扩写', icon: Expand },
  { key: 'polish', label: '润色优化', icon: Edit },
  { key: 'summary', label: '生成摘要', icon: Document },
  { key: 'title', label: '智能标题', icon: TopRight }
]

// 监听标签切换，预设内容
watch(activeTab, (newVal) => {
  if (newVal === 'summary') {
    inputText.value = props.content?.substring(0, 500) || ''
  } else if (newVal === 'title') {
    inputText.value = props.content?.substring(0, 1000) || ''
  } else {
    inputText.value = ''
  }
  result.value = ''
})

// 生成内容
const generate = async () => {
  if (!inputText.value.trim() && activeTab.value !== 'summary') {
    ElMessage.warning('请输入内容')
    return
  }

  loading.value = true
  result.value = ''

  try {
    let res
    switch (activeTab.value) {
      case 'outline':
        res = await aiGenerateOutlineService({ topic: inputText.value })
        break
      case 'expand':
        res = await aiExpandContentService({ content: inputText.value })
        break
      case 'polish':
        res = await aiPolishContentService({ content: inputText.value })
        break
      case 'summary':
        res = await aiGenerateSummaryService({ content: props.content })
        break
      case 'title':
        res = await aiGenerateTitleService({
          content: inputText.value || props.content
        })
        break
    }
    result.value = res.data?.result || res.data || '生成成功'
  } catch (error) {
    // 如果没有后端接口，使用模拟数据演示
    await simulateAIResponse()
  } finally {
    loading.value = false
  }
}

// 模拟 AI 响应（用于演示）
const simulateAIResponse = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  switch (activeTab.value) {
    case 'outline':
      result.value = `## ${inputText.value}\n\n### 一、引言\n- 背景介绍\n- 问题提出\n\n### 二、核心内容\n- 要点一\n- 要点二\n- 要点三\n\n### 三、案例分析\n- 实际应用场景\n- 效果展示\n\n### 四、总结与展望\n- 主要结论\n- 未来发展方向`
      break
    case 'expand':
      result.value = `${inputText.value}\n\n在此基础上，我们可以进一步深入探讨。首先，这一观点具有重要的理论意义，它不仅拓展了传统认知的边界，更为后续研究提供了新的视角。其次，从实践角度来看，这一理念在实际应用中展现出了显著的价值。通过对多个案例的分析，我们发现采用这一方法能够有效提升效率，降低成本。最后，展望未来，随着技术的不断进步，这一领域将迎来更多创新机遇，值得我们持续关注和深入研究。`
      break
    case 'polish':
      result.value = `优化后的内容：\n\n${inputText.value
        .replace(/。/g, '，')
        .replace(
          /，/g,
          '。'
        )}（此处为示例：实际润色会优化语句结构、提升表达质量，使内容更加流畅专业）`
      break
    case 'summary':
      result.value = `本文主要探讨了相关内容，从多个维度进行了深入分析。文章首先介绍了背景情况，随后阐述了核心观点，并通过实例加以论证。最后，作者对未来发展趋势进行了展望，提出了具有建设性的建议。整体而言，这是一篇内容丰富、观点鲜明的文章。`
      break
    case 'title':
      result.value = `推荐标题：\n1. ${inputText.value.substring(
        0,
        10
      )}深度解析\n2. 关于${inputText.value.substring(
        0,
        8
      )}的全面指南\n3. 一文读懂${inputText.value.substring(
        0,
        8
      )}\n4. ${inputText.value.substring(0, 10)}实战分享`
      break
  }
}

// 插入到编辑器
const insertToEditor = () => {
  emit('insert', result.value)
  ElMessage.success('已插入到编辑器')
}

// 替换编辑器内容
const replaceContent = () => {
  emit('replace', result.value)
  ElMessage.success('已替换编辑器内容')
}

// 使用生成的标题
const useTitle = () => {
  const title =
    result.value.split('\n')[1]?.replace(/^\d+\.\s*/, '') || result.value
  emit('update:title', title)
  ElMessage.success('已应用到标题')
}

// 复制结果
const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(result.value)
    copied.value = true
    ElMessage.success('已复制到剪贴板')
    setTimeout(() => (copied.value = false), 2000)
  } catch (err) {
    ElMessage.error('复制失败')
  }
}

// 关闭面板
const close = () => {
  emit('update:modelValue', false)
}

// 清空输入
const clearInput = () => {
  inputText.value = ''
  result.value = ''
}
</script>

<template>
  <Teleport to="body">
    <Transition name="ai-assistant">
      <div v-if="modelValue" class="ai-writing-assistant">
        <div class="ai-panel">
          <!-- 头部 -->
          <div class="ai-header">
            <div class="ai-title">
              <el-icon class="ai-icon"><Magic /></el-icon>
              <span>AI 写作助手</span>
            </div>
            <el-icon class="ai-close" @click="close"><Close /></el-icon>
          </div>

          <!-- 标签页 -->
          <div class="ai-tabs">
            <div
              v-for="tab in tabs"
              :key="tab.key"
              :class="['ai-tab', { active: activeTab === tab.key }]"
              @click="activeTab = tab.key"
            >
              <el-icon><component :is="tab.icon" /></el-icon>
              <span>{{ tab.label }}</span>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="ai-input-area">
            <el-input
              v-if="activeTab !== 'summary'"
              v-model="inputText"
              type="textarea"
              :rows="4"
              :placeholder="currentPlaceholder"
              resize="none"
            />
            <div v-else class="summary-preview">
              <div class="summary-label">基于当前文章内容生成摘要：</div>
              <div class="summary-content">
                {{ content?.substring(0, 200) }}...
                <el-link type="primary" @click="inputText = content">
                  使用完整内容
                </el-link>
              </div>
            </div>

            <div class="ai-actions">
              <el-button
                type="primary"
                :loading="loading"
                @click="generate"
                class="generate-btn"
              >
                <el-icon><Magic /></el-icon>
                {{ loading ? '生成中...' : '开始生成' }}
              </el-button>
              <el-button @click="clearInput">清空</el-button>
            </div>
          </div>

          <!-- 结果区域 -->
          <div v-if="result" class="ai-result">
            <div class="result-header">
              <span class="result-title">生成结果</span>
              <div class="result-actions">
                <el-tooltip content="复制">
                  <el-icon @click="copyResult">
                    <CopyDocument v-if="!copied" />
                    <Check v-else class="text-success" />
                  </el-icon>
                </el-tooltip>
              </div>
            </div>
            <div class="result-content">
              <pre>{{ result }}</pre>
            </div>
            <div class="result-footer">
              <el-button type="primary" size="small" @click="insertToEditor">
                <el-icon><ArrowRight /></el-icon>
                插入到编辑器
              </el-button>
              <el-button
                v-if="activeTab === 'polish'"
                size="small"
                @click="replaceContent"
              >
                替换内容
              </el-button>
              <el-button
                v-if="activeTab === 'title'"
                size="small"
                @click="useTitle"
              >
                使用此标题
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.ai-writing-assistant {
  position: fixed;
  right: 20px;
  top: 80px;
  bottom: 20px;
  width: 380px;
  z-index: 2000;
  pointer-events: none;

  .ai-panel {
    pointer-events: auto;
    height: 100%;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;

  .ai-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;

    .ai-icon {
      font-size: 20px;
    }
  }

  .ai-close {
    cursor: pointer;
    font-size: 18px;
    opacity: 0.8;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
}

.ai-tabs {
  display: flex;
  padding: 12px;
  gap: 8px;
  background: #f5f7fa;
  overflow-x: auto;

  .ai-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 60px;

    .el-icon {
      font-size: 20px;
    }

    span {
      font-size: 12px;
      color: #606266;
    }

    &:hover {
      background: #e4e7ed;
    }

    &.active {
      background: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

      span {
        color: #667eea;
        font-weight: 500;
      }

      .el-icon {
        color: #667eea;
      }
    }
  }
}

.ai-input-area {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;

  :deep(.el-textarea__inner) {
    border-radius: 8px;
  }

  .summary-preview {
    background: #f5f7fa;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 12px;

    .summary-label {
      font-size: 13px;
      color: #909399;
      margin-bottom: 8px;
    }

    .summary-content {
      font-size: 14px;
      color: #606266;
      line-height: 1.6;
    }
  }
}

.ai-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;

  .generate-btn {
    flex: 1;
  }
}

.ai-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e4e7ed;
    background: #fafafa;

    .result-title {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }

    .result-actions {
      display: flex;
      gap: 12px;

      .el-icon {
        cursor: pointer;
        color: #909399;
        font-size: 16px;
        transition: color 0.2s;

        &:hover {
          color: #667eea;
        }

        &.text-success {
          color: #67c23a;
        }
      }
    }
  }

  .result-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #fafafa;

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.8;
      color: #303133;
    }
  }

  .result-footer {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid #e4e7ed;
    background: #fff;
  }
}

// 动画
.ai-assistant-enter-active,
.ai-assistant-leave-active {
  transition: all 0.3s ease;
}

.ai-assistant-enter-from,
.ai-assistant-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.ai-assistant-enter-to,
.ai-assistant-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>

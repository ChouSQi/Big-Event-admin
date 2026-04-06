// ai.js - 直接调用 DeepSeek API 的版本

// DeepSeek API 配置（从环境变量读取）
const DEEPSEEK_API_URL =
  import.meta.env.VITE_DEEPSEEK_API_URL ||
  'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY

// 检查 API Key 是否配置
if (!DEEPSEEK_API_KEY) {
  console.error(
    '错误：未配置 DeepSeek API Key，请在 .env 文件中设置 VITE_DEEPSEEK_API_KEY'
  )
}

/**
 * 通用的 AI 调用函数
 * @param {string} prompt - 用户输入的提示词
 * @param {string} systemPrompt - 系统角色设定（可选）
 * @returns {Promise<string>} AI 返回的内容
 */
async function callDeepSeek(
  prompt,
  systemPrompt = '你是一个专业的文章写作助手'
) {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API 调用失败')
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error)
    throw error
  }
}

// ========== 以下是你的业务函数，直接复用上面的通用函数 ==========

// 生成文章大纲
export const aiGenerateOutlineService = async (data) => {
  const prompt = `请为以下主题生成一个详细的文章大纲：${
    data.topic || data.prompt
  }\n\n要求：层次分明，包含主要章节和要点。`
  const result = await callDeepSeek(prompt)
  return { data: { result: result } }
}

// 续写/扩写内容
export const aiExpandContentService = async (data) => {
  const prompt = `请根据以下内容进行续写和扩写，保持风格一致：\n\n${data.content}`
  const result = await callDeepSeek(prompt)
  return { data: { result: result } }
}

// 润色文案
export const aiPolishContentService = async (data) => {
  const prompt = `请润色以下文案，使其更流畅、专业：\n\n${data.content}`
  const result = await callDeepSeek(prompt)
  return { data: { result: result } }
}

// 生成摘要
export const aiGenerateSummaryService = async (data) => {
  const prompt = `请为以下文章生成一个简洁的摘要：\n\n${data.content}`
  const result = await callDeepSeek(prompt)
  return { data: { result: result } }
}

// 生成标题
export const aiGenerateTitleService = async (data) => {
  const prompt = `请根据以下文章内容，生成 3-5 个吸引人的标题：\n\n${data.content}`
  const result = await callDeepSeek(prompt)
  return { data: { result: result } }
}

// 流式生成（SSE）- 用于实时显示
export const aiStreamGenerateService = (params) => {
  // 流式调用需要使用 fetch + ReadableStream，不能用 EventSource
  // 因为 EventSource 不支持 POST 请求和自定义 headers

  const { prompt, onChunk, onComplete, onError } = params

  fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      stream: true // 开启流式输出
    })
  })
    .then(async (response) => {
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let isReading = true

      while (isReading) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              onComplete && onComplete()
              return
            }
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content || ''
              onChunk && onChunk(content)
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    })
    .catch((error) => {
      console.error('流式调用失败:', error)
      onError && onError(error)
    })

  // 返回一个模拟的 EventSource 对象（用于兼容原有代码）
  return {
    close: () => {}
  }
}

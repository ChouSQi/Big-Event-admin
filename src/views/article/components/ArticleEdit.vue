<script setup>
import { ref } from 'vue'
import ChannelSelect from './ChannelSelect.vue'
import AIWritingAssistant from './AIWritingAssistant.vue'
import { Plus, MagicStick } from '@element-plus/icons-vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import {
  artPublishService,
  artGetDetailService,
  artEditService
} from '@/api/article'
import { baseURL } from '@/utils/request'
import axios from 'axios'
const visibleDrawer = ref(false)
const showAIAssistant = ref(false)
const defaultForm = {
  title: '',
  cate_id: '',
  cover_img: '',
  content: '',
  state: ''
}
const formModel = ref({ ...defaultForm })
// 图片上传相关逻辑
const imgUrl = ref('')
const onSelectFile = (uploadFile) => {
  imgUrl.value = URL.createObjectURL(uploadFile.raw) // 预览图片
  // 立刻将图片对象，存入 formModel.value.cover_img 将来用于提交
  formModel.value.cover_img = uploadFile.raw
}
const emit = defineEmits(['success'])
const onPublish = async (state) => {
  // 将已发布还是草稿状态，存入 state
  formModel.value.state = state
  // 转换 formData 数据
  const fd = new FormData()
  for (let key in formModel.value) {
    fd.append(key, formModel.value[key])
  }
  if (formModel.value.id) {
    await artEditService(fd)
    ElMessage.success('编辑成功')
    visibleDrawer.value = false
    showAIAssistant.value = false
    emit('success', 'edit')
  } else {
    await artPublishService(fd)
    ElMessage.success('添加成功')
    visibleDrawer.value = false
    showAIAssistant.value = false
    emit('success', 'add')
  }
}
const editorRef = ref()
const open = async (row) => {
  visibleDrawer.value = true
  showAIAssistant.value = false
  if (row.id) {
    // console.log('编辑回显')
    const res = await artGetDetailService(row.id)
    formModel.value = res.data.data
    // 图片
    imgUrl.value = baseURL + formModel.value.cover_img
    const file = await imageUrlToFileObject(
      imgUrl.value,
      formModel.value.cover_img
    )
    formModel.value.cover_img = file
  } else {
    console.log('添加功能')
    formModel.value = { ...defaultForm }
    imgUrl.value = ''
    editorRef.value.setHTML = ''
  }
}
// 将网络图片地址转换为 File 对象的函数
async function imageUrlToFileObject(imageUrl, filename) {
  try {
    // 使用 Axios 下载图片数据
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    // 将下载的数据转换成 Blob 对象
    const blob = new Blob([response.data], {
      type: response.headers['content-type']
    })
    // 创建 File 对象
    const file = new File([blob], filename, {
      type: response.headers['content-type']
    })
    return file
  } catch (error) {
    console.error('Error converting image URL to File object:', error)
    return null
  }
}
// AI 助手相关方法
const onAIInsert = (content) => {
  // 在光标位置插入内容
  const quill = editorRef.value.getQuill()
  const range = quill.getSelection()
  if (range) {
    quill.insertText(range.index, content)
  } else {
    // 如果没有选中位置，在末尾插入
    formModel.value.content += content
  }
}
const onAIReplace = (content) => {
  // 替换编辑器内容
  formModel.value.content = content
}
const onAIUpdateTitle = (title) => {
  // 更新标题
  formModel.value.title = title
}
defineExpose({
  open
})
</script>
<template>
  <el-drawer
    v-model="visibleDrawer"
    :title="formModel.id ? '编辑文章' : '添加文章'"
    direction="rtl"
    size="50%"
  >
    <!-- 发表文章表单 -->
    <el-form :model="formModel" ref="formRef" label-width="100px">
      <el-form-item label="文章标题" prop="title">
        <el-input v-model="formModel.title" placeholder="请输入标题"></el-input>
      </el-form-item>
      <el-form-item label="文章分类" prop="cate_id">
        <channel-select
          v-model="formModel.cate_id"
          width="100%"
        ></channel-select>
      </el-form-item>
      <el-form-item label="文章封面" prop="cover_img">
        <el-upload
          class="avatar-uploader"
          :show-file-list="false"
          :auto-upload="false"
          :on-change="onSelectFile"
        >
          <img v-if="imgUrl" :src="imgUrl" class="avatar" />
          <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
        </el-upload>
      </el-form-item>
      <el-form-item label="文章内容" prop="content">
        <div class="editor-wrapper">
          <div class="editor-toolbar">
            <el-button
              type="primary"
              size="small"
              @click="showAIAssistant = !showAIAssistant"
              :class="{ active: showAIAssistant }"
            >
              <el-icon><MagicStick /></el-icon>
              {{ showAIAssistant ? '关闭 AI 助手' : 'AI 写作助手' }}
            </el-button>
          </div>
          <div class="editor">
            <quill-editor
              ref="editorRef"
              theme="snow"
              v-model:content="formModel.content"
              contentType="html"
            ></quill-editor>
          </div>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button @click="onPublish('已发布')" type="primary">发布</el-button>
        <el-button @click="onPublish('草稿')" type="info">草稿</el-button>
      </el-form-item>
    </el-form>
  </el-drawer>
  <!-- AI 写作助手 -->
  <AIWritingAssistant
    v-model="showAIAssistant"
    :content="formModel.content"
    :title="formModel.title"
    @insert="onAIInsert"
    @replace="onAIReplace"
    @update:title="onAIUpdateTitle"
  />
</template>
<style lang="scss" scoped>
.avatar-uploader {
  :deep() {
    .avatar {
      width: 178px;
      height: 178px;
      display: block;
    }
    .el-upload {
      border: 1px dashed var(--el-border-color);
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: var(--el-transition-duration-fast);
    }
    .el-upload:hover {
      border-color: var(--el-color-primary);
    }
    .el-icon.avatar-uploader-icon {
      font-size: 28px;
      color: #8c939d;
      width: 178px;
      height: 178px;
      text-align: center;
    }
  }
}
.editor-wrapper {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;

  .editor-toolbar {
    padding: 8px 12px;
    background: #f5f7fa;
    border-bottom: 1px solid #e4e7ed;
    display: flex;
    gap: 8px;

    .el-button {
      &.active {
        background: #f0f9ff;
        border-color: #409eff;
        color: #409eff;
      }
    }
  }
}
.editor {
  width: 100%;
  :deep(.ql-editor) {
    min-height: 200px;
  }
}
</style>

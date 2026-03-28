<script setup>
import { artGetChannelsService } from '../../../api/article'
import { ref } from 'vue'

defineProps({
  cid: {
    type: [Number, String]
  },
  width: {
    type: String
  }
})

const emit = defineEmits(['update:cid'])

const channelList = ref([])
const getChannelList = async () => {
  const res = await artGetChannelsService()
  channelList.value = res.data.data
}
getChannelList()
</script>

<template>
  <el-select
    :modelValue="cid"
    @update:modelValue="emit('update:cid', $event)"
    :style="{ width }"
  >
    <!-- value 提交给后台 -->
    <el-option
      v-for="channel in channelList"
      :key="channel.id"
      :label="channel.cate_name"
      :value="channel.id"
    ></el-option>
  </el-select>
</template>

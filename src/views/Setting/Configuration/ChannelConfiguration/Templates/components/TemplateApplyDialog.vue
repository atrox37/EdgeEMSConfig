<template>
  <FormDialog ref="dialogRef" title="Apply Template" width="520px">
    <template #dialog-body>
      <el-form :model="form" label-width="120px">
        <el-form-item label="Template:">
          <el-select v-model="form.template_id" filterable clearable placeholder="Select template">
            <el-option
              v-for="template in templateList"
              :key="template.template_id"
              :label="template.name"
              :value="template.template_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Target Channel:">
          <el-select v-model="form.channel_id" filterable clearable placeholder="Select channel">
            <el-option
              v-for="channel in channelOptions"
              :key="channel.id"
              :label="channel.name"
              :value="channel.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </template>
    <template #dialog-footer>
      <el-button @click="close">Cancel</el-button>
      <el-button type="primary" @click="submit">Apply</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type { ChannelTemplateListItem } from '@/types/channelTemplates'

const props = defineProps<{
  templateList: ChannelTemplateListItem[]
  channelOptions: Array<{ id: number; name: string }>
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { template_id: number; channel_id: number }): void
}>()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const form = ref<{ template_id: number | null; channel_id: number | null }>({
  template_id: null,
  channel_id: null,
})

const open = (templateId?: number | null, channelId?: number | null) => {
  form.value = {
    template_id: templateId ?? null,
    channel_id: channelId ?? null,
  }
  if (dialogRef.value) dialogRef.value.dialogVisible = true
}

const close = () => {
  if (dialogRef.value) dialogRef.value.dialogVisible = false
}

const submit = () => {
  if (!form.value.template_id) {
    ElMessage.warning('Template is required')
    return
  }
  if (!form.value.channel_id) {
    ElMessage.warning('Target Channel is required')
    return
  }
  emit('submit', {
    template_id: form.value.template_id,
    channel_id: form.value.channel_id,
  })
}

defineExpose({
  open,
  close,
})
</script>

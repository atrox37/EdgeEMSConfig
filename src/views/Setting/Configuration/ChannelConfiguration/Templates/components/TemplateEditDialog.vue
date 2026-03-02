<template>
  <FormDialog ref="dialogRef" title="Edit Template" width="520px">
    <template #dialog-body>
      <el-form :model="form" label-width="110px">
        <el-form-item label="Name:">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Description:">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
    </template>
    <template #dialog-footer>
      <el-button @click="close">Cancel</el-button>
      <el-button type="primary" @click="submit">Submit</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type { ChannelTemplateListItem } from '@/types/channelTemplates'

const emit = defineEmits<{
  (e: 'submit', payload: { template_id: number; name: string; description: string }): void
}>()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const form = ref<{ template_id: number; name: string; description: string }>({
  template_id: 0,
  name: '',
  description: '',
})

const open = (row: ChannelTemplateListItem) => {
  form.value = {
    template_id: row.template_id,
    name: row.name,
    description: row.description || '',
  }
  if (dialogRef.value) dialogRef.value.dialogVisible = true
}

const close = () => {
  if (dialogRef.value) dialogRef.value.dialogVisible = false
}

const submit = () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('Name is required')
    return
  }
  if (!form.value.description.trim()) {
    ElMessage.warning('Description is required')
    return
  }
  emit('submit', {
    template_id: form.value.template_id,
    name: form.value.name.trim(),
    description: form.value.description.trim(),
  })
}

defineExpose({
  open,
  close,
})
</script>

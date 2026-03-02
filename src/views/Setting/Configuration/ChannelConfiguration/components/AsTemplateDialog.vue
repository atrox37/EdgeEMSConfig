<template>
  <FormDialog ref="dialogRef" title="As Template" width="560px">
    <template #dialog-body>
      <el-form :model="form" label-width="120px">
        <el-form-item label="Channel:">
          <el-input :model-value="form.channel_name" disabled />
        </el-form-item>
        <el-form-item label="Name:">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Description:">
          <el-input v-model="form.description" type="textarea" :rows="2" />
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

const emit = defineEmits<{
  (
    e: 'submit',
    payload: {
      channel_id: number
      channel_name: string
      name: string
      description: string
      protocol: string
    },
  ): void
}>()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const form = ref({
  channel_id: 0,
  channel_name: '',
  name: '',
  description: '',
  protocol: '',
})

const open = (payload: { channel_id: number; channel_name: string; protocol: string }) => {
  form.value = {
    channel_id: payload.channel_id,
    channel_name: payload.channel_name,
    name: `${payload.channel_name}-Template`,
    description: '',
    protocol: payload.protocol,
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
    channel_id: form.value.channel_id,
    channel_name: form.value.channel_name,
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    protocol: form.value.protocol,
  })
}

defineExpose({
  open,
  close,
})
</script>

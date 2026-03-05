<template>
  <FormDialog ref="dialogRef" title="Edit Template" width="520px">
    <template #dialog-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="Name:" prop="name" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Description:">
          <el-input v-model="form.description" type="textarea" :rows="3" resize="none" />
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
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type { ChannelTemplateListItem } from '@/types/channelTemplates'

const emit = defineEmits<{
  (e: 'submit', payload: { template_id: number; name: string; description: string }): void
}>()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const formRef = ref<FormInstance>()
const form = ref<{ template_id: number; name: string; description: string }>({
  template_id: 0,
  name: '',
  description: '',
})
const rules: FormRules = {
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
}

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

const submit = async () => {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return
  emit('submit', {
    template_id: form.value.template_id,
    name: form.value.name.trim(),
    description: form.value.description,
  })
}

defineExpose({
  open,
  close,
})
</script>

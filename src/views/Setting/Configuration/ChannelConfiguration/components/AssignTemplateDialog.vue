<template>
  <FormDialog ref="dialogRef" title="Assign Template" width="520px">
    <template #dialog-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="Channel:" prop="channel_name" required>
          <el-input :model-value="form.channel_name" disabled />
        </el-form-item>
        <el-form-item label="Template:" prop="template_id" required>
          <el-select
            v-model="form.template_id"
            :fit-input-width="true"
            filterable
            clearable
            placeholder="Select template"
          >
            <el-option
              v-for="template in matchedTemplateOptions"
              :key="template.template_id"
              :label="template.name"
              :value="template.template_id"
            />
          </el-select>
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
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type { ChannelTemplateListItem } from '@/types/channelTemplates'

const props = defineProps<{
  templateOptions: ChannelTemplateListItem[]
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { channel_id: number; channel_name: string; template_id: number }): void
}>()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const formRef = ref<FormInstance>()
const form = ref({
  channel_id: 0,
  channel_name: '',
  channel_protocol: '',
  template_id: null as number | null,
})
const rules: FormRules = {
  channel_name: [{ required: true, message: 'Channel is required', trigger: 'change' }],
  channel_protocol: [{ required: true, message: 'Channel protocol is required', trigger: 'change' }],
  template_id: [{ required: true, message: 'Template is required', trigger: 'change' }],
}

const matchedTemplateOptions = computed(() =>
  props.templateOptions.filter(template => template.protocol === form.value.channel_protocol),
)

const open = (payload: { channel_id: number; channel_name: string; channel_protocol: string }) => {
  form.value = {
    channel_id: payload.channel_id,
    channel_name: payload.channel_name,
    channel_protocol: payload.channel_protocol,
    template_id: null,
  }
  if (dialogRef.value) dialogRef.value.dialogVisible = true
}

const close = () => {
  if (dialogRef.value) dialogRef.value.dialogVisible = false
}

const submit = async () => {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return
  const selectedTemplate = matchedTemplateOptions.value.find(
    template => template.template_id === Number(form.value.template_id),
  )
  if (!selectedTemplate) {
    ElMessage.warning('Template protocol must match channel protocol')
    return
  }
  emit('submit', {
    channel_id: form.value.channel_id,
    channel_name: form.value.channel_name,
    template_id: Number(form.value.template_id),
  })
}

defineExpose({
  open,
  close,
})
</script>

<style scoped lang="scss"></style>

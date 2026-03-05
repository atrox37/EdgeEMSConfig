<template>
  <FormDialog ref="dialogRef" title="Apply Template" width="520px">
    <template #dialog-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="Template:" prop="template_id" required>
          <el-select v-model="form.template_id" :fit-input-width="true" filterable clearable placeholder="Select template">
            <el-option
              v-for="template in templateList"
              :key="template.template_id"
              :label="template.name"
              :value="template.template_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Target Channel:" prop="channel_id" required>
          <el-select v-model="form.channel_id" :fit-input-width="true" filterable clearable placeholder="Select channel">
            <el-option
              v-for="channel in filteredChannelOptions"
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
import { computed, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type { ChannelTemplateListItem } from '@/types/channelTemplates'

const props = defineProps<{
  templateList: ChannelTemplateListItem[]
  channelOptions: Array<{ id: number; name: string; protocol: string }>
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { template_id: number; channel_id: number }): void
}>()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const formRef = ref<FormInstance>()
const form = ref<{ template_id: number | null; channel_id: number | null }>({
  template_id: null,
  channel_id: null,
})
const rules: FormRules = {
  template_id: [{ required: true, message: 'Template is required', trigger: 'change' }],
  channel_id: [{ required: true, message: 'Target Channel is required', trigger: 'change' }],
}

const selectedTemplateProtocol = computed(() => {
  const selected = props.templateList.find(item => item.template_id === Number(form.value.template_id))
  return selected?.protocol || ''
})

const filteredChannelOptions = computed(() => {
  if (!selectedTemplateProtocol.value) return props.channelOptions
  return props.channelOptions.filter(channel => channel.protocol === selectedTemplateProtocol.value)
})

watch(
  () => form.value.template_id,
  () => {
    if (form.value.channel_id == null) return
    const isMatch = filteredChannelOptions.value.some(channel => channel.id === Number(form.value.channel_id))
    if (!isMatch) {
      form.value.channel_id = null
    }
  },
)

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

const submit = async () => {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return
  emit('submit', {
    template_id: Number(form.value.template_id),
    channel_id: Number(form.value.channel_id),
  })
}

defineExpose({
  open,
  close,
})
</script>

<template>
  <FormDialog ref="dialogRef" title="Assign Template" width="520px">
    <template #dialog-body>
      <el-form :model="form" label-width="120px">
        <el-form-item label="Channel:">
          <el-input :model-value="form.channel_name" disabled />
        </el-form-item>
        <el-form-item label="Template:">
          <el-select
            v-model="form.template_id"
            filterable
            clearable
            placeholder="Select template"
            class="template-select"
            popper-class="template-option-popper"
          >
            <el-option
              v-for="template in templateOptions"
              :key="template.template_id"
              :label="template.name"
              :value="template.template_id"
            >
              <div class="template-option">
                <div class="template-option__name">{{ template.name }}</div>
                <div class="template-option__desc">{{ template.description || '-' }}</div>
              </div>
            </el-option>
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
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type { ChannelTemplateListItem } from '@/types/channelTemplates'

const props = defineProps<{
  templateOptions: ChannelTemplateListItem[]
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { channel_id: number; channel_name: string; template_id: number }): void
}>()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const form = ref({
  channel_id: 0,
  channel_name: '',
  template_id: null as number | null,
})

const open = (payload: { channel_id: number; channel_name: string }) => {
  form.value = {
    channel_id: payload.channel_id,
    channel_name: payload.channel_name,
    template_id: null,
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
  emit('submit', {
    channel_id: form.value.channel_id,
    channel_name: form.value.channel_name,
    template_id: form.value.template_id,
  })
}

defineExpose({
  open,
  close,
})
</script>

<style scoped lang="scss">
:deep(.template-option-popper .el-select-dropdown__item) {
  white-space: normal;
}

.template-option {
  width: 100%;
  line-height: 1.2;

  .template-option__name {
    font-size: 13px;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .template-option__desc {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>

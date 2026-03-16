<template>
  <FormDialog ref="dialogRef" title="Add Template" width="860px" dialog-class="create-template-dialog">
    <template #dialog-body>
      <el-tabs v-model="mode" class="create-tabs">
        <el-tab-pane label="By JSON" name="json">
          <el-form ref="jsonFormRef" :model="form" :rules="jsonRules" label-width="120px" class="create-mode-form">
            <el-form-item label="JSON Content:" prop="json_text" required>
              <el-input
                v-model="form.json_text"
                type="textarea"
                :rows="12"
                resize="none"
                placeholder="Please input template JSON"
              />
            </el-form-item>
          </el-form>
          <div class="json-import-hint">
            <el-icon class="json-import-hint__icon"><InfoFilled /></el-icon>
            <span class="json-import-hint__text">
              You can
              <input
                ref="jsonFileInputRef"
                type="file"
                accept=".json,application/json,text/plain"
                class="json-import-hint__file-input"
                @change="handleJsonFileChange"
              />
              <span class="json-import-hint__link" @click="triggerJsonFileSelect">select a file</span>
              to import JSON content (will overwrite the above content).
            </span>
          </div>
        </el-tab-pane>

        <el-tab-pane label="From Channel" name="channel">
          <el-form
            ref="channelFormRef"
            :model="form"
            :rules="channelRules"
            label-width="120px"
            class="create-mode-form"
          >
            <div class="create-base-form__row">
              <el-form-item label="Name:" class="create-base-form__item" prop="name" required>
                <el-input v-model="form.name" />
              </el-form-item>
              <el-form-item
                label="Source Channel:"
                class="create-base-form__item create-base-form__item--half"
                prop="channel_id"
                required
              >
                <el-select
                  v-model="form.channel_id"
                  :fit-input-width="true"
                  filterable
                  clearable
                  placeholder="Select channel"
                  @change="handleSourceChannelChange"
                >
                  <el-option
                    v-for="channel in channelOptions"
                    :key="channel.id"
                    :label="channel.name"
                    :value="channel.id"
                  />
                </el-select>
              </el-form-item>
            </div>
            <div class="create-base-form__row">
              <el-form-item
                label="Protocol:"
                class="create-base-form__item create-base-form__item--half"
                prop="protocol"
                required
              >
                <el-select v-model="form.protocol" :fit-input-width="true" disabled>
                  <el-option
                    v-for="option in protocolOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
            </div>
            <el-form-item label="Description:">
              <el-input v-model="form.description" type="textarea" :rows="2" resize="none" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
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
import { InfoFilled } from '@element-plus/icons-vue'
import FormDialog from '@/components/dialog/FormDialog.vue'

const props = defineProps<{
  protocolOptions: ReadonlyArray<{ label: string; value: string }>
  channelOptions: Array<{ id: number; name: string; protocol: string }>
  defaultProtocol: string
}>()

const emit = defineEmits<{
  (
    e: 'submit',
    payload:
      | { mode: 'json'; json_text: string }
      | {
          mode: 'channel'
          name: string
          description: string
          protocol: string
          channel_id: number
        },
  ): void
}>()

const dialogRef = ref<{ dialogVisible: boolean } | null>(null)
const jsonFormRef = ref<FormInstance>()
const jsonFileInputRef = ref<HTMLInputElement | null>(null)
const channelFormRef = ref<FormInstance>()
const mode = ref<'json' | 'channel'>('json')
const form = ref({
  name: '',
  description: '',
  protocol: 'modbus_tcp',
  json_text: '',
  channel_id: null as number | null,
})

const jsonRules: FormRules = {
  json_text: [{ required: true, message: 'JSON Content is required', trigger: 'blur' }],
}

const channelRules: FormRules = {
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
  protocol: [{ required: true, message: 'Protocol is required', trigger: 'change' }],
  channel_id: [{ required: true, message: 'Source Channel is required', trigger: 'change' }],
}

const syncProtocolByChannel = (channelId: number | null) => {
  const selectedChannel = props.channelOptions.find(channel => channel.id === Number(channelId))
  if (!selectedChannel) {
    form.value.protocol = props.defaultProtocol || 'modbus_tcp'
    return
  }
  form.value.protocol = selectedChannel.protocol || props.defaultProtocol || 'modbus_tcp'
}

const open = (payload?: { protocol?: string; channel_id?: number | null; mode?: 'json' | 'channel' }) => {
  form.value = {
    name: '',
    description: '',
    protocol: payload?.protocol || props.defaultProtocol || 'modbus_tcp',
    json_text: '',
    channel_id: payload?.channel_id ?? null,
  }
  mode.value = payload?.mode || 'json'
  if (mode.value === 'channel') {
    syncProtocolByChannel(form.value.channel_id)
  }
  if (dialogRef.value) dialogRef.value.dialogVisible = true
}

const close = () => {
  if (dialogRef.value) dialogRef.value.dialogVisible = false
}

const triggerJsonFileSelect = () => {
  jsonFileInputRef.value?.click()
}

const handleJsonFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    form.value.json_text = await file.text()
  } catch {}
  // 清空 input，确保下次选择同一文件时 change 事件仍会触发
  input.value = ''
}

const handleSourceChannelChange = (channelId: number | null) => {
  syncProtocolByChannel(channelId)
}

const validateCurrentTab = async () => {
  if (mode.value === 'json') {
    return await jsonFormRef.value?.validate().then(() => true).catch(() => false)
  }
  return await channelFormRef.value?.validate().then(() => true).catch(() => false)
}

const submit = async () => {
  const valid = await validateCurrentTab()
  if (!valid) return

  if (mode.value === 'json') {
    emit('submit', {
      mode: 'json',
      json_text: form.value.json_text,
    })
    return
  }

  emit('submit', {
    mode: 'channel',
    name: form.value.name.trim(),
    description: form.value.description || '',
    protocol: form.value.protocol,
    channel_id: Number(form.value.channel_id),
  })
}

defineExpose({
  open,
  close,
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.create-base-form {
  margin-bottom: 8px;

  .create-base-form__row {
    display: flex;
    gap: 12px;
  }

  .create-base-form__item {
    flex: 1;
    min-width: 0;
  }

  .create-base-form__item--half {
    flex: 0 0 calc(50% - 6px);
    max-width: calc(50% - 6px);
  }
}

.create-tabs {
  margin-top: -8px;
}

.create-mode-form {
  margin-top: 6px;
}

.json-import-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;

  .json-import-hint__icon {
    flex-shrink: 0;
    margin-top: 1px;
    font-size: 16px;
    color: #909399;
  }

  .json-import-hint__text {
    flex: 1;
    min-width: 0;
    line-height: 1.5;
  }

  .json-import-hint__file-input {
    display: none;
  }

  .json-import-hint__link {
    color: $primary-color;
    cursor: pointer;
    text-decoration: underline;
  }
}

:deep(.create-template-dialog .el-dialog) {
  height: 80%;
  display: flex;
  flex-direction: column;
}

:deep(.create-template-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>

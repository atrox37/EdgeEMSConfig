<template>
  <FormDialog ref="dialogRef" title="Add Template" width="860px" dialog-class="create-template-dialog">
    <template #dialog-body>
      <el-form :model="form" label-width="120px" class="create-base-form">
        <div class="create-base-form__row">
          <el-form-item label="Name:" class="create-base-form__item">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="Protocol:" class="create-base-form__item">
            <el-select v-model="form.protocol">
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
        <el-form-item label="Create Mode:">
          <el-radio-group v-model="mode">
            <el-radio-button label="json">By JSON</el-radio-button>
            <el-radio-button label="channel">From Channel</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-form v-if="mode === 'json'" :model="form" label-width="120px" class="create-mode-form">
        <el-form-item label="JSON File:">
          <el-upload
            class="json-upload"
            accept=".json,application/json,text/plain"
            :show-file-list="false"
            :auto-upload="false"
            :limit="1"
            :on-change="handleJsonFileChange"
          >
            <el-button>Choose JSON File</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="JSON Content:">
          <el-input
            v-model="form.json_text"
            type="textarea"
            :rows="12"
            resize="none"
            placeholder="Please input template JSON"
          />
        </el-form-item>
      </el-form>

      <el-form v-else :model="form" label-width="120px" class="create-mode-form">
        <el-form-item label="Source Channel:">
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
      <el-button type="primary" @click="submit">Submit</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'

const props = defineProps<{
  protocolOptions: ReadonlyArray<{ label: string; value: string }>
  channelOptions: Array<{ id: number; name: string }>
  defaultProtocol: string
}>()

const emit = defineEmits<{
  (
    e: 'submit',
    payload:
      | { mode: 'json'; name: string; description: string; protocol: string; json_text: string }
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
const mode = ref<'json' | 'channel'>('json')
const form = ref({
  name: '',
  description: '',
  protocol: 'modbus_tcp',
  json_text: '',
  channel_id: null as number | null,
})

const open = (payload?: { protocol?: string; channel_id?: number | null; mode?: 'json' | 'channel' }) => {
  form.value = {
    name: '',
    description: '',
    protocol: payload?.protocol || props.defaultProtocol || 'modbus_tcp',
    json_text: '',
    channel_id: payload?.channel_id ?? null,
  }
  mode.value = payload?.mode || 'json'
  if (dialogRef.value) dialogRef.value.dialogVisible = true
}

const close = () => {
  if (dialogRef.value) dialogRef.value.dialogVisible = false
}

const handleJsonFileChange = async (file: UploadFile) => {
  if (!file.raw) return
  try {
    form.value.json_text = await file.raw.text()
  } catch {
    ElMessage.error('Failed to read JSON file')
  }
}

const submit = () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('Name is required')
    return
  }
  if (!form.value.protocol) {
    ElMessage.warning('Protocol is required')
    return
  }
  if (!form.value.description.trim()) {
    ElMessage.warning('Description is required')
    return
  }
  if (mode.value === 'json') {
    if (!form.value.json_text.trim()) {
      ElMessage.warning('JSON Content is required')
      return
    }
    emit('submit', {
      mode: 'json',
      name: form.value.name.trim(),
      description: form.value.description || '',
      protocol: form.value.protocol,
      json_text: form.value.json_text,
    })
    return
  }
  if (!form.value.channel_id) {
    ElMessage.warning('Source Channel is required')
    return
  }
  emit('submit', {
    mode: 'channel',
    name: form.value.name.trim(),
    description: form.value.description || '',
    protocol: form.value.protocol,
    channel_id: form.value.channel_id,
  })
}

defineExpose({
  open,
  close,
})
</script>

<style scoped lang="scss">
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
}

.create-mode-form {
  margin-top: 6px;
}

.json-upload {
  width: 100%;
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

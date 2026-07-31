<template>
  <FormDialog
    ref="dialogRef"
    title="Setting"
    width="560px"
    :append-to-body="false"
    dialog-class="titlebar-setting-dialog__modal"
    style="height: 500px;"
  >
    <template #dialog-body>
      <div class="titlebar-setting-dialog">
        <div class="titlebar-setting-dialog__row">
          <span class="titlebar-setting-dialog__label">Download Path:</span>
          <div class="titlebar-setting-dialog__path-wrap">
            <el-input v-model="downloadPathDraft" placeholder="Select download path" />
            <el-button @click="selectDownloadDirectory">Browse</el-button>
          </div>
        </div>
      </div>
    </template>
    <template #dialog-footer>
      <el-button @click="closeDialog">Cancel</el-button>
      <el-button type="primary" @click="saveDownloadPath">Save</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import { getDownloadPath, setDownloadPath, ensureDefaultDownloadPath } from '@/utils/downloadPath'

const dialogRef = ref<InstanceType<typeof FormDialog> | null>(null)
const downloadPathDraft = ref('')

const loadDownloadPath = async () => {
  await ensureDefaultDownloadPath()
  downloadPathDraft.value = getDownloadPath()
}

const openDialog = async () => {
  await loadDownloadPath()
  if (dialogRef.value) {
    dialogRef.value.dialogVisible = true
  }
}

const closeDialog = () => {
  if (dialogRef.value) {
    dialogRef.value.dialogVisible = false
  }
}

const selectDownloadDirectory = async () => {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (selected && typeof selected === 'string') {
      downloadPathDraft.value = selected
    }
  } catch (error) {
    ElMessage.error(`Failed to select directory: ${error}`)
  }
}

const saveDownloadPath = () => {
  try {
    // Persist as the default download destination for future file downloads.
    setDownloadPath(downloadPathDraft.value)
    ElMessage.success('Download path saved')
    closeDialog()
  } catch (error) {
    ElMessage.error(`Failed to save path: ${error}`)
  }
}

defineExpose({
  openDialog,
  closeDialog,
})
</script>

<style lang="scss" scoped>
.titlebar-setting-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--vt-space-4);
}

.titlebar-setting-dialog__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vt-space-4);
}

.titlebar-setting-dialog__label {
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
  white-space: nowrap;
}

.titlebar-setting-dialog__path-wrap {
  display: flex;
  align-items: center;
  gap: var(--vt-space-2);
  flex: 1;
}

:deep(.titlebar-setting-dialog__modal.el-dialog) {
  height: 500px;
  display: flex;
  flex-direction: column;
}

:deep(.titlebar-setting-dialog__modal .el-dialog__body) {
  flex: 1;
  overflow: auto;
}
</style>

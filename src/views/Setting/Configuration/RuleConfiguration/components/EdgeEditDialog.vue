<template>
  <FormDialog ref="formDialogRef" title="Edit Connection" width="500px" @close="handleClose">
    <template #dialog-body>
      <div class="voltage-class edge-edit-dialog">
        <el-form label-width="120px">
          <el-form-item v-if="ruleLabelOptions && ruleLabelOptions.length" label="ruleLabel:">
            <el-select v-model="localEdge.label" placeholder="Select rule label">
              <el-option v-for="opt in ruleLabelOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <el-button type="warning" @click="handleClose">Cancel</el-button>
      <el-button type="primary" @click="handleSave">Submit</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
// import type { Edge } from '../types'

interface Props {
  visible: boolean
  edge: any | null
  ruleLabelOptions?: string[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', edge: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localEdge = ref<any | null>(null)
const formDialogRef = ref<any>(null)

// 监听外部edge变化，同步到本地
watch(
  () => props.edge,
  (newEdge) => {
    if (newEdge) {
      localEdge.value = { ...newEdge }
    }
  },
  { immediate: true },
)

// 同步外部可见性到 FormDialog 内部的 dialogVisible
watch(
  () => props.visible,
  (visible) => {
    if (formDialogRef.value) {
      formDialogRef.value.dialogVisible = visible
    }
  },
  { immediate: true },
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  if (localEdge.value) {
    emit('save', localEdge.value)
  }
}
</script>

<style lang="scss" scoped>
.voltage-class {
  .edge-edit-dialog {
    .el-form {
      .el-form-item {
        margin-bottom: 20px;

        .el-form-item__label {
          font-weight: 600;
          color: #2c3e50;
        }
      }
    }
  }
}
</style>

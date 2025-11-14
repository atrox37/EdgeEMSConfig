<template>
  <FormDialog ref="formDialogRef" title="Execute" width="480px" @close="close">
    <template #dialog-body>
      <div class="voltage-class execute-dialog">
        <el-form label-width="90px" ref="formRef" :model="form" :rules="rules">
          <el-form-item label="Value" required>
            <el-input-number v-model="form.value" :controls="false" align="left" />
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <el-button @click="close">Cancel</el-button>
      <el-button type="primary" @click="submit">Submit</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import { executeAction } from '@/api/devicesManagement'
import { InstanceNameKey } from '@/utils/key'
const formDialogRef = ref<{ dialogVisible: boolean } | null>(null)
const formRef = ref()
const form = ref<{
  value: string | number
  point_id: string
}>({
  value: '',
  point_id: '',
})
const instanceName = inject(InstanceNameKey)
const rules = {
  value: [{ required: true, message: 'Please enter value', trigger: 'blur' }],
}
function open(point_id: string) {
  form.value.value = 0
  form.value.point_id = point_id
  if (formDialogRef.value) formDialogRef.value.dialogVisible = true
}

function close() {
  if (formDialogRef.value) formDialogRef.value.dialogVisible = false
}

function submit() {
  formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      if (instanceName) {
        const res = await executeAction(instanceName.value, form.value)
        if (res.success) {
          ElMessage.success('Execute success!')
          close()
        }
      }
    }
  })
}

defineExpose({ open, close })
</script>

<style scoped lang="scss">
.voltage-class {
  .execute-dialog {
    width: 100%;
  }
}
</style>

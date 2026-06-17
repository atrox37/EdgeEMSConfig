<template>
  <FormDialog ref="formDialogRef" title="Value Publish" width="400px" @close="close">
    <template #dialog-body>
      <div class="voltage-class execute-dialog">
        <el-form label-width="90px" ref="formRef" :model="form" :rules="rules">
          <el-form-item
            label="Value:"
            :prop="form.category === 'property' ? 'valueText' : 'value'"
            required
          >
            <el-input
              v-if="form.category === 'property'"
              v-model="form.valueText"
              placeholder="Enter value"
              clearable
            />
            <el-input-number v-else v-model="form.value" :controls="false" align="left" />
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <el-button @click="close">Cancel</el-button>
      <el-button type="primary" :loading="submitLoading" @click="submit">Submit</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import {
  executeAction,
  executeMeasurement,
  upsertInstanceProperty,
} from '@/api/devicesManagement'
import { InstanceIdKey } from '@/utils/key'
const formDialogRef = ref<{ dialogVisible: boolean } | null>(null)
const formRef = ref()
const submitLoading = ref(false)
const form = ref<{
  value: number | undefined
  valueText: string
  point_id: string
  category: 'action' | 'measurement' | 'property'
}>({
  value: undefined,
  valueText: '',
  point_id: '',
  category: 'action',
})
const instanceId = inject(InstanceIdKey)
const rules = {
  value: [{ required: true, message: 'Please enter value', trigger: 'blur' }],
  valueText: [{ required: true, message: 'Please enter value', trigger: 'blur' }],
}

function parsePropertyValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  try {
    return JSON.parse(trimmed)
  } catch {
    return raw
  }
}

function open(point_id: string, category: 'action' | 'measurement' | 'property' = 'action') {
  form.value.value = undefined
  form.value.valueText = ''
  form.value.point_id = point_id
  form.value.category = category
  if (formDialogRef.value) formDialogRef.value.dialogVisible = true
}

function close() {
  if (formDialogRef.value) formDialogRef.value.dialogVisible = false
}

function submit() {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    if (!instanceId?.value) return
    submitLoading.value = true
    try {
      const id = Number(instanceId.value)
      let res
      if (form.value.category === 'property') {
        const propertyId = Number(form.value.point_id)
        res = await upsertInstanceProperty(id, propertyId, {
          value: parsePropertyValue(form.value.valueText),
        })
      } else {
        const payload = {
          value: form.value.value as number,
          point_id: form.value.point_id,
        }
        res =
          form.value.category === 'measurement'
            ? await executeMeasurement(id, payload)
            : await executeAction(id, payload)
      }
      if (res.success) {
        ElMessage.success(
          form.value.category === 'property' ? 'Execute success!' : 'Publish success!',
        )
        close()
      }
    } finally {
      submitLoading.value = false
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
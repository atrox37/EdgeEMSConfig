<template>
  <FormDialog
    ref="dialogRef"
    :title="isEdit ? 'Edit RuleChain' : 'Add RuleChain'"
    width="760px"
    @close="handleClose"
  >
    <template #dialog-body>
      <div class="rule-edit-dialog" v-loading="detailLoading">
        <el-alert
          v-if="submitError"
          type="error"
          :title="submitError"
          show-icon
          :closable="true"
          class="rule-edit-dialog__error"
          @close="submitError = ''"
        />

        <el-form :model="form" label-width="140px" :rules="rules" ref="formRef">
          <el-form-item label="Name:" prop="name">
            <el-input v-model="form.name" placeholder="name" />
          </el-form-item>
          <el-form-item label="Description:" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="description"
            />
          </el-form-item>

          <TriggerConfigForm v-if="isEdit" v-model="triggerForm" ref="triggerConfigRef" />
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">Submit</el-button>
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import TriggerConfigForm from './TriggerConfigForm.vue'
import type { Rule, TriggerConfigFormState } from '@/types/ruleConfiguration'
import { createRule, getRuleDetail, updateRule } from '@/api/rulesManagement'
import {
  buildTriggerConfigFromForm,
  createDefaultTriggerFormState,
  triggerFormFromConfig,
  validateTriggerForm,
} from '@/utils/triggerConfig'

const dialogRef = ref()
const isEdit = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)
const submitError = ref('')
const formRef = ref()
const triggerConfigRef = ref<{ preloadPointOptions: () => Promise<void> } | null>(null)

const form = reactive<Rule>({
  name: '',
  description: '',
  id: '',
  enabled: true,
})

const triggerForm = ref<TriggerConfigFormState>(createDefaultTriggerFormState())

const rules = {
  name: [
    { required: true, message: 'Please input name', trigger: 'blur' },
    {
      validator: (_: any, val: string, cb: (err?: Error) => void) => {
        if (typeof val !== 'string' || !val.trim()) return cb(new Error('Name is required'))
        cb()
      },
      trigger: 'blur',
    },
  ],
}

const emit = defineEmits<{ (e: 'submitted'): void }>()

function extractSubmitError(error: any): string {
  const data = error?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const nested =
      data?.error?.message ||
      data?.detail?.message ||
      data?.message ||
      (typeof data?.detail === 'string' ? data.detail : '')
    if (nested) return String(nested)
  }
  return error?.message || 'Request failed'
}

async function loadRuleDetail(id: string) {
  detailLoading.value = true
  try {
    const res = await getRuleDetail(id)
    if (res?.success === false) {
      submitError.value = 'Failed to load rule detail'
      triggerForm.value = createDefaultTriggerFormState()
      return
    }
    const detail = (res?.data || res) as Rule
    triggerForm.value = triggerFormFromConfig(detail?.trigger_config)
    await nextTick()
    await triggerConfigRef.value?.preloadPointOptions?.()
  } catch (error: any) {
    submitError.value = extractSubmitError(error)
    triggerForm.value = createDefaultTriggerFormState()
  } finally {
    detailLoading.value = false
  }
}

async function open(row?: Rule) {
  submitError.value = ''
  if (row) {
    isEdit.value = true
    Object.assign(form, row)
    triggerForm.value = createDefaultTriggerFormState()
    dialogRef.value.dialogVisible = true
    await loadRuleDetail(String(row.id))
  } else {
    isEdit.value = false
    Object.assign(form, { id: '', name: '', description: '', enabled: true })
    triggerForm.value = createDefaultTriggerFormState()
    dialogRef.value.dialogVisible = true
  }
  nextTick(() => {
    formRef.value?.clearValidate?.()
  })
}

function handleCancel() {
  dialogRef.value.dialogVisible = false
}

function handleClose() {
  submitError.value = ''
}

function validate(): Promise<boolean> {
  return new Promise((resolve) => {
    formRef.value?.validate((ok: boolean) => resolve(ok))
  })
}

async function handleSubmit() {
  submitError.value = ''
  const ok = await validate()
  if (!ok) return

  if (isEdit.value) {
    const triggerError = validateTriggerForm(triggerForm.value)
    if (triggerError) {
      submitError.value = triggerError
      return
    }
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      const { id, name, description } = form
      const payload = {
        id: id as string,
        name,
        description: description as string,
        trigger_config: buildTriggerConfigFromForm(triggerForm.value),
      }
      const res = await updateRule(payload, { showErrorMessage: false })
      if (res.success) {
        ElMessage.success('Updated successfully')
        dialogRef.value.dialogVisible = false
        emit('submitted')
      } else {
        submitError.value = (res as any)?.error?.message || (res as any)?.message || 'Update failed'
      }
    } else {
      const payload = { name: form.name, description: form.description }
      const res = await createRule(payload)
      if (res.success) {
        ElMessage.success('Created successfully')
        Object.assign(form, { id: '', name: '', description: '', enabled: true })
        dialogRef.value.dialogVisible = false
        emit('submitted')
      }
    }
  } catch (error: any) {
    submitError.value = extractSubmitError(error)
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.rule-edit-dialog {
  max-height: calc(100vh - 220px);
  overflow-y: auto;

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .rule-edit-dialog__error {
    margin-bottom: 12px;
  }

  :deep(.el-textarea),
  :deep(.el-input) {
    width: 100% !important;
    max-width: 520px;
  }
}
</style>

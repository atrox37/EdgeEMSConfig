<template>
  <el-dialog v-model="visible" :title="isEdit ? 'Edit Rule' : 'Create Rule'" width="6rem">
    <div class="voltage-class rule-edit-dialog">
      <el-form :model="form" label-width="1.2rem" :rules="rules" ref="formRef">
        <el-form-item label="ID" prop="id">
          <el-input v-model="form.id" :disabled="isEdit" placeholder="unique id" />
        </el-form-item>
        <el-form-item label="Name" prop="name">
          <el-input v-model="form.name" placeholder="name" />
        </el-form-item>
        <el-form-item label="Description" prop="description">
          <el-input v-model="form.description" placeholder="description" />
        </el-form-item>
        <el-form-item label="Priority" prop="priority">
          <el-input-number v-model="form.priority" :min="0" :controls="false" align="left" />
        </el-form-item>
        <el-form-item label="Enabled" prop="enabled">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">Submit</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { Rule } from '@/types/rule'
import { createRule, updateRule } from '@/apis/rules'

const visible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const form = reactive<Rule>({
  id: '',
  name: '',
  description: '',
  priority: 0,
  enabled: true,
})

const rules = {
  id: [{ required: true, message: 'Please input id', trigger: 'blur' }],
  name: [{ required: true, message: 'Please input name', trigger: 'blur' }],
  priority: [{ required: true, message: 'Please input priority', trigger: 'change' }],
}

const emit = defineEmits<{ (e: 'submitted'): void }>()

function open(row?: Rule) {
  if (row) {
    isEdit.value = true
    Object.assign(form, row)
  } else {
    isEdit.value = false
    Object.assign(form, { id: '', name: '', description: '', priority: 0, enabled: true })
  }
  visible.value = true
}

function handleCancel() {
  visible.value = false
}

function validate(): Promise<boolean> {
  return new Promise((resolve) => {
    formRef.value?.validate((ok: boolean) => resolve(ok))
  })
}

async function handleSubmit() {
  const ok = await validate()
  if (!ok) return
  submitting.value = true
  try {
    if (isEdit.value) {
      const { id, name, description, priority, enabled } = form
      const res = await updateRule(id, { name, description, priority, enabled })
      if (res.success) {
        ElMessage.success('Updated successfully')
        visible.value = false
        emit('submitted')
      }
    } else {
      const res = await createRule({ ...form })
      if (res.success) {
        ElMessage.success('Created successfully')
        visible.value = false
        emit('submitted')
      }
    }
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.voltage-class .rule-edit-dialog {
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.1rem;
  }
}
</style>

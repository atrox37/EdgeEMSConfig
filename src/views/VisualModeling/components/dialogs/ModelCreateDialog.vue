<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? 'Edit Plan' : 'New Modeling Plan'"
    width="420px"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" label-position="left">
      <el-form-item label="Plan Name" prop="name">
        <el-input v-model="form.name" placeholder="Enter plan name" maxlength="50" show-word-limit />
      </el-form-item>
      <el-form-item label="Description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Optional description"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">Cancel</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="submitting">
        {{ isEdit ? 'Save' : 'Create' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { VisualModel } from '@/types/visualModeling'

const props = defineProps<{
  editModel?: VisualModel | null
}>()

const emit = defineEmits<{
  (e: 'confirm', name: string, description: string): void
}>()

const visible = defineModel<boolean>('visible', { default: false })
const isEdit = computed(() => !!props.editModel)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  description: '',
})

const rules: FormRules = {
  name: [{ required: true, message: 'Please enter a plan name', trigger: 'blur' }],
}

watch(
  () => props.editModel,
  (m) => {
    if (m) {
      form.name = m.name
      form.description = m.description
    }
  },
  { immediate: true },
)

watch(visible, (v) => {
  if (v && props.editModel) {
    form.name = props.editModel.name
    form.description = props.editModel.description
  }
})

async function handleConfirm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    emit('confirm', form.name.trim(), form.description.trim())
    visible.value = false
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.name = ''
  form.description = ''
  formRef.value?.resetFields()
}
</script>

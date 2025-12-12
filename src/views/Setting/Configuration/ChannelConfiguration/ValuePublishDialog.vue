<template>
  <FormDialog ref="dialogRef" title="Value Publish" width="500px" @close="handleClose">
    <template #dialog-body>
      <div class="voltage-class value-publish">
        <el-form label-width="100px" inline ref="formRef" :model="form" :rules="rules">
          <el-form-item label="Value" style="margin-right: 0" prop="value">
            <template v-if="dataType === 'boolean'">
              <el-select v-model="form.value" placeholder="Select">
                <el-option label="True" :value="1" />
                <el-option label="False" :value="0" />
              </el-select>
            </template>
            <template v-else-if="dataType === 'int'">
              <el-input-number v-model="form.value" :controls="false" step-strictly />
            </template>
            <template v-else-if="dataType === 'float'">
              <el-input-number v-model="form.value" :controls="false" />
            </template>
            <template v-else>
              <el-input v-model="form.value" placeholder="Enter number" />
            </template>
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button @click="close">Cancel</el-button>
        <el-button type="primary" @click="submit">Submit</el-button>
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import { postAdjustmentValue, postControlValue } from '@/api/channelsManagement'
import { ChannelIdKey, ChannelNameKey } from '@/utils/key'
interface OpenPayload {
  pointId: number
  dataType: string
  category: 'C' | 'A'
}
const channelName = inject(ChannelNameKey)
const channelId = inject(ChannelIdKey)
const dialogRef = ref()
const formRef = ref()
const form = ref<{
  pointId: number
  dataType: string
  value: number | string
  category: 'C' | 'A' | ''
}>({
  pointId: 0,
  dataType: '',
  value: '' as number | string,
  category: '',
})

const rules = {
  value: [{ required: true, message: 'Please enter value', trigger: 'blur' }],
}
const dataType = computed(() => {
  if (
    form.value.dataType.toLowerCase() === 'boolean' ||
    form.value.dataType.toLowerCase() === 'bool'
  ) {
    return 'boolean'
  } else if (/^(int|int16|int32|uint16|uint32)$/i.test(form.value.dataType)) {
    return 'int'
  } else if (/^(float|float16|float32|float64)$/i.test(form.value.dataType)) {
    return 'float'
  } else {
    return 'string'
  }
})

const open = (payload: OpenPayload) => {
  form.value.pointId = payload.pointId
  form.value.dataType = payload.dataType
  form.value.category = payload.category
  // 清理输入值与错误提示
  form.value.value = ''
  dialogRef.value.dialogVisible = true
  setTimeout(() => {
    formRef.value?.clearValidate()
  }, 100)
}

const close = () => {
  dialogRef.value.dialogVisible = false
}

const handleClose = () => {
  close()
}

const submit = async () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    if (form.value.category === 'C') {
      const res = await postControlValue(channelId!.value, form.value.pointId, form.value.value)
      if (res.success) {
        ElMessage.success('Published successfully')
        close()
      }
    } else if (form.value.category === 'A') {
      const res = await postAdjustmentValue(channelId!.value, form.value.pointId, form.value.value)
      if (res.success) {
        ElMessage.success('Published successfully')
        close()
      }
    }
  })
}

defineExpose({
  open,
  close,
})
</script>

<style scoped lang="scss">
.voltage-class .value-publish {
  padding: 10px 6px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>

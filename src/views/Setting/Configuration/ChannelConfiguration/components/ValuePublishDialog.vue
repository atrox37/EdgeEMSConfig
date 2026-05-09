<template>
  <FormDialog ref="dialogRef" title="Value Publish" width="400px" @close="handleClose">
    <template #dialog-body>
      <div class="voltage-class value-publish">
        <el-form label-width="100px" inline ref="formRef" :model="form" :rules="rules">
          <el-form-item label="Value:" style="margin-right: 0" prop="value">
            <template v-if="form.category === 'C' || form.category === 'S'">


              <el-select v-model="form.value" :fit-input-width="true" placeholder="Select" :teleported="false">
                <el-option label="1" :value="1" />
                <el-option label="0" :value="0" />
              </el-select>
            </template>
            <template v-else-if="form.category === 'A' || form.category === 'T'">
              <el-input-number align="left" v-model="form.value" :controls="false" />
            </template>
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button @click="close">Cancel</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submit">Submit</el-button>
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import { publishPointValue } from '@/api/channelsManagement'
import { ChannelIdKey, ChannelNameKey } from '@/utils/key'
interface OpenPayload {
  pointId: number
  dataType: string
  category: 'C' | 'A' | 'T' | 'S'
  signalName?: string
}
const channelName = inject(ChannelNameKey)
const channelId = inject(ChannelIdKey)
const dialogRef = ref()
const formRef = ref()
const submitLoading = ref(false)
const form = ref<{
  pointId: number
  dataType: string
  value: boolean | number | string | undefined
  category: 'C' | 'A' | 'T' | 'S' | ''
}>({
  pointId: 0,
  dataType: '',
  value: undefined,
  category: '',
})

const rules = {
  value: [{ required: true, message: 'Please enter value', trigger: 'blur' }],
}

const open = (payload: OpenPayload) => {
  form.value.pointId = payload.pointId
  form.value.dataType = payload.dataType
  form.value.category = payload.category
  // 清理输入值与错误提示
  form.value.value = undefined
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
    let outValue: any = form.value.value
    submitLoading.value = true
    try {
      const res = await publishPointValue(channelId!.value, {
        type: form.value.category as 'C' | 'A' | 'T' | 'S',
        id: form.value.pointId.toString(),
        value: outValue,
      })
      if (res.success) {
        ElMessage.success('Published successfully')
        close()
      }
    } finally {
      submitLoading.value = false
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
  // padding: 10px 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
:deep(.el-form-item){
  width: 100%;
}
</style>
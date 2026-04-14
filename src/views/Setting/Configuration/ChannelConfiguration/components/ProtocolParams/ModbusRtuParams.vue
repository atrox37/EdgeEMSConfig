<template>
  <div class="protocol-params">
    <el-form-item label="Device:" class="protocol-params__item" prop="parameters.device">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).device || '-'
      }}</span>
      <el-input v-else v-model="(form.parameters as any).device" placeholder="please enter device" />
    </el-form-item>
    <el-form-item label="Baud Rate:" class="protocol-params__item" prop="parameters.baud_rate">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).baud_rate
      }}</span>
      <el-input-number v-else v-model="(form.parameters as any).baud_rate" :controls="false" :min="0" :precision="0"
        align="left" placeholder="please enter baud rate" />
    </el-form-item>
    <el-form-item label="Data Bits:" class="protocol-params__item" prop="parameters.data_bits">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).data_bits
      }}</span>
      <el-input-number v-else v-model="(form.parameters as any).data_bits" :controls="false" :min="0" :precision="0"
        align="left" placeholder="please enter data bits" />
    </el-form-item>
    <el-form-item label="Stop Bits:" class="protocol-params__item" prop="parameters.stop_bits">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).stop_bits
      }}</span>
      <el-input-number v-else v-model="(form.parameters as any).stop_bits" :controls="false" :min="0" :precision="0"
        align="left" placeholder="please enter stop bits" />
    </el-form-item>
    <el-form-item label="Parity:" class="protocol-params__item" prop="parameters.parity">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).parity || '-'
      }}</span>
      <el-select v-else v-model="(form.parameters as any).parity" :fit-input-width="true" placeholder="please enter parity">
        <el-option label="N" value="N" />
        <el-option label="E" value="E" />
        <el-option label="O" value="O" />
      </el-select>
    </el-form-item>
    <el-form-item label="Connect Timeout (ms):" class="protocol-params__item" prop="parameters.connect_timeout_ms">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).connect_timeout_ms
      }}</span>
      <el-input-number v-else v-model="(form.parameters as any).connect_timeout_ms" :controls="false" :min="0"
        :precision="0" align="left" placeholder="please enter connect timeout (ms)" />
    </el-form-item>
    <el-form-item label="Read Timeout (ms):" class="protocol-params__item" prop="parameters.read_timeout_ms">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).read_timeout_ms
      }}</span>
      <el-input-number v-else v-model="(form.parameters as any).read_timeout_ms" :controls="false" :min="0"
        :precision="0" align="left" placeholder="please enter read timeout (ms)" />
    </el-form-item>
    <el-form-item label="Retry Interval (ms):" class="protocol-params__item" prop="parameters.retry_interval_ms">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).retry_interval_ms
      }}</span>
      <el-input-number v-else v-model="(form.parameters as any).retry_interval_ms" :controls="false" :min="0"
        :precision="0" align="left" placeholder="please enter retry interval (ms)" />
    </el-form-item>
    <el-form-item label="Max Batch Size:" class="protocol-params__item" prop="parameters.max_batch_size">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).max_batch_size
      }}</span>
      <el-input-number v-else v-model="(form.parameters as any).max_batch_size" :controls="false" :min="1" :max="125"
        :precision="0" align="left" placeholder="please enter max batch size (1-125)" />
    </el-form-item>
    <el-form-item label="Poll Interval (ms):" class="protocol-params__item" prop="parameters.poll_interval_ms">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).poll_interval_ms
      }}</span>
      <el-input-number v-else v-model="(form.parameters as any).poll_interval_ms" :controls="false" :min="1"
        :precision="0" align="left" placeholder="please enter poll interval (ms)" />
    </el-form-item>
  </div>
</template>

<script lang="ts">
// 验证规则
const requiredMsg = (name: string) => `${name} is required`

export const validationRules: Record<string, any[]> = {
  'parameters.device': [{ required: true, message: requiredMsg('Device'), trigger: 'blur' }],
  'parameters.parity': [{ required: true, message: requiredMsg('Parity'), trigger: 'change' }],
  'parameters.baud_rate': [{ required: true, message: requiredMsg('Baud Rate'), trigger: 'blur' }],
  'parameters.data_bits': [{ required: true, message: requiredMsg('Data Bits'), trigger: 'blur' }],
  'parameters.stop_bits': [{ required: true, message: requiredMsg('Stop Bits'), trigger: 'blur' }],
  'parameters.connect_timeout_ms': [
    { required: true, message: requiredMsg('Connect Timeout (ms)'), trigger: 'blur' },
  ],
  'parameters.read_timeout_ms': [
    { required: true, message: requiredMsg('Read Timeout (ms)'), trigger: 'blur' },
  ],
  'parameters.retry_interval_ms': [
    { required: true, message: requiredMsg('Retry Interval (ms)'), trigger: 'blur' },
  ],
  'parameters.max_batch_size': [
    { required: true, message: requiredMsg('Max Batch Size'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 1 || num > 125) {
          callback(new Error('Must be an integer between 1 and 125'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
  'parameters.poll_interval_ms': [
    { required: true, message: requiredMsg('Poll Interval (ms)'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 1) {
          callback(new Error('Must be a positive integer'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}
</script>
<script setup lang="ts">
import type { ChannelDetail } from '@/types/channelConfiguration'

interface Props {
  form: ChannelDetail
  isEditing: boolean
}

defineProps<Props>()


</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.protocol-params {
  display: flex;
  flex-wrap: wrap;
  column-gap: 12px;
  row-gap: 16px;

  &__item {
    width: calc(50% - 6px) !important;

  }

  &__text {
    color: $text-color-primary;
    font-size: 14px;
    line-height: 32px;
  }


}
</style>

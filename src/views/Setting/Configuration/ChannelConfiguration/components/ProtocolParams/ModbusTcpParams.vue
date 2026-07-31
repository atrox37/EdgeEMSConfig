<template>
  <div class="protocol-params">
    <el-form-item
      label="Host:"
      class="protocol-params__item"
      prop="parameters.host"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).host || '-'
      }}</span>
      <el-input
        v-else
        v-model="(form.parameters as any).host"
        placeholder="please enter host"
      />
    </el-form-item>
    <el-form-item
      label="Port:"
      class="protocol-params__item"
      prop="parameters.port"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).port
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).port"
        :controls="false"
        :min="0"
        :precision="0"
        align="left"
        placeholder="please enter port"
      />
    </el-form-item>
    <el-form-item
      label="Connect Timeout (ms):"
      class="protocol-params__item"
      prop="parameters.connect_timeout_ms"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).connect_timeout_ms
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).connect_timeout_ms"
        :controls="false"
        :min="0"
        :precision="0"
        align="left"
        placeholder="please enter connect timeout (ms)"
      />
    </el-form-item>
    <el-form-item
      label="Read Timeout (ms):"
      class="protocol-params__item"
      prop="parameters.read_timeout_ms"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).read_timeout_ms
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).read_timeout_ms"
        :controls="false"
        :min="0"
        :precision="0"
        align="left"
        placeholder="please enter read timeout (ms)"
      />
    </el-form-item>
    <el-form-item
      label="Max Batch Size:"
      class="protocol-params__item"
      prop="parameters.max_batch_size"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).max_batch_size
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).max_batch_size"
        :controls="false"
        :min="1"
        :max="125"
        :precision="0"
        align="left"
        placeholder="please enter max batch size (1-125)"
      />
    </el-form-item>
    <el-form-item
      label="Poll Interval (ms):"
      class="protocol-params__item"
      prop="parameters.poll_interval_ms"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).poll_interval_ms
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).poll_interval_ms"
        :controls="false"
        :min="1"
        :precision="0"
        align="left"
        placeholder="please enter poll interval (ms)"
      />
    </el-form-item>
  </div>
</template>
<script lang="ts">
// 验证规则
const requiredMsg = (name: string) => `${name} is required`

export const validationRules: Record<string, any[]> = {
  'parameters.host': [{ required: true, message: requiredMsg('Host'), trigger: 'blur' }],
  'parameters.port': [{ required: true, message: requiredMsg('Port'), trigger: 'blur' }],
  'parameters.connect_timeout_ms': [
    { required: true, message: requiredMsg('Connect Timeout (ms)'), trigger: 'blur' },
  ],
  'parameters.read_timeout_ms': [
    { required: true, message: requiredMsg('Read Timeout (ms)'), trigger: 'blur' },
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

  .protocol-params__item {
    width: calc(50% - 6px) !important;

    // 确保 label 宽度一致
  }

  .protocol-params__text {
    color: var(--vt-text-primary);
    font-size: 14px;
    line-height: 32px;
  }
  
}
</style>

<template>
  <div class="protocol-params">
    <el-form-item label="Device:" class="protocol-params__item" prop="parameters.device">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).device || '-'
      }}</span>
      <el-input
        v-else
        v-model="(form.parameters as any).device"
        placeholder="e.g. can0"
      />
    </el-form-item>
    <el-form-item label="Bitrate:" class="protocol-params__item" prop="parameters.bitrate">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).bitrate
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).bitrate"
        :controls="false"
        :min="1"
        :precision="0"
        align="left"
        placeholder="e.g. 250000"
      />
    </el-form-item>
    <el-form-item label="Connect Timeout (ms):" class="protocol-params__item" prop="parameters.connect_timeout_ms">
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
        placeholder="e.g. 3000"
      />
    </el-form-item>
    <el-form-item label="Data Read Interval (ms):" class="protocol-params__item" prop="parameters.data_read_interval_ms">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).data_read_interval_ms
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).data_read_interval_ms"
        :controls="false"
        :min="1"
        :precision="0"
        align="left"
        placeholder="e.g. 1000"
      />
    </el-form-item>
    <el-form-item label="Read Timeout (ms):" class="protocol-params__item" prop="parameters.read_timeout_ms">
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
        placeholder="e.g. 3000"
      />
    </el-form-item>
    <el-form-item label="Retry Interval (ms):" class="protocol-params__item" prop="parameters.retry_interval_ms">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).retry_interval_ms
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).retry_interval_ms"
        :controls="false"
        :min="0"
        :precision="0"
        align="left"
        placeholder="e.g. 2000"
      />
    </el-form-item>
    <el-form-item label="RX Poll Interval (ms):" class="protocol-params__item" prop="parameters.rx_poll_interval_ms">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).rx_poll_interval_ms
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).rx_poll_interval_ms"
        :controls="false"
        :min="1"
        :precision="0"
        align="left"
        placeholder="e.g. 50"
      />
    </el-form-item>
  </div>
</template>

<script lang="ts">
const requiredMsg = (name: string) => `${name} is required`

export const validationRules: Record<string, any[]> = {
  'parameters.device': [
    { required: true, message: requiredMsg('Device'), trigger: 'blur' },
  ],
  'parameters.bitrate': [
    { required: true, message: requiredMsg('Bitrate'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 1) callback(new Error('Must be a positive integer'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  'parameters.connect_timeout_ms': [
    { required: true, message: requiredMsg('Connect Timeout (ms)'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 0) callback(new Error('Must be an integer >= 0'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  'parameters.data_read_interval_ms': [
    { required: true, message: requiredMsg('Data Read Interval (ms)'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 1) callback(new Error('Must be a positive integer'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  'parameters.read_timeout_ms': [
    { required: true, message: requiredMsg('Read Timeout (ms)'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 0) callback(new Error('Must be an integer >= 0'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  'parameters.retry_interval_ms': [
    { required: true, message: requiredMsg('Retry Interval (ms)'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 0) callback(new Error('Must be an integer >= 0'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  'parameters.rx_poll_interval_ms': [
    { required: true, message: requiredMsg('RX Poll Interval (ms)'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 1) callback(new Error('Must be a positive integer'))
        else callback()
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
  row-gap: 10px;

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

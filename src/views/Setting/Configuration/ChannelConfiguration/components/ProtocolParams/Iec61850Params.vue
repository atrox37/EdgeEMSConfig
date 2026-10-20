<template>
  <div class="protocol-params">
    <el-form-item label="Address:" class="protocol-params__item" prop="parameters.address">
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).address || '-'
      }}</span>
      <el-input
        v-else
        v-model="(form.parameters as any).address"
        placeholder="Please enter address"
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
        placeholder="Please enter connect timeout"
      />
    </el-form-item>

    <el-form-item
      label="Request Timeout (ms):"
      class="protocol-params__item"
      prop="parameters.request_timeout_ms"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).request_timeout_ms
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).request_timeout_ms"
        :controls="false"
        :min="0"
        :precision="0"
        align="left"
        placeholder="Please enter request timeout"
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
        placeholder="Please enter poll interval"
      />
    </el-form-item>

    <Iec61850ReportsEditor
      :reports="reportsList"
      :is-editing="isEditing"
      :mapping-addresses="mappingAddresses"
    />
  </div>
</template>

<script lang="ts">
import { validateIec61850HostPort, validateIec61850Reports } from '@/validators/iec61850'

const requiredMsg = (name: string) => `${name} is required`

const positiveIntValidator = (min: number) => ({
  validator: (_: unknown, value: unknown, callback: (err?: Error) => void) => {
    const num = Number(value)
    if (!Number.isInteger(num) || num < min) {
      callback(new Error(min === 0 ? 'Must be a non-negative integer' : `Must be an integer >= ${min}`))
    } else {
      callback()
    }
  },
  trigger: 'change' as const,
})

export const validationRules: Record<string, unknown[]> = {
  'parameters.address': [
    { required: true, message: requiredMsg('Address'), trigger: 'blur' },
    {
      validator: (_: unknown, value: unknown, callback: (err?: Error) => void) => {
        const err = validateIec61850HostPort(value)
        if (err && err !== 'required') callback(new Error(err))
        else callback()
      },
      trigger: 'blur',
    },
  ],
  'parameters.connect_timeout_ms': [
    { required: true, message: requiredMsg('Connect Timeout (ms)'), trigger: 'blur' },
    positiveIntValidator(0),
  ],
  'parameters.request_timeout_ms': [
    { required: true, message: requiredMsg('Request Timeout (ms)'), trigger: 'blur' },
    positiveIntValidator(0),
  ],
  'parameters.poll_interval_ms': [
    { required: true, message: requiredMsg('Poll Interval (ms)'), trigger: 'blur' },
    positiveIntValidator(1),
  ],
}

export function validateIec61850ParametersReports(reports: unknown): string | null {
  const { errors } = validateIec61850Reports(reports as any)
  return errors[0] || null
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChannelDetail, Iec61850ReportConfig } from '@/types/channelConfiguration'
import Iec61850ReportsEditor from '@/views/Setting/Configuration/ChannelConfiguration/components/ProtocolParams/Iec61850ReportsEditor.vue'

interface Props {
  form: ChannelDetail
  isEditing: boolean
  mappingAddresses?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  mappingAddresses: () => [],
})

const reportsList = computed(() => {
  const params = props.form.parameters as Record<string, unknown>
  if (!Array.isArray(params.reports)) {
    params.reports = [] as Iec61850ReportConfig[]
  }
  return params.reports as Iec61850ReportConfig[]
})
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
    margin-right: 0;
    margin-bottom: 0;

    :deep(.el-form-item__label) {
      justify-content: flex-end;
      text-align: right;
    }
  }

  :deep(.iec61850-reports) {
    flex: 1 1 100%;
    width: 100%;
  }

  .protocol-params__text {
    color: $text-color-regular;
    word-break: break-all;
  }
}
</style>

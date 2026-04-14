<template>
  <div class="protocol-params">
    <el-form-item
      label="Driver:"
      class="protocol-params__item"
      prop="parameters.driver"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).driver || '-'
      }}</span>
      <el-input
        v-else
        v-model="(form.parameters as any).driver"
        placeholder="please enter driver"
      />
    </el-form-item>
    <el-form-item
      label="GPIO Base Path:"
      class="protocol-params__item"
      prop="parameters.gpio_base_path"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).gpio_base_path || '-'
      }}</span>
      <el-input
        v-else
        v-model="(form.parameters as any).gpio_base_path"
        placeholder="please enter gpio base path"
      />
    </el-form-item>
    <el-form-item
      label="DI Poll Interval (ms):"
      class="protocol-params__item"
      prop="parameters.di_poll_interval_ms"
    >
      <span v-if="!isEditing" class="protocol-params__text">{{
        (form.parameters as any).di_poll_interval_ms
      }}</span>
      <el-input-number
        v-else
        v-model="(form.parameters as any).di_poll_interval_ms"
        :controls="false"
        :min="0"
        :precision="1"
        align="left"
        placeholder="please enter di poll interval (ms)"
      />
    </el-form-item>
  </div>
</template>
<script lang="ts">
// 验证规则
const requiredMsg = (name: string) => `${name} is required`

export const validationRules: Record<string, any[]> = {
  'parameters.driver': [{ required: true, message: requiredMsg('Driver'), trigger: 'blur' }],
  'parameters.gpio_base_path': [
    { required: true, message: requiredMsg('GPIO Base Path'), trigger: 'blur' },
  ],
  'parameters.di_poll_interval_ms': [
    { required: true, message: requiredMsg('DI Poll Interval (ms)'), trigger: 'blur' },
    {
      validator: (_: any, value: any, callback: any) => {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 0) callback(new Error('Must be an integer >= 0'))
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

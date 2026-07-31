<template>
  <div class="fixed-binding-card" :class="`fixed-binding-card--${kind}`">
    <div class="fixed-binding-card__icon">
      <AppIcon :name="kind === 'station' ? 'i-tabler-antenna-bars-5' : 'i-tabler-box'" />
    </div>
    <div class="fixed-binding-card__content">
      <div class="fixed-binding-card__title">{{ label }}</div>
      <div class="fixed-binding-card__binding">
        <span>Bound to</span>
        <span class="fixed-binding-card__value">{{ modelValue?.instanceName || 'Not Bound' }}</span>
        <el-dropdown
          v-if="!readonly"
          trigger="click"
          placement="bottom-end"
          :show-arrow="false"
          popper-class="fixed-binding-card-popper"
          @command="onCommand"
        >
          <button type="button" class="fixed-binding-card__dropdown-trigger" :aria-label="`Bind ${label}`">
            <AppIcon name="i-tabler-chevron-down" class="fixed-binding-card__arrow" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="">Not Bound</el-dropdown-item>
              <el-dropdown-item
                v-for="item in instances"
                :key="item.instanceId"
                :command="String(item.instance_id)"
                :class="{ 'is-current': item.instance_id === modelValue?.instanceId }"
              >
                {{ item.instance_name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { DeviceInstanceBasic } from '@/types/deviceConfiguration'
import type { ModelInstanceBinding } from '@/types/visualModeling'

const props = defineProps<{
  kind: 'station' | 'environment'
  label: string
  instances: DeviceInstanceBasic[]
  modelValue?: ModelInstanceBinding | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ModelInstanceBinding | null]
}>()

function onCommand(rawValue: string | number) {
  const value = String(rawValue)
  if (!value) {
    emit('update:modelValue', null)
    return
  }
  const item = props.instances.find((instance) => String(instance.instance_id) === value)
  if (!item) return
  emit('update:modelValue', {
    instanceId: item.instance_id,
    instanceName: item.instance_name,
    productName: item.product_name,
  })
}
</script>

<style lang="scss" scoped>
.fixed-binding-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 230px;
  padding: 10px 14px;
  border: 1px solid #e3e7ef;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 31, 61, 0.12);
}

.fixed-binding-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #f0f3fb;
  color: #0b61e8;
}

.fixed-binding-card__icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.fixed-binding-card__content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.fixed-binding-card__title {
  color: #111111;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.fixed-binding-card__binding {
  display: flex;
  align-items: center;
  gap: 4px;
  // margin-top: 4px;
  color: #666666;
  font-size: 12px;
  white-space: nowrap;
}

.fixed-binding-card__value {
  max-width: 150px;
  overflow: hidden;
  color: #0b61e8;
  font-weight: 600;
  text-overflow: ellipsis;
}

.fixed-binding-card__dropdown-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
 
  background: transparent;
  color: #666666; 
  cursor: pointer;
}

.fixed-binding-card__arrow {
  width: 14px;
  height: 14px;
  color: #666666;
  pointer-events: none;
}

:global(.fixed-binding-card-popper) {
  min-width: 136px;
  padding: 4px;
  border: 1px solid #e2e7ef;
  border-radius: 6px;
  box-shadow: 0 5px 14px rgba(15, 31, 61, 0.16);
}

:global(.fixed-binding-card-popper .el-dropdown-menu__item) {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  color: #333333;
  line-height: 32px;
}

:global(.fixed-binding-card-popper .el-dropdown-menu__item:hover),
:global(.fixed-binding-card-popper .el-dropdown-menu__item.is-current) {
  background: #e7effd;
  color: #0b61e8;
}

@media (max-width: 700px) {
  .fixed-binding-card {
    min-width: 0;
    padding: 8px 10px;
  }

  .fixed-binding-card__icon {
    width: 34px;
    height: 34px;
  }

  .fixed-binding-card__title {
    font-size: 14px;
  }
}
</style>

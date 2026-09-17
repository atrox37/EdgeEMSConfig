<template>
  <div
    v-if="visible"
    class="config-section__status-filter"
    :class="{
      'config-section__status-filter--page': tone === 'page',
      'config-section__status-filter--dialog': tone === 'dialog',
      'config-section__status-filter--compact': compact,
    }"
  >
    <el-checkbox-group
      v-model="statusCheckboxValue"
      class="status-checkbox-group"
      @change="(val: unknown) => emit('statusCheckboxChange', val as string[])"
    >
      <el-checkbox v-if="viewMode === 'points'" label="modified">modified</el-checkbox>
      <el-checkbox v-if="viewMode === 'points'" label="added">added</el-checkbox>
      <el-checkbox v-if="viewMode === 'points'" label="deleted">deleted</el-checkbox>
      <el-checkbox v-if="viewMode !== 'points'" label="modified">modified</el-checkbox>
    </el-checkbox-group>
    <el-checkbox v-model="invalidChecked" class="status-invalid-checkbox">invalid</el-checkbox>
  </div>
</template>

<script setup lang="ts">
type PointsTablesViewMode = 'points' | 'routing' | 'mappings'
type StatusFilterTone = 'page' | 'dialog'

withDefaults(
  defineProps<{
    visible: boolean
    viewMode: PointsTablesViewMode
    tone?: StatusFilterTone
    compact?: boolean
  }>(),
  {
    tone: 'page',
    compact: false,
  },
)

const statusCheckboxValue = defineModel<string[]>('statusCheckboxValue', { default: () => [] })
const invalidChecked = defineModel<boolean>('invalidChecked', { default: false })

const emit = defineEmits<{
  statusCheckboxChange: [string[]]
}>()
</script>

<style scoped lang="scss">
.config-section__status-filter {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: $spacing-md;
  z-index: 10;
  height: 40px;
  line-height: 40px;

  .status-checkbox-group {
    display: flex;
    gap: $spacing-md;
    align-items: center;
    flex-wrap: wrap;
  }

  &--compact {
    gap: 12px;

    .status-checkbox-group {
      gap: $spacing-sm;
      flex-wrap: nowrap;
    }

    .status-invalid-checkbox {
      margin-left: $spacing-xs;
    }
  }

  &--page {
    :deep(.el-checkbox) {
      color: $text-color-primary;

      .el-checkbox__label {
        font-size: $font-size-base;
        color: $text-color-secondary;
      }
    }
  }

  &--dialog {
    :deep(.el-checkbox) {
      color: #fff;

      .el-checkbox__label {
        font-size: $font-size-extra-small;
        color: #fff;
      }
    }

    :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
      border-color: #fff !important;
    }

    :deep(.status-invalid-checkbox .el-checkbox__input.is-checked .el-checkbox__inner::after) {
      border-color: #fff !important;
    }
  }
}
</style>

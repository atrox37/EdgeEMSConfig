<script setup lang="ts">
defineProps<{
  isEditing?: boolean
  fieldClass?: string | string[] | Record<string, boolean>
  error?: string
  invalid?: boolean
}>()
</script>

<template>
  <div class="point-table__cell">
    <template v-if="isEditing">
      <div
        class="point-table__cell-body"
        :class="[fieldClass, invalid ? 'point-table__cell-body--invalid' : '']"
      >
        <div class="point-table__cell-edit">
          <slot name="edit" />
        </div>
      </div>
    </template>
    <span v-else :class="fieldClass">
      <slot name="display" />
    </span>
    <div v-if="isEditing && error" class="point-table__cell-error">
      {{ error }}
    </div>
  </div>
</template>

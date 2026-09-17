<script setup lang="ts">
import { POINT_TABLE_POPPER } from '@/constants/pointTable'
import { computed } from 'vue'

const props = defineProps<{
  signalNameFilter: string
  signalNameOptions: string[]
}>()

const emit = defineEmits<{
  'update:signalNameFilter': [value: string]
}>()

const signalNameFilterModel = computed({
  get: () => props.signalNameFilter,
  set: (value: string) => emit('update:signalNameFilter', value),
})
</script>

<template>
  <div class="point-table__toolbar">
    <div class="point-table__toolbar-filters">
      <span class="point-table__toolbar-label">Point Name:</span>
      <el-select
        v-model="signalNameFilterModel"
        filterable
        allow-create
        clearable
        placeholder="Search Point Name"
        style="width: 280px"
        :fit-input-width="true"
        :popper-class="POINT_TABLE_POPPER.filter"
      >
        <el-option v-for="name in signalNameOptions" :key="name" :label="name" :value="name" />
      </el-select>
    </div>
    <slot name="actions" />
  </div>
</template>

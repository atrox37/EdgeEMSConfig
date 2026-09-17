<script setup lang="ts">
const currentPage = defineModel<number>('currentPage', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })

defineProps<{
  total: number
}>()

const emit = defineEmits<{
  sizeChange: []
}>()
</script>

<template>
  <div class="point-table__pagination">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20]"
      :total="total"
      layout="total, prev, pager, next, sizes"
      @size-change="emit('sizeChange')"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from 'vue'
import type { PointTablePaginationVariant, PointTableVariant } from '@/constants/pointTable'
import { POINT_TABLE_BODY_HEIGHT_KEY } from '@/constants/pointTable'

withDefaults(
  defineProps<{
    variant?: PointTableVariant
    pagination?: PointTablePaginationVariant
    editing?: boolean
  }>(),
  {
    pagination: 'compact',
    editing: false,
  },
)

const wrapperRef = ref<HTMLElement | null>(null)
const bodyHeight = ref<number>()
provide(POINT_TABLE_BODY_HEIGHT_KEY, bodyHeight)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const el = wrapperRef.value
  if (!el) return

  const syncHeight = () => {
    const nextHeight = Math.floor(el.getBoundingClientRect().height)
    bodyHeight.value = nextHeight > 0 ? nextHeight : undefined
  }

  resizeObserver = new ResizeObserver(() => {
    syncHeight()
  })
  resizeObserver.observe(el)
  requestAnimationFrame(syncHeight)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    class="voltage-class point-table"
    :class="{
      'point-table--device': variant === 'device',
      'point-table--routing': variant === 'routing',
      'point-table--pagination-bordered': pagination === 'bordered',
      'point-table--editing': editing,
    }"
  >
    <slot name="toolbar" />
    <slot name="prepend" />
    <div ref="wrapperRef" class="point-table__wrapper">
      <slot />
    </div>
    <slot name="pagination" />
    <slot name="append" />
  </div>
</template>

<style lang="scss">
@use '@/assets/styles/components/point-table' as pt;

@include pt.point-table-styles();
</style>

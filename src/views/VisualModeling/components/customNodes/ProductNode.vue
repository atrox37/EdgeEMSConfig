<template>
  <div
    class="voltage-class product-node"
    :class="{
      'product-node--selected': selected,
      'product-node--image': hasImage,
      'product-node--has-instance': boundInstances.length > 0,
      'product-node--view-mode': hideConnectionHandles,
    }"
  >
    <NodeConnectionHandles />

    <div class="product-node__body">
      <div v-if="hasImage" class="product-node__image-only">
        <img :src="data.imageUrl" :alt="productLabel" class="product-node__img-transparent" />
        <div class="product-node__caption product-node__caption--product">{{ productLabel }}</div>
        <NodeInstanceBadges
          v-if="boundInstances.length"
          :instances="boundInstances"
          variant="on-image"
          :max="2"
        />
      </div>

      <template v-else>
        <div class="product-node__image">
          <span class="product-node__image-fallback">{{ imageFallback }}</span>
        </div>
        <div class="product-node__info">
          <div class="product-node__name">{{ nodeCaption }}</div>
          <div v-if="data.productName && data.productName !== nodeCaption" class="product-node__product">
            {{ data.productName }}
          </div>
        </div>
        <NodeInstanceBadges
          v-if="boundInstances.length"
          :instances="boundInstances"
          variant="light"
        />
        <div v-else class="product-node__empty">No instance bound</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import NodeConnectionHandles from '../NodeConnectionHandles.vue'
import NodeInstanceBadges from '../NodeInstanceBadges.vue'
import { computed, inject } from 'vue'
import { MODELING_EDITOR_KEY } from '../../modelingEditorContext'
import { getProductMeta } from '@/constants/deviceProducts'
import { normalizeNodeInstances } from '@/utils/visualModeling'
import type { ModelNodeData } from '@/types/visualModeling'

const props = defineProps<{
  data: ModelNodeData
  selected?: boolean
}>()

const editorCtx = inject(MODELING_EDITOR_KEY, null)
const hideConnectionHandles = computed(() => editorCtx?.isViewMode.value ?? false)

const meta = computed(() => getProductMeta(props.data.productName ?? ''))
const hasImage = computed(() => !!props.data.imageUrl)
const displayName = computed(() => props.data.label || meta.value.label || props.data.productName || 'Device')
const nodeCaption = computed(() => displayName.value)
const boundInstances = computed(() => normalizeNodeInstances(props.data))

/** 产品名称（绑定实例后仍保持不变） */
const productLabel = computed(() => displayName.value)

const imageFallback = computed(() => {
  const name = props.data.productName || displayName.value
  return name.slice(0, 2).toUpperCase()
})
</script>

<style lang="scss" scoped>
.product-node {
  min-width: 160px;
  max-width: 220px;
  border: 2px solid rgba(74, 144, 217, 0.45);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(15, 31, 61, 0.08);
  cursor: grab;
  position: relative;
  overflow: visible;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.product-node:active {
  cursor: grabbing;
}

.product-node.product-node--image {
  min-width: 96px;
  max-width: 140px;
  border: none;
  background: transparent;
  box-shadow: none;
}

.product-node.product-node--image.product-node--selected {
  filter: drop-shadow(0 0 6px rgba(74, 144, 217, 0.65));
}

.product-node__caption--product,
.product-node__name--product {
  color: #1565c0;
  font-weight: 700;
}

.product-node.product-node--selected:not(.product-node--image) {
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.25), 0 4px 14px rgba(0, 0, 0, 0.12);
}

.product-node__body {
  padding: 10px 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.product-node.product-node--image .product-node__body {
  padding: 0;
  gap: 4px;
}

.product-node__image-only {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.product-node__img-transparent {
  width: 88px;
  height: 88px;
  object-fit: contain;
  display: block;
  background: transparent;
  pointer-events: none;
  user-select: none;
}

.product-node__caption {
  font-size: 11px;
  font-weight: 600;
  color: #1a2438;
  text-align: center;
  line-height: 1.25;
  max-width: 130px;
  word-break: break-word;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.9);
}

.product-node__image {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: linear-gradient(135deg, #eef4fb 0%, #dce8f5 100%);
  border: 1px solid rgba(74, 144, 217, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.product-node__image-fallback {
  font-size: 14px;
  font-weight: 700;
  color: #4a90d9;
  letter-spacing: 0.5px;
}

.product-node__info {
  width: 100%;
  text-align: center;
  min-width: 0;
}

.product-node__name {
  font-size: 13px;
  font-weight: 700;
  color: #0f1f3d;
  line-height: 1.3;
  word-break: break-word;
}

.product-node__product {
  margin-top: 2px;
  font-size: 10px;
  color: #7f8c9a;
}

.product-node__empty {
  font-size: 10px;
  color: #b0b8c4;
  text-align: center;
}

.product-node:not(.product-node--view-mode):hover :deep(.node-connection-handle) {
  opacity: 1;
  pointer-events: all !important;
  background-color: #4a90d9;
}

.product-node.product-node--view-mode :deep(.node-connection-handle) {
  pointer-events: none;
}
</style>

<template>

  <div

    class="voltage-class custom-node"

    :class="[`custom-node--${data.type || 'default'}`]"

    ref="nodeRef"

    :style="nodeStyle"

  >

    <!-- 左侧连接点 -->

    <Handle

      type="target"

      :position="Position.Left"

      id="left"

      class="custom-node__handle custom-node__handle--left"

      :style="{ top: '50%' }"

    />



    <!-- 卡片内容 -->

    <div

      class="custom-node__content"

      :style="{

        marginRight:

          data.type === 'function-switch' && data.config.rule.length > 0 ? '26px' : '0',

      }"

    >

      <div class="custom-node__icon" :class="`icon--${data.type}`">

        <AppIcon name="i-tabler-git-fork" className="custom-node__icon-svg" v-if="data.type === 'function-switch'" />

        <AppIcon

          name="i-tabler-adjustments"

          className="custom-node__icon-svg"

          v-else-if="data.type === 'action-changeValue'"

        />

        <AppIcon

          name="i-tabler-chart-line"

          className="custom-node__icon-svg"

          v-else-if="data.type === 'action-periodDelta'"

        />

      </div>

      <div class="custom-node__info">

        <div class="custom-node__name">{{ data.label }}</div>

        <div class="custom-node__description">{{ data.description || '' }}</div>

      </div>

    </div>



    <!-- 右侧连接点 -->

    <Handle

      v-if="data.type !== 'function-switch'"

      type="source"

      :position="Position.Right"

      id="right1"

      class="custom-node__handle custom-node__handle--right"

      :style="{ top: '50%' }"

    ></Handle>

    <template v-if="data.type === 'function-switch'">

      <Handle

        v-for="(item, idx) in data.config.rule"

        :key="item.name"

        type="source"

        :position="Position.Right"

        :id="item.name"

        class="custom-node__handle custom-node__handle--right"

        :style="{ top: `calc(${((Number(idx) + 1) / (data.config.rule.length + 1)) * 100}% - 6px)` }"

      >

        <div class="custom-node__handle__text">{{ item.name }}</div>

      </Handle>

    </template>

  </div>

</template>



<script setup lang="ts">

import { Handle, Position } from '@vue-flow/core'

import { ref, nextTick, watch, computed } from 'vue'

import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{

  data: any

  isMonitorMode?: boolean

}>()



const nodeRef = ref<HTMLElement | null>(null)

const baseHeight = ref<number>(0)



const handlesCount = computed(() => {

  const rules = props.data?.config?.rule

  return Array.isArray(rules) ? rules.length : 0

})



const nodeStyle = computed(() => {

  if (!baseHeight.value) return {}

  const minGapRem = 0.2

  const requiredMinHeight = Math.max(baseHeight.value, (handlesCount.value + 1) * minGapRem * 100)

  return { minHeight: requiredMinHeight + 'px' }

})



function measureBaseHeight() {

  nextTick(() => {

    const h = nodeRef.value?.offsetHeight || nodeRef.value?.clientHeight || 0

    if (!baseHeight.value) baseHeight.value = h || 80

  })

}

watch(

  () => props.data?.config?.rule?.length,

  () => {

    measureBaseHeight()

  },

)

</script>



<style lang="scss" scoped>

.custom-node {

  display: flex;

  align-items: center;

  padding: 12px;

  background-color: #ffffff;

  border-radius: 8px;

  cursor: grab;

  transition: all 0.2s ease;

  width: 250px;

  border-left: 4px solid rgba(255, 138, 0, 0.4);

  border-top: 2px solid rgba(255, 138, 0, 0.4);

  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.15);

  position: relative;

}



.custom-node:hover {

  border-color: #ff8a00;

  box-shadow: 4px 4px 12px rgba(255, 138, 0, 0.25);

}



.custom-node:active {

  cursor: grabbing;

}



.custom-node.custom-node--function-switch {

  background-color: #81c784;

}



.custom-node.custom-node--action-changeValue {

  background-color: #4fc3f7;

}



.custom-node.custom-node--action-periodDelta {

  background-color: #9c27b0;

}



.custom-node.custom-node--function-switch .custom-node__name,

.custom-node.custom-node--function-switch .custom-node__description,

.custom-node.custom-node--action-changeValue .custom-node__name,

.custom-node.custom-node--action-changeValue .custom-node__description,

.custom-node.custom-node--action-periodDelta .custom-node__name,

.custom-node.custom-node--action-periodDelta .custom-node__description {

  color: #ffffff;

}



.custom-node__icon.icon--function-switch {

  background-color: #66bb6a;

}



.custom-node__icon.icon--action-changeValue {

  background-color: #29b6f6;

}



.custom-node__icon.icon--action-periodDelta {

  background-color: #7b1fa2;

}



.custom-node__handle {

  width: 12px;

  height: 12px;

  background-color: #ff8a00;

  border: 2px solid white;

  border-radius: 50%;

  position: absolute;

  top: 50%;

  transform: translateY(-50%);

  z-index: 10;

  cursor: crosshair;

}



.custom-node__handle--left {

  left: -6px;

}



.custom-node__handle--right {

  right: -6px;

}



.custom-node__handle__text {

  font-size: 10px;

  color: rgba(255, 105, 0, 1);

  position: absolute;

  top: 50%;

  right: 16px;

  text-align: right;

  transform: translateY(-50%);

}



.custom-node__handle:hover {

  background-color: #ffb74d;

  transform: translateY(-50%) scale(1.2);

}



.custom-node__content {

  display: flex;

  align-items: center;

  width: 100%;

  padding: 0 8px;

}



.custom-node__icon {

  width: 36px;

  height: 36px;

  display: flex;

  align-items: center;

  justify-content: center;

  background-color: #fff2e6;

  border-radius: 6px;

  margin-right: 12px;

}



.custom-node__icon :deep(svg) {

  width: 20px;

  height: 20px;

  color: #ffffff !important;

}



.custom-node__icon-svg,

.custom-node__icon img {

  width: 20px;

  height: 20px;

}



.custom-node__info {

  flex: 1;

}



.custom-node__name {

  font-weight: 600;

  color: #2c3e50;

  margin-bottom: 4px;

  font-size: 14px;

  word-break: break-word;

  word-wrap: break-word;

  max-width: 100%;

  overflow-wrap: break-word;

}



.custom-node__description {

  font-size: 12px;

  color: #909399;

  line-height: 1.4;

  word-break: break-word;

  word-wrap: break-word;

  max-width: 100%;

  overflow-wrap: break-word;

}

</style>


<template>

  <el-popover

    v-model:visible="tooltipVisible"

    :width="320"

    trigger="hover"

    placement="right-start"

    :show-after="700"

    :hide-after="100"

    :disabled="tooltipSuppressed"

    popper-class="rule-chain-palette-tooltip"

  >

    <template #reference>

      <div

        class="rule-palette-card"

        :class="`rule-palette-card--${card.type}`"

        draggable="true"

        @mousedown="tooltipVisible = false"

        @dragstart="handleDragStart"

        @dragend="releaseTooltipSuppression"

      >

        <div class="rule-palette-card__content">

          <div class="rule-palette-card__icon" :class="`rule-palette-card__icon--${card.type}`">

            <AppIcon

              :name="String(card.icon || 'i-tabler-shape')"

              className="rule-palette-card__icon-svg"

            />

          </div>

          <div class="rule-palette-card__info">

            <div class="rule-palette-card__name">{{ card.name }}</div>

          </div>

        </div>

      </div>

    </template>



    <div class="rule-chain-palette-tooltip__content">

      <div class="rule-chain-palette-tooltip__title">{{ card.name }}</div>

      <div class="rule-chain-palette-tooltip__subtitle">Function description:</div>

      <div class="rule-chain-palette-tooltip__body">{{ card.description }}</div>

      <div v-if="card.detail" class="rule-chain-palette-tooltip__hint">

        <AppIcon name="i-tabler-info-circle" class="rule-chain-palette-tooltip__hint-icon" />

        <span>{{ card.detail }}</span>

      </div>

    </div>

  </el-popover>

</template>



<script setup lang="ts">

import { onBeforeUnmount, ref } from 'vue'

import AppIcon from '@/components/AppIcon.vue'

import type { RuleCardPaletteItem } from '@/constants/ruleCardPalette'



const TOOLTIP_SUPPRESS_MS = 400



defineProps<{

  card: RuleCardPaletteItem

}>()



const emit = defineEmits<{

  dragstart: [event: DragEvent]

}>()



const tooltipVisible = ref(false)

const tooltipSuppressed = ref(false)

let suppressTimer: ReturnType<typeof window.setTimeout> | undefined



function clearSuppressTimer() {

  if (suppressTimer) {

    window.clearTimeout(suppressTimer)

    suppressTimer = undefined

  }

}



function suppressTooltip() {

  tooltipVisible.value = false

  tooltipSuppressed.value = true

  clearSuppressTimer()

}



function releaseTooltipSuppression() {

  clearSuppressTimer()

  suppressTimer = window.setTimeout(() => {

    tooltipSuppressed.value = false

    suppressTimer = undefined

  }, TOOLTIP_SUPPRESS_MS)

}



function handleDragStart(event: DragEvent) {

  suppressTooltip()

  emit('dragstart', event)

}



onBeforeUnmount(clearSuppressTimer)

</script>



<style lang="scss" scoped>

.rule-palette-card {

  width: 100%;

  box-sizing: border-box;

  display: flex;

  align-items: center;

  padding: 12px;

  background-color: #ffffff;

  border-radius: 8px;

  border: 1px solid rgba(179, 206, 250, 0.9);

  cursor: grab;

  transition: all 0.2s ease;



  &:hover {

    border-color: #035def;

  }



  &:active {

    cursor: grabbing;

    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);

  }

}



.rule-palette-card--function-switch {

  background-color: #81c784;

}



.rule-palette-card--action-changeValue {

  background-color: #4fc3f7;

}



.rule-palette-card--action-periodDelta {

  background-color: #9c27b0;

}



.rule-palette-card__content {

  display: flex;

  align-items: center;

  width: 100%;

  padding: 0 8px;

  min-width: 0;

}



.rule-palette-card__icon {

  flex-shrink: 0;

  width: 36px;

  height: 36px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 6px;

  margin-right: 12px;



  :deep(svg) {

    width: 20px;

    height: 20px;

    color: #ffffff !important;

  }

}



.rule-palette-card__icon--function-switch {

  background-color: #66bb6a;

}



.rule-palette-card__icon--action-changeValue {

  background-color: #29b6f6;

}



.rule-palette-card__icon--action-periodDelta {

  background-color: #7b1fa2;

}



.rule-palette-card__info {

  flex: 1;

  min-width: 0;

}



.rule-palette-card__name {

  font-weight: 600;

  font-size: 14px;

  line-height: 1.3;

  color: #ffffff;

  word-break: break-word;

  overflow-wrap: break-word;

}

</style>



<style lang="scss">

.rule-chain-palette-tooltip.el-popover.el-popper {

  padding: 16px 18px;

  border: 1px solid #e8edf5;

  border-radius: 10px;

  box-shadow: 0 10px 24px rgba(15, 31, 61, 0.12);

}



.rule-chain-palette-tooltip__content {

  display: flex;

  flex-direction: column;

  gap: 12px;

}



.rule-chain-palette-tooltip__title {

  font-size: 18px;

  font-weight: 700;

  color: #1a2438;

  line-height: 1.3;

}



.rule-chain-palette-tooltip__subtitle {

  margin-top: -4px;

  font-size: 13px;

  font-weight: 600;

  color: #667085;

}



.rule-chain-palette-tooltip__body {

  font-size: 14px;

  color: #344054;

  line-height: 1.5;

}



.rule-chain-palette-tooltip__hint {

  display: flex;

  align-items: flex-start;

  gap: 8px;

  padding: 10px 12px;

  border-radius: 8px;

  background: rgba(3, 93, 239, 0.08);

  color: #1d4fbf;

  font-size: 13px;

  line-height: 1.5;

}



.rule-chain-palette-tooltip__hint-icon {

  flex-shrink: 0;

  margin-top: 2px;

  font-size: 16px;

  color: #035def;

}

</style>



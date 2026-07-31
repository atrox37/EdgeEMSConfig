<template>
  <section class="module-page-header" :class="`module-page-header--${variant}`">
    <div class="module-page-header__title-row">
      <div class="module-page-header__title-row-left">
        <img :src="cardIcon" class="module-page-header__card-icon" />
        <div class="module-page-header__title">
          <slot name="title">{{ title }}</slot>
        </div>
      </div>
      <div v-if="$slots.toolbar" class="module-page-header__title-row-right">
        <slot name="toolbar" />
      </div>
    </div>
    <div v-if="$slots.filters" class="module-page-header__filters-row">
      <slot name="filters" />
    </div>
  </section>
</template>

<script setup lang="ts">
import cardIcon from '@/assets/icons/card-icon.svg'
withDefaults(defineProps<{
  title: string
  /** actions: title and operation buttons; filters: title and filter controls */
  variant?: 'actions' | 'filters'
}>(), {
  variant: 'actions',
})
</script>

<style lang="scss" scoped>
.module-page-header {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  box-shadow: 0px 6px 12px 0px #0000000D;
  border-bottom: 1px solid #DCDFE6;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  padding: 0 16px;

  .module-page-header__title-row {
    width: 100%;
    display: flex;
    align-items: center;
    // gap: 4px;
    justify-content: space-between;
    .module-page-header__title-row-left {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .module-page-header__title-row-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }


    img {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    // justify-content: space-between;
    .module-page-header__title {
      // font-family: Arimo;
      font-weight: var(--vt-font-weight-bold);
      font-size: var(--vt-font-size-lg);
      line-height: 100%;
      letter-spacing: 0%;
      // color: var(--vt-text-primary);

    }
  }
}
</style>
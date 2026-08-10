<template>
  <div v-if="loading" class="loading-bg">
    <span class="loading-bg__spinner" />
    <span v-if="text" class="loading-bg__text">{{ text }}</span>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean
    text?: string
  }>(),
  {
    loading: false,
    text: '',
  },
)
</script>

<style scoped lang="scss">
.loading-bg {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(251, 252, 255, 0.86);
  color: #395583;
  font-size: 13px;
  letter-spacing: 0.02em;
  pointer-events: all;
}

.loading-bg__spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #dce8fb;
  border-top-color: #2878ff;
  border-radius: 50%;
  animation: loading-bg-spin 0.8s linear infinite;
}

.loading-bg__text {
  white-space: nowrap;
}

@keyframes loading-bg-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

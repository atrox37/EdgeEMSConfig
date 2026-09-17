<template>
  <div
    v-if="hintVisible"
    class="topology-connection-hint nodrag nopan"
    :style="hintStyle"
  >
    <div
      class="topology-connection-hint__bubble"
      :class="`topology-connection-hint__bubble--${hintTone}`"
    >
      {{ hintMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { TOPOLOGY_CONNECTION_HINT_KEY } from '../composables/useTopologyConnectionHint'

const hint = inject(TOPOLOGY_CONNECTION_HINT_KEY, null)

// inject 拿到的是普通对象，嵌套的 computed 需要显式解包（否则 v-if 恒真、插值显示对象）
const hintVisible = computed(() => hint?.hintVisible.value ?? false)
const hintMessage = computed(() => hint?.hintMessage.value ?? '')
const hintTone = computed(() => hint?.hintTone.value ?? 'neutral')
const hintStyle = computed(() => hint?.hintStyle.value ?? {})
</script>

<style lang="scss" scoped>
.topology-connection-hint {
  position: absolute;
  z-index: 60;
  pointer-events: none;
}

.topology-connection-hint__bubble {
  max-width: 260px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.45;
  box-shadow: 0 8px 20px rgba(15, 31, 61, 0.14);
}

.topology-connection-hint__bubble--neutral {
  color: #1d4fbf;
  background: #ffffff;
  border: 1px solid #b3cefa;
}

.topology-connection-hint__bubble--valid {
  color: #027a48;
  background: #ecfdf3;
  border: 1px solid rgba(18, 183, 106, 0.35);
}

.topology-connection-hint__bubble--invalid {
  color: #b42318;
  background: #fef3f2;
  border: 1px solid rgba(240, 68, 56, 0.35);
}
</style>

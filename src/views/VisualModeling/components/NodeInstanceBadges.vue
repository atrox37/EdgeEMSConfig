<template>
  <div v-if="instances.length" class="node-instance-badges" :class="`node-instance-badges--${variant}`">
    <span
      v-for="inst in displayList"
      :key="inst.instanceId"
      class="node-instance-badges__tag"
      :title="inst.instanceName"
    >
      {{ inst.instanceName }}
    </span>
    <span v-if="moreCount > 0" class="node-instance-badges__more">+{{ moreCount }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModelInstanceBinding } from '@/types/visualModeling'

const props = withDefaults(
  defineProps<{
    instances: ModelInstanceBinding[]
    max?: number
    variant?: 'light' | 'dark' | 'on-image'
  }>(),
  {
    max: 3,
    variant: 'light',
  },
)

const displayList = computed(() => props.instances.slice(0, props.max))
const moreCount = computed(() => Math.max(0, props.instances.length - props.max))
</script>

<style lang="scss" scoped>
.node-instance-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  max-width: 100%;

  .node-instance-badges__tag {
    max-width: 100%;
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-instance-badges__more {
    font-size: 10px;
    padding: 2px 4px;
    opacity: 0.85;
  }

  .node-instance-badges--light &__tag {
    background: rgba(74, 144, 217, 0.12);
    color: #2f5f93;
  }
  .node-instance-badges--light .node-instance-badges__more { color: #909399; }

  .node-instance-badges--dark &__tag {
    background: rgba(255, 255, 255, 0.22);
    color: #fff;
  }
  .node-instance-badges--dark .node-instance-badges__more { color: rgba(255, 255, 255, 0.75); }

  .node-instance-badges--on-image &__tag {
    background: rgba(255, 255, 255, 0.92);
    color: #1a2438;
    box-shadow: 0 1px 4px rgba(15, 31, 61, 0.12);
  }
  .node-instance-badges--on-image .node-instance-badges__more { color: #5a6a7e; }
}
</style>

<template>
  <el-popover
    :width="240"
    trigger="hover"
    placement="top"
    :show-after="300"
    :hide-after="100"
    :offset="8"
    popper-class="topology-node-status-tooltip"
  >
    <template #reference>
      <button
        type="button"
        class="topology-node-status-badge nodrag nopan"
        :class="`topology-node-status-badge--${status.level}`"
        :aria-label="status.title"
        @click.stop
      >
        <span class="topology-node-status-badge__dot" />
      </button>
    </template>

    <div
      class="topology-node-status-tooltip__content"
      :class="`topology-node-status-tooltip__content--${status.level}`"
    >
      <div class="topology-node-status-tooltip__title">{{ status.title }}</div>
      <p v-if="status.level === 'ok'" class="topology-node-status-tooltip__summary">
        All connection requirements met.
      </p>
      <ul v-else class="topology-node-status-tooltip__issues">
        <li v-for="(message, index) in status.messages" :key="`${message}-${index}`">
          {{ message }}
        </li>
      </ul>
    </div>  </el-popover>
</template>

<script setup lang="ts">
import type { TopologyNodeStatus } from '@/utils/topologyNodeStatus'

defineProps<{
  status: TopologyNodeStatus
}>()
</script>

<style lang="scss" scoped>
.topology-node-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: help;
}

.topology-node-status-badge__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 2px #ffffff;
}

.topology-node-status-badge--ok .topology-node-status-badge__dot {
  background: #12b76a;
}

.topology-node-status-badge--warning .topology-node-status-badge__dot {
  background: #f79009;
}

.topology-node-status-badge--error .topology-node-status-badge__dot {
  background: #f04438;
}
</style>

<style lang="scss">
.topology-node-status-tooltip.el-popover.el-popper {
  padding: 12px 14px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(15, 31, 61, 0.12);
}

.topology-node-status-tooltip__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.topology-node-status-tooltip__title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.topology-node-status-tooltip__summary,
.topology-node-status-tooltip__issues {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.topology-node-status-tooltip__summary {
  font-weight: 500;
}

.topology-node-status-tooltip__issues {
  padding-left: 26px;

  li + li {
    margin-top: 4px;
  }
}

.topology-node-status-tooltip__content--ok .topology-node-status-tooltip__title {
  color: #027a48;
}

.topology-node-status-tooltip__content--ok .topology-node-status-tooltip__summary {
  color: #027a48;
  background: rgba(18, 183, 106, 0.1);
}

.topology-node-status-tooltip__content--warning .topology-node-status-tooltip__title {
  color: #b54708;
}

.topology-node-status-tooltip__content--warning .topology-node-status-tooltip__issues {
  color: #b54708;
  background: rgba(247, 144, 9, 0.12);

  li::marker {
    color: #f79009;
  }
}

.topology-node-status-tooltip__content--error .topology-node-status-tooltip__title {
  color: #b42318;
}

.topology-node-status-tooltip__content--error .topology-node-status-tooltip__issues {
  color: #b42318;
  background: rgba(240, 68, 56, 0.1);

  li::marker {
    color: #f04438;
  }
}
</style>

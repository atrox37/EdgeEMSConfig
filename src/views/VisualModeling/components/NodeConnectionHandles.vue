<template>
  <template v-for="side in SIDES" :key="side.id">
    <Handle
      type="source"
      :position="side.position"
      :id="`${side.id}-source`"
      connectable
      class="node-connection-handle node-connection-handle--source"
    />
    <Handle
      type="target"
      :position="side.position"
      :id="`${side.id}-target`"
      connectable
      class="node-connection-handle node-connection-handle--target"
    />
  </template>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

const SIDES = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
] as const
</script>

<style lang="scss" scoped>
.node-connection-handle {
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background-color: #78909c;
  opacity: 0;
  pointer-events: all !important;
  z-index: 50;
}

.node-connection-handle::before {
  content: '';
  position: absolute;
  inset: -12px;
  border-radius: 50%;
}
</style>

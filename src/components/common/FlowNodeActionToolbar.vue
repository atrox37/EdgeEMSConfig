<template>
  <div class="flow-node-action-toolbar nodrag nopan" @mousedown.stop @click.stop>
    <button
      type="button"
      class="flow-node-action-toolbar__action"
      aria-label="Edit node"
      title="Edit"
      @click.stop="emit('edit')"
    >
      <span class="flow-node-action-toolbar__halo" aria-hidden="true" />
      <img
        class="flow-node-action-toolbar__glyph"
        :src="topologyEditIcon"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
    </button>
    <button
      type="button"
      class="flow-node-action-toolbar__action"
      aria-label="Delete node"
      title="Delete"
      @click.stop="emit('delete')"
    >
      <span class="flow-node-action-toolbar__halo" aria-hidden="true" />
      <img
        class="flow-node-action-toolbar__glyph"
        :src="topologyDeleteIcon"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import topologyDeleteIcon from '@/assets/icons/topology-delete.svg'
import topologyEditIcon from '@/assets/icons/topology-edit.svg'

const emit = defineEmits<{
  edit: []
  delete: []
}>()
</script>

<style lang="scss" scoped>
.flow-node-action-toolbar {
  position: absolute;
  top: -46px;
  left: 50%;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  transform: translateX(-50%);
  pointer-events: none;
}

.flow-node-action-toolbar__action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  pointer-events: all;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(0.92);
  }
}

.flow-node-action-toolbar__halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #ffffff;
}

.flow-node-action-toolbar__glyph {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  object-fit: contain;
  pointer-events: none;
}
</style>

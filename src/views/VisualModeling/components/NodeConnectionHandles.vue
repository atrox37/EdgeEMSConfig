<template>
  <template v-for="side in SIDES" :key="side.id">
    <Handle
      type="source"
      :position="side.position"
      :id="`${side.id}-source`"
      connectable
      :style="handleStyle(side.id)"
      :class="handleClass(side.id, 'source')"
    />
    <Handle
      type="target"
      :position="side.position"
      :id="`${side.id}-target`"
      connectable
      :style="handleStyle(side.id)"
      :class="handleClass(side.id, 'target')"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position, useNodeConnections } from "@vue-flow/core";

const props = withDefaults(
  defineProps<{
    nodeId: string;
    viewMode?: boolean;
    borderColor?: string;
  }>(),
  { viewMode: false, borderColor: "#B3CEFA" },
);

function handleStyle(side: (typeof SIDES)[number]["id"]) {
  return {
    "--node-connection-border": props.borderColor,
    top:
      side === "top"
        ? "1px"
        : ["left", "right"].includes(side)
          ? "50%"
          : "auto",
    right: side === "right" ? "1px" : "auto",
    bottom: side === "bottom" ? "1px" : "auto",
    left:
      side === "left" || ["top", "bottom"].includes(side)
        ? side === "left"
          ? "1px"
          : "50%"
        : "auto",
    transform:
      side === "right"
        ? "translate(50%, -50%)"
        : side === "bottom"
          ? "translate(-50%, 50%)"
          : "translate(-50%, -50%)",
  };
}

const SIDES = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const;

const connections = useNodeConnections();
const connectedHandleIds = computed(
  () =>
    new Set(
      connections.value.flatMap((connection) => {
        const handles =
          connection.source === props.nodeId
            ? [connection.sourceHandle]
            : connection.target === props.nodeId
              ? [connection.targetHandle]
              : [];
        return handles
          .filter((handle): handle is string => Boolean(handle))
          .flatMap((handle) => [handle, toViewHandleId(handle)]);
      }),
    ),
);

function handleClass(side: string, type: "source" | "target") {
  const id = `${side}-${type}`;
  return [
    "node-connection-handle",
    `node-connection-handle--${type}`,
    props.viewMode
      ? connectedHandleIds.value.has(id)
        ? "node-connection-handle--connected"
        : ""
      : "node-connection-handle--edit",
  ];
}

function toViewHandleId(handle: string) {
  const match = handle.match(
    /^(top|right|bottom|left)(?:-[^-]+)*-(source|target)$/,
  );
  return match ? `${match[1]}-${match[2]}` : handle;
}
</script>

<style lang="scss" scoped>
.node-connection-handle {
  width: 15px;
  height: 15px;
  box-sizing: border-box;
  border: 1px solid var(--node-connection-border, #b3cefa);
  border-radius: 50%;
  background-color: #fff;
  opacity: 0;
  pointer-events: none !important;
  z-index: 50;
}

.node-connection-handle.vue-flow__handle-top {
  top: 1px;
}

.node-connection-handle.vue-flow__handle-right {
  right: 1px;
}

.node-connection-handle.vue-flow__handle-bottom {
  bottom: 1px;
}

.node-connection-handle.vue-flow__handle-left {
  left: 1px;
}

.node-connection-handle--connected,
.node-connection-handle--edit {
  opacity: 1;
}

.node-connection-handle--edit {
  pointer-events: all !important;
  // background-color: #fff;
}

.node-connection-handle--edit.node-connection-handle--target {
  z-index: 51;
}

.node-connection-handle--edit.connecting {
  background-color: #035def;
}
</style>

<template>
  <template v-for="side in SIDES" :key="side.id">
    <Handle
      type="source"
      :position="side.position"
      :id="side.id"
      connectable
      :style="handleStyle(side.id)"
      :class="handleClass(side.id, 'source')"
    />
    <Handle
      type="target"
      :position="side.position"
      :id="side.id"
      connectable
      :style="handleStyle(side.id)"
      :class="handleClass(side.id, 'target')"
    />
  </template>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { Handle, Position, useNodeConnections, useVueFlow } from "@vue-flow/core";
import { canPreviewNodePair, toSourceHandle, toTargetHandle } from "@/utils/modelFlowRules";
import { TOPOLOGY_CONNECTION_HINT_KEY } from "../composables/useTopologyConnectionHint";

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

const {
  connectionStartHandle,
  connectionEndHandle,
  findNode,
  getNodes,
  getEdges,
} = useVueFlow();
const topologyConnectionHint = inject(TOPOLOGY_CONNECTION_HINT_KEY, null);
const connectionStatus = computed(() => topologyConnectionHint?.connectionStatus.value ?? null);
const connections = useNodeConnections();
const connectedHandleIds = computed(
  () =>
    new Set(
      connections.value.flatMap((connection) => {
        if (connection.source === props.nodeId && connection.sourceHandle) {
          return [`${toSourceHandle(connection.sourceHandle)}-source`];
        }
        if (connection.target === props.nodeId && connection.targetHandle) {
          return [`${toTargetHandle(connection.targetHandle)}-target`];
        }
        return [];
      }),
    ),
);

const previewTarget = computed(() => {
  const start = connectionStartHandle.value;
  if (props.viewMode || !start || start.nodeId === props.nodeId) return null;

  const fromNode = findNode(start.nodeId);
  const thisNode = findNode(props.nodeId);
  if (!fromNode || !thisNode) return null;

  return canPreviewNodePair(fromNode, thisNode, getNodes.value, getEdges.value);
});

function handleClass(side: string, type: "source" | "target") {
  const id = `${side}-${type}`;
  const classes = [
    "node-connection-handle",
    `node-connection-handle--${type}`,
    props.viewMode
      ? connectedHandleIds.value.has(id)
        ? "node-connection-handle--connected"
        : ""
      : "node-connection-handle--edit",
  ];

  if (props.viewMode || !connectionStartHandle.value) return classes;

  const start = connectionStartHandle.value;
  const isActiveSource =
    start.nodeId === props.nodeId && start.id === side && start.type === type;
  if (isActiveSource) {
    classes.push("node-connection-handle--source-active");
  } else if (start.nodeId !== props.nodeId) {
    if (previewTarget.value) {
      classes.push("node-connection-handle--preview-valid");
    } else {
      classes.push("node-connection-handle--preview-muted");
    }
  }

  const end = connectionEndHandle.value;
  if (end?.nodeId === props.nodeId && end.id === side && end.type === type) {
    if (connectionStatus.value === "valid") {
      classes.push("node-connection-handle--target-valid");
    } else if (connectionStatus.value === "invalid") {
      classes.push("node-connection-handle--target-invalid");
    }
  }

  return classes;
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

.node-connection-handle--source-active {
  background-color: #035def;
  border-color: #035def;
}

.node-connection-handle--preview-valid {
  opacity: 1;
  border-color: #12b76a;
  box-shadow: 0 0 0 3px rgba(18, 183, 106, 0.18);
}

.node-connection-handle--preview-muted {
  opacity: 0.35;
}

.node-connection-handle--target-valid {
  background-color: #ecfdf3;
  border-color: #12b76a;
}

.node-connection-handle--target-invalid {
  background-color: #fef3f2;
  border-color: #f04438;
}
</style>

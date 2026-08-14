<template>
  <div
    class="voltage-class topology-node"
    :class="{
      'topology-node--group': isGroup,
      'topology-node--product': !isGroup,
      'topology-node--nested': isNested,
    }"
    :style="nodeStyle"
  >
    <NodeConnectionHandles
      v-if="isGroup || !isNested"
      :node-id="props.id"
      :view-mode="viewMode"
      :border-color="connectionBorderColor"
    />

    <TopologyCard
      :label="nodeLabel"
      :caption="nodeCaption"
      :binding-label="boundLabel"
      :binding-display-value="boundValue"
      :show-binding="allowBinding"
      :image-url="data.imageUrl"
      :variant="variant"
      :type-label="typeLabel"
      :expanded="expanded"
      :view-mode="viewMode"
      :selected="selected"
      :editing="editing"
      :allow-binding="allowBinding"
      :draft="draft"
      :available-instances="availableInstances"
      @toggle="toggleExpanded"
      @delete="editorCtx?.deleteNode?.(props.id)"
      @edit="startEditing"
      @cancel="cancelEditing"
      @save="saveEditing"
    >
      <template #details>
        <slot />
      </template>
      <div v-if="isGroup && childNodes.length" class="topology-node__components">
        <TopologyComponentCard
          v-for="child in childNodes"
          :id="child.id"
          :key="child.id"
          :data="child.data"
          :label="getChildLabel(child)"
          :caption="getChildCaption(child)"
          :image-url="child.data.imageUrl"
          @toggle="handleChildToggle(child.id, $event)"
        />
      </div>
    </TopologyCard>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from "vue";
import { useVueFlow, type Node as FlowNode } from "@vue-flow/core";
import type {
  ModelNodeData,
  ModelNodeType,
  TopologyNodeKind,
} from "@/types/visualModeling";
import { useTopologyNodeEditor } from "../../composables/useTopologyNodeEditor";
import NodeConnectionHandles from "../NodeConnectionHandles.vue";
import TopologyCard from "./TopologyCard.vue";
import TopologyComponentCard from "./TopologyComponentCard.vue";

const props = withDefaults(
  defineProps<{
    id: string;
    type?: ModelNodeType;
    data?: ModelNodeData;
    selected?: boolean;
    parentNode?: string | null;
  }>(),
  {
    type: "product",
    data: () => ({ label: "", productName: "Device" }) satisfies ModelNodeData,
  },
);

const { findNode, getNodes, updateNodeInternals } = useVueFlow();
const isGroup = computed(() => props.type === "group");
const parentNode = computed(() => {
  const parentId = props.parentNode || findNode(props.id)?.parentNode;
  return parentId ? findNode(parentId) : undefined;
});
const isNested = computed(
  () =>
    parentNode.value?.type === "group" ||
    ["composite", "container"].includes(
      String(parentNode.value?.data?.topologyType ?? ""),
    ),
);
const isContainer = computed(() => {
  if (!isGroup.value) return false;
  if (props.data.topologyType === "composite") return false;
  if (props.data.topologyType === "container") return true;
  return props.data.isContainer === true;
});
const allowBinding = computed(() => !isContainer.value);
const variant = computed<TopologyNodeKind | "component">(() => {
  if (isGroup.value) return isContainer.value ? "container" : "composite";
  return isNested.value ? "component" : "standalone";
});
const typeLabel = computed(() => {
  const labels: Record<typeof variant.value, string> = {
    standalone: "Standalone",
    component: "Component",
    composite: "Composite",
    container: "Container",
  };
  return labels[variant.value];
});
const productLabel = computed(
  () =>
    props.data.label ||
    props.data.productName ||
    "Device",
);
const nodeLabel = computed(() =>
  isGroup.value ? props.data.label : productLabel.value,
);
const nodeCaption = computed(() =>
  isGroup.value ? props.data.label : productLabel.value,
);
const childNodes = computed(() =>
  getNodes.value
    .filter((node) => node.parentNode === props.id)
    .sort((left, right) =>
      getChildLabel(left).localeCompare(getChildLabel(right), undefined, {
        sensitivity: "base",
      }),
    ),
);

function getChildLabel(child: FlowNode): string {
  const data = child.data as ModelNodeData;
  return data.label || data.productName || "Device";
}

function getChildCaption(child: FlowNode): string {
  const data = child.data as ModelNodeData;
  return data.productName || getChildLabel(child);
}

const {
  editorCtx,
  expanded,
  editing,
  draft,
  boundLabel,
  boundValue,
  availableInstances,
  startEditing,
  cancelEditing,
  saveEditing,
} = useTopologyNodeEditor(props, { allowBinding });

const viewMode = computed(() => editorCtx?.isViewMode.value ?? false);

function refreshNodeInternals() {
  void nextTick().then(() => {
    requestAnimationFrame(() => updateNodeInternals([props.id]));
  });
}

watch(viewMode, () => {
  if (isGroup.value) editorCtx?.setNodeExpanded?.(props.id, false);
  refreshNodeInternals();
});

const connectionBorderColor = computed(() => {
  if (props.selected) {
    if (variant.value === "composite") return "#FF6900";
    if (variant.value === "container") return "#003C71";
    return "#035DEF";
  }
  if (variant.value === "composite") return "#FFF0E6";
  if (variant.value === "container") return "#E9EDF2";
  return "#B3CEFA";
});
const nodeStyle = computed(() =>
  isGroup.value
    ? {
        width: "100%",
        background: "transparent",
        border: "0",
        boxShadow: "none",
      }
    : undefined,
);

function toggleExpanded() {
  expanded.value = !expanded.value;
  if (isGroup.value) editorCtx?.setNodeExpanded?.(props.id, expanded.value);
  refreshNodeInternals();
}

function handleChildToggle(childId: string, childExpanded: boolean) {
  editorCtx?.updateNodeData?.(childId, { uiExpanded: childExpanded });
  void nextTick(() => {
    editorCtx?.setNodeExpanded?.(props.id, expanded.value);
  });
}

onMounted(() => {
  if (isGroup.value) editorCtx?.setNodeExpanded?.(props.id, expanded.value);
});
</script>

<style lang="scss" scoped>
.topology-node {
  position: relative;
  box-sizing: border-box;
  overflow: visible;
}

/* Nested devices are rendered by the parent group's component list. */
.topology-node--nested {
  display: none;
}

.topology-node--product {
  width: 280px;
  min-width: 280px;
  max-width: 280px;
}

.topology-node__components {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
  gap: 6px;
  padding: 0 12px 12px;
}
</style>

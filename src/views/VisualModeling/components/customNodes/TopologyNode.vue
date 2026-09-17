<template>
  <div class="voltage-class topology-node topology-node--product">
    <NodeConnectionHandles
      :node-id="props.id"
      :view-mode="viewMode"
      :border-color="connectionBorderColor"
    />

    <TopologyCard
      :label="nodeLabel"
      :caption="nodeCaption"
      :binding-label="boundLabel"
      :binding-display-value="boundValue"
      :show-binding="true"
      :image-url="props.data.imageUrl"
      variant="standalone"
      type-label="Standalone"
      :expanded="expanded"
      :view-mode="viewMode"
      :selected="selected"
      :editing="editing"
      :allow-binding="true"
      :draft="draft"
      :available-instances="availableInstances"
      :status="nodeStatus"
      @toggle="expanded = !expanded"
      @delete="editorCtx?.deleteNode?.(props.id)"
      @edit="startEditing"
      @cancel="cancelEditing"
      @save="saveEditing"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, watch } from "vue";
import { useVueFlow } from "@vue-flow/core";
import type { ModelNodeData } from "@/types/visualModeling";
import { getNodeTopologyStatus } from "@/utils/topologyNodeStatus";
import { useTopologyNodeEditor } from "../../composables/useTopologyNodeEditor";
import NodeConnectionHandles from "../NodeConnectionHandles.vue";
import TopologyCard from "./TopologyCard.vue";

const props = withDefaults(
  defineProps<{
    id: string;
    data?: ModelNodeData;
    selected?: boolean;
  }>(),
  {
    data: () => ({ label: "", productName: "Device" }) satisfies ModelNodeData,
  },
);

const { getNodes, getEdges, updateNodeInternals } = useVueFlow();

const productLabel = computed(
  () => props.data.label || props.data.productName || "Device",
);
const nodeLabel = computed(() => productLabel.value);
const nodeCaption = computed(() => productLabel.value);

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
} = useTopologyNodeEditor(props, { allowBinding: true });

const viewMode = computed(() => editorCtx?.isViewMode.value ?? false);

const nodeStatus = computed(() => {
  if (viewMode.value) return null;
  const node = getNodes.value.find((item) => item.id === props.id);
  if (!node) return null;
  return getNodeTopologyStatus(node, getNodes.value, getEdges.value);
});

function refreshNodeInternals() {
  void nextTick().then(() => {
    requestAnimationFrame(() => updateNodeInternals([props.id]));
  });
}

watch(viewMode, () => {
  expanded.value = false;
  refreshNodeInternals();
});

const connectionBorderColor = computed(() => (props.selected ? "#035DEF" : "#B3CEFA"));
</script>

<style lang="scss" scoped>
.topology-node {
  position: relative;
  box-sizing: border-box;
  overflow: visible;
  width: 280px;
  min-width: 280px;
  max-width: 280px;
}
</style>

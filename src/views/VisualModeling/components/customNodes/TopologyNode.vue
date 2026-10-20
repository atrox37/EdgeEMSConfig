<template>
  <div class="voltage-class topology-node topology-node--product">
    <NodeConnectionHandles
      :node-id="props.id"
      :view-mode="viewMode"
      :border-color="connectionBorderColor"
    />

    <TopologyCard
      :label="nodeLabel"
      :binding-label="boundLabel"
      :image-url="props.data.imageUrl"
      :view-mode="viewMode"
      :selected="selected"
      :draft="draft"
      :available-instances="availableInstances"
      :status="nodeStatus"
      @delete="editorCtx?.deleteNode?.(props.id)"
      @update:label="updateField('label', $event)"
      @update:description="updateField('description', $event)"
      @update:instance-id="updateField('instanceId', $event)"
    >
      <TopologyRealtimePoints
        v-if="viewMode"
        :product-name="realtimeProductName"
        :instance-id="props.data.instanceId"
      />
    </TopologyCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useVueFlow } from "@vue-flow/core";
import type { ModelNodeData } from "@/types/visualModeling";
import { getNodeTopologyStatus } from "@/utils/topologyNodeStatus";
import { useTopologyNodeEditor } from "../../composables/useTopologyNodeEditor";
import NodeConnectionHandles from "../NodeConnectionHandles.vue";
import TopologyCard from "./TopologyCard.vue";
import TopologyRealtimePoints from "../TopologyRealtimePoints.vue";

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

const { getNodes, getEdges } = useVueFlow();

const productLabel = computed(
  () => props.data.label || props.data.productName || "Device",
);
const nodeLabel = computed(() => productLabel.value);

const { editorCtx, draft, boundLabel, availableInstances, updateField } =
  useTopologyNodeEditor(props);

const viewMode = computed(() => editorCtx?.isViewMode.value ?? false);
const realtimeProductName = computed(
  () =>
    editorCtx?.instances?.value.find(
      (instance) => instance.instance_id === props.data.instanceId,
    )?.product_name ||
    props.data.productName ||
    "",
);

const nodeStatus = computed(() => {
  if (viewMode.value) return null;
  const node = getNodes.value.find((item) => item.id === props.id);
  if (!node) return null;
  return getNodeTopologyStatus(node, getNodes.value, getEdges.value);
});

const connectionBorderColor = computed(() =>
  props.selected ? "var(--topology-accent)" : "var(--topology-accent-border)",
);
</script>

<style lang="scss" scoped>
.topology-node {
  position: relative;
  box-sizing: border-box;
  overflow: visible;
  width: 280px;
  min-width: 280px;
  max-width: 280px;
  height: 296px;
}
</style>

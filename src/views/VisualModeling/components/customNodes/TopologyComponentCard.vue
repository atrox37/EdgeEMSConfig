<template>
  <TopologyCard
    :label="data.label || label"
    :caption="caption || label"
    :binding-label="boundLabel"
    :binding-display-value="boundValue"
    :image-url="imageUrl"
    variant="component"
    type-label="Component"
    :expanded="expanded"
    :view-mode="viewMode"
    :editing="editing"
    :allow-binding="true"
    :allow-delete="false"
    :draft="draft"
    :available-instances="availableInstances"
    @toggle="toggleExpanded"
    @edit="startEditing"
    @cancel="cancelEditing"
    @save="saveEditing"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ModelNodeData } from "@/types/visualModeling";
import { useTopologyNodeEditor } from "../../composables/useTopologyNodeEditor";
import TopologyCard from "./TopologyCard.vue";

const props = withDefaults(
  defineProps<{
    id: string;
    data: ModelNodeData;
    label: string;
    caption?: string;
    imageUrl?: string;
  }>(),
  {
    caption: "",
  },
);
const emit = defineEmits<{
  toggle: [expanded: boolean];
}>();

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
} = useTopologyNodeEditor(props, {
  allowBinding: true,
  instanceProductNames: () => props.data.selectableProductTypes ?? [],
});

const viewMode = computed(() => editorCtx?.isViewMode.value ?? false);

function toggleExpanded() {
  expanded.value = !expanded.value;
  emit("toggle", expanded.value);
}
</script>

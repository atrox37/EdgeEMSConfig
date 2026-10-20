import { computed, inject, reactive, watch } from "vue";
import { MODELING_EDITOR_KEY } from "../modelingEditorContext";
import { getNodeInstanceId } from "@/utils/visualModeling";
import type { ModelNodeData } from "@/types/visualModeling";

export interface TopologyNodeDraft {
  label: string;
  description: string;
  instanceId: number | null;
}

/** 字段直接进入页面级草稿，由画布的 Save/Restore 统一提交或撤销。 */
export function useTopologyNodeEditor(props: {
  id: string;
  data: ModelNodeData;
}) {
  const editorCtx = inject(MODELING_EDITOR_KEY, null);
  const boundInstanceId = computed(() => getNodeInstanceId(props.data));
  const boundInstance = computed(() =>
    (editorCtx?.instances?.value ?? []).find(
      (item) => item.instance_id === boundInstanceId.value,
    ),
  );
  const boundLabel = computed(
    () => boundInstance.value?.instance_name || "Not Bound",
  );
  const draft = reactive<TopologyNodeDraft>({
    label: "",
    description: "",
    instanceId: null,
  });
  const availableInstances = computed(() => {
    const occupied =
      editorCtx?.getBoundInstanceIdsExcluding?.(props.id) ?? new Set<number>();
    return (editorCtx?.instances?.value ?? []).filter(
      (item) =>
        item.product_name === props.data.productName &&
        !occupied.has(item.instance_id),
    );
  });

  watch(
    () => props.data,
    (data) => {
      draft.label = data.label || "";
      draft.description = data.description || "";
      draft.instanceId = getNodeInstanceId(data);
    },
    { deep: true, immediate: true },
  );

  function updateField<K extends keyof TopologyNodeDraft>(
    field: K,
    value: TopologyNodeDraft[K],
  ) {
    if (editorCtx?.isViewMode.value !== false) return;
    if (
      field === "instanceId" &&
      value !== null &&
      !availableInstances.value.some((item) => item.instance_id === value)
    )
      return;
    if (draft[field] === value) return;
    draft[field] = value;
    editorCtx.updateNodeData?.(props.id, { [field]: value });
  }

  return { editorCtx, draft, boundLabel, availableInstances, updateField };
}

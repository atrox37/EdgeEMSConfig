import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, nextTick, reactive, ref } from "vue";
import type { ModelNodeData } from "@/types/visualModeling";
import { MODELING_EDITOR_KEY } from "../../modelingEditorContext";
import { useTopologyNodeEditor } from "../useTopologyNodeEditor";

let wrapper: VueWrapper;
function setup(viewMode = false) {
  const data = reactive<ModelNodeData>({
    label: "Battery",
    description: "Original",
    productName: "Battery",
    instanceId: 1,
  });
  const isViewMode = ref(viewMode);
  const update = vi.fn((_id, patch) => Object.assign(data, patch));
  let editor!: ReturnType<typeof useTopologyNodeEditor>;
  wrapper = mount(
    defineComponent({
      setup() {
        editor = useTopologyNodeEditor({ id: "battery", data });
        return () => null;
      },
    }),
    {
      global: {
        provide: {
          [MODELING_EDITOR_KEY as symbol]: {
            isViewMode,
            updateNodeData: update,
            instances: ref([
              {
                instance_id: 1,
                instance_name: "Battery 1",
                product_name: "Battery",
              },
              {
                instance_id: 2,
                instance_name: "Occupied",
                product_name: "Battery",
              },
              {
                instance_id: 3,
                instance_name: "Battery 3",
                product_name: "Battery",
              },
              { instance_id: 4, instance_name: "Meter", product_name: "Meter" },
            ]),
            getBoundInstanceIdsExcluding: () => new Set([2]),
          },
        },
      },
    },
  );
  return { data, isViewMode, update, editor };
}
afterEach(() => wrapper?.unmount());

describe("topology direct editing", () => {
  it("does not dirty the canvas when mounted or when switching modes", async () => {
    const { update, isViewMode } = setup(true);
    isViewMode.value = false;
    await nextTick();
    isViewMode.value = true;
    await nextTick();
    expect(update).not.toHaveBeenCalled();
  });
  it("updates individual fields immediately without trimming spaces during typing", async () => {
    const { data, update, editor } = setup();
    editor.updateField("label", "Battery ");
    await nextTick();
    editor.updateField("description", "New description");
    expect(data.label).toBe("Battery ");
    expect(data.description).toBe("New description");
    expect(update).toHaveBeenCalledWith("battery", { label: "Battery " });
    expect(update).toHaveBeenCalledWith("battery", {
      description: "New description",
    });
    expect(data.instanceId).toBe(1);
  });
  it("keeps current bindings available, rejects occupied/wrong-product instances and allows clearing", () => {
    const { editor, update, data } = setup();
    expect(
      editor.availableInstances.value.map((instance) => instance.instance_id),
    ).toEqual([1, 3]);
    editor.updateField("instanceId", 2);
    editor.updateField("instanceId", 4);
    expect(update).not.toHaveBeenCalled();
    editor.updateField("instanceId", 3);
    expect(data.instanceId).toBe(3);
    editor.updateField("instanceId", null);
    expect(data.instanceId).toBeNull();
  });
  it("refreshes fields from restored topology and blocks changes in view mode", async () => {
    const { data, editor, update, isViewMode } = setup();
    editor.updateField("label", "Edited");
    data.label = "Restored";
    await nextTick();
    expect(editor.draft.label).toBe("Restored");
    isViewMode.value = true;
    update.mockClear();
    editor.updateField("label", "Must not change");
    expect(update).not.toHaveBeenCalled();
    expect(data.label).toBe("Restored");
  });
});

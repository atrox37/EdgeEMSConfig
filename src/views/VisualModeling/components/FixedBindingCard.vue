<template>
  <div
    class="fixed-binding-card"
    :class="[
      `fixed-binding-card--${kind}`,
      readonly
        ? 'fixed-binding-card--readonly'
        : 'fixed-binding-card--editable',
    ]"
  >
    <header class="fixed-binding-card__header">
      <div class="fixed-binding-card__icon">
        <img
          class="fixed-binding-card__icon-image"
          :src="iconImage"
          alt=""
          aria-hidden="true"
        />
      </div>
      <div class="fixed-binding-card__content">
        <div class="fixed-binding-card__title" :title="label">{{ label }}</div>
        <div class="fixed-binding-card__binding">
          <img
            v-if="readonly"
            class="fixed-binding-card__binding-icon"
            :src="topologyLinkIcon"
            alt=""
            aria-hidden="true"
          />
          <span
            v-if="readonly"
            class="fixed-binding-card__value"
            :title="modelValue?.instanceName || 'Not Bound'"
            >{{ modelValue?.instanceName || "Not Bound" }}</span
          >
          <template v-else>
            <span class="fixed-binding-card__binding-label">Bound to</span>
            <span
              class="fixed-binding-card__selected-value"
              :title="modelValue?.instanceName || 'Not Bound'"
              >{{ modelValue?.instanceName || "Not Bound" }}</span
            >
          </template>
          <el-dropdown
            v-if="!readonly"
            trigger="click"
            placement="bottom-end"
            :show-arrow="false"
            popper-class="fixed-binding-card-popper"
            @command="onCommand"
          >
            <button
              type="button"
              class="fixed-binding-card__dropdown-trigger"
              :aria-label="`Bind ${label}`"
            >
              <ArrowDown class="fixed-binding-card__arrow" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  command="__not-bound__"
                  :class="{ 'is-current': !modelValue }"
                >
                  Not Bound
                </el-dropdown-item>
                <el-dropdown-item
                  v-for="item in selectableInstances"
                  :key="item.instance_id"
                  :command="String(item.instance_id)"
                  :class="{
                    'is-current': item.instance_id === modelValue?.instanceId,
                  }"
                  :title="item.instance_name"
                >
                  {{ item.instance_name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>
    <div v-if="readonly" class="fixed-binding-card__body nowheel">
      <TopologyRealtimePoints
        :product-name="modelValue?.productName || label"
        :instance-id="modelValue?.instanceId"
        :max-visible="3"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ArrowDown } from "@element-plus/icons-vue";
import TopologyRealtimePoints from "./TopologyRealtimePoints.vue";
import topologyLinkIcon from "@/assets/icons/topology-link.svg";
import type { DeviceInstanceBasic } from "@/types/deviceConfiguration";
import type { ModelInstanceBinding } from "@/types/visualModeling";

const props = defineProps<{
  kind: "station" | "environment";
  label: string;
  iconImage: string;
  instances: DeviceInstanceBasic[];
  modelValue?: ModelInstanceBinding | null;
  readonly?: boolean;
}>();

const selectableInstances = computed(() => props.instances);

const emit = defineEmits<{
  "update:modelValue": [value: ModelInstanceBinding | null];
}>();

function onCommand(rawValue: string | number) {
  const value = String(rawValue);
  if (value === "__not-bound__") {
    emit("update:modelValue", null);
    return;
  }
  const item = props.instances.find(
    (instance) => String(instance.instance_id) === value,
  );
  if (!item) return;
  emit("update:modelValue", {
    instanceId: item.instance_id,
    instanceName: item.instance_name,
    productName: item.product_name,
  });
}
</script>

<style lang="scss" scoped>
.fixed-binding-card {
  width: 254px;
  flex: 0 0 254px;
  align-self: flex-start;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid $topology-border-card;
  border-radius: 10px;
  background: $white-alpha-100;
  box-shadow: 0px 6px 12px 0px rgba(0, 0, 0, 0.05);
}

.fixed-binding-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  min-width: 0;
}

.fixed-binding-card--readonly .fixed-binding-card__content {
  gap: 0;
}

.fixed-binding-card--readonly .fixed-binding-card__title {
  line-height: 20px;
}

.fixed-binding-card__body {
  margin-top: 8px;
  padding-top: 4px;
  border-top: 1px solid $topology-border;
}

.fixed-binding-card__body :deep(.topology-realtime) {
  margin: 0;
  padding: 0;
  border: 0;
}

.fixed-binding-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 6px;
  background: $topology-icon-bg;
  color: $topology-accent-strong;
}

.fixed-binding-card__icon-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.fixed-binding-card__content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.fixed-binding-card__title {
  color: $text-color-primary;
  font-size: 14px;
  font-weight: 700;
  line-height: normal;
}

.fixed-binding-card__binding {
  display: flex;
  align-items: center;
  gap: 4px;
  color: $topology-text-muted;
  font-size: 12px;
  font-weight: 450;
  line-height: 1;
  white-space: nowrap;
}

.fixed-binding-card__binding-icon {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
}

.fixed-binding-card__value {
  max-width: 150px;
  overflow: hidden;
  color: $topology-text-muted;
  text-overflow: ellipsis;
}

.fixed-binding-card__binding-label {
  color: $topology-text-muted;
}

.fixed-binding-card__selected-value {
  max-width: 150px;
  overflow: hidden;
  color: $topology-accent;
  font-weight: 700;
  text-overflow: ellipsis;
}

.fixed-binding-card__dropdown-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;

  background: transparent;
  color: $topology-accent;
  cursor: pointer;
}

.fixed-binding-card__arrow {
  width: 14px;
  height: 14px;
  color: $topology-accent;
  pointer-events: none;
}

.fixed-binding-card--readonly .fixed-binding-card__binding {
  gap: 5px;
  color: $topology-text-muted;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
}

.fixed-binding-card--readonly .fixed-binding-card__value {
  color: inherit;
}

/* Edit mode follows the Figma control: "Bound to" + selected instance. */

:global(.fixed-binding-card-popper) {
  min-width: 136px;
  padding: 4px;
  border: 1px solid $topology-border-control;
  border-radius: 6px;
  box-shadow: 0 5px 14px rgba(15, 31, 61, 0.16);
}

:global(.fixed-binding-card-popper .el-dropdown-menu__item) {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  color: $topology-text;
  line-height: 32px;
}

:global(.fixed-binding-card-popper .el-dropdown-menu__item:hover),
:global(.fixed-binding-card-popper .el-dropdown-menu__item.is-current) {
  background: $topology-chip-bg;
  color: $topology-accent-strong;
}

@media (max-width: 700px) {
  .fixed-binding-card {
    padding: 8px 10px;
  }

  .fixed-binding-card__icon {
    width: 34px;
    height: 34px;
  }

  .fixed-binding-card__title {
    font-size: 14px;
  }
}
</style>

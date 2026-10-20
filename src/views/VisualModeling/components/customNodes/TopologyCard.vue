<template>
  <article
    class="topology-card"
    :class="{ 'topology-card--selected': selected }"
  >
    <header class="topology-card__header">
      <div class="topology-card__header-copy">
        <div class="topology-card__title" :title="label">{{ label }}</div>
        <div class="topology-card__binding">
          <img :src="topologyLinkIcon" alt="" aria-hidden="true" />
          <span :title="bindingLabel">{{ bindingLabel }}</span>
        </div>
      </div>
      <TopologyNodeStatusBadge v-if="status" :status="status" />
      <button
        v-if="!viewMode"
        type="button"
        class="topology-card__delete nodrag nopan"
        aria-label="Delete node"
        @click.stop="$emit('delete')"
      >
        <img :src="deleteIcon" alt="" aria-hidden="true" />
      </button>
    </header>

    <div class="topology-card__preview">
      <div class="topology-card__type-badge">Product</div>
      <img v-if="imageUrl" :src="imageUrl" :alt="label" />
    </div>

    <div
      class="topology-card__body nodrag nopan nowheel"
      :class="{ 'topology-card__body--view': viewMode }"
    >
      <template v-if="viewMode">
        <el-tooltip
          :content="descriptionText"
          :disabled="!descriptionOverflow"
          placement="top"
          :show-after="300"
          :trigger="['hover', 'focus']"
          popper-class="topology-card-description-tooltip"
        >
          <p
            ref="descriptionValueRef"
            class="topology-card__description"
            :tabindex="descriptionOverflow ? 0 : -1"
          >
            <span class="topology-card__description-prefix">Description:</span>
            <span
              class="topology-card__description-value"
              :class="{ 'is-empty': !descriptionText }"
              >{{ descriptionDisplay }}</span
            >
          </p>
        </el-tooltip>
        <div class="topology-card__scroll">
          <slot />
        </div>
      </template>
      <el-form
        v-else
        :model="draft"
        label-position="left"
        label-width="88px"
        class="topology-card__form"
        @submit.prevent
      >
        <el-form-item label="Display Name:">
          <el-input
            :model-value="draft.label"
            aria-label="Display Name"
            @update:model-value="$emit('update:label', $event)"
          />
        </el-form-item>
        <el-form-item label="Description:">
          <el-input
            :model-value="draft.description"
            type="textarea"
            :rows="2"
            resize="none"
            aria-label="Description"
            @update:model-value="$emit('update:description', $event)"
          />
        </el-form-item>
        <el-form-item label="Bind Instance:">
          <el-select
            :model-value="draft.instanceId"
            clearable
            placeholder="Not Bound"
            aria-label="Bind Instance"
            @update:model-value="
              $emit(
                'update:instanceId',
                typeof $event === 'number' ? $event : null,
              )
            "
          >
            <el-option
              v-for="item in availableInstances"
              :key="item.instance_id"
              :label="item.instance_name"
              :value="item.instance_id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import deleteIcon from "@/assets/icons/button-delete.svg";
import topologyLinkIcon from "@/assets/icons/topology-link.svg";
import type { DeviceInstanceBasic } from "@/types/deviceConfiguration";
import type { TopologyNodeStatus } from "@/utils/topologyNodeStatus";
import type { TopologyNodeDraft } from "../../composables/useTopologyNodeEditor";
import TopologyNodeStatusBadge from "./TopologyNodeStatusBadge.vue";

const DESCRIPTION_EMPTY = "—";

const props = defineProps<{
  label: string;
  bindingLabel: string;
  imageUrl?: string;
  viewMode: boolean;
  selected?: boolean;
  draft: TopologyNodeDraft;
  availableInstances: DeviceInstanceBasic[];
  status?: TopologyNodeStatus | null;
}>();

const descriptionValueRef = ref<HTMLElement | null>(null);
const descriptionOverflow = ref(false);
const descriptionText = computed(() => props.draft.description.trim());
const descriptionDisplay = computed(
  () => descriptionText.value || DESCRIPTION_EMPTY,
);

let descriptionObserver: ResizeObserver | undefined;

function syncDescriptionOverflow() {
  const element = descriptionValueRef.value;
  descriptionOverflow.value = Boolean(
    descriptionText.value &&
      element &&
      element.scrollWidth > element.clientWidth + 1,
  );
}

function bindDescriptionObserver() {
  descriptionObserver?.disconnect();
  descriptionObserver = undefined;
  const element = descriptionValueRef.value;
  if (!element || typeof ResizeObserver === "undefined") return;
  descriptionObserver = new ResizeObserver(() => syncDescriptionOverflow());
  descriptionObserver.observe(element);
}

watch(
  () => [props.viewMode, descriptionDisplay.value] as const,
  async ([viewMode]) => {
    if (!viewMode) {
      descriptionOverflow.value = false;
      descriptionObserver?.disconnect();
      descriptionObserver = undefined;
      return;
    }
    await nextTick();
    bindDescriptionObserver();
    syncDescriptionOverflow();
  },
  { immediate: true },
);

onBeforeUnmount(() => descriptionObserver?.disconnect());

defineEmits<{
  delete: [];
  "update:label": [value: string];
  "update:description": [value: string];
  "update:instanceId": [value: number | null];
}>();
</script>

<style lang="scss" scoped>
.topology-card {
  display: grid;
  grid-template-rows: 48px 112px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  border: 2px solid $topology-accent-border;
  border-radius: 8px;
  background: $white-alpha-100;
}
.topology-card--selected {
  border-color: $topology-accent;
}
.topology-card__header {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 7px 12px;
  border-bottom: 1px solid $topology-border-muted;
  background: $topology-header-bg;
}
.topology-card__header-copy {
  min-width: 0;
  flex: 1;
}
.topology-card__title {
  overflow: hidden;
  color: $text-color-primary;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.topology-card__binding {
  display: flex;
  align-items: center;
  gap: 5px;
  color: $topology-text-muted;
  font-size: 12px;
  line-height: 1.2;
  img {
    width: 15px;
    height: 15px;
    flex: 0 0 15px;
  }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.topology-card__delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: $topology-danger;
  cursor: pointer;
  img { width: 14px; height: 14px; }
}
.topology-card__delete:hover {
  background: $topology-danger-soft;
}
.topology-card__preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin: 8px 12px;
  overflow: hidden;
  border: 1px solid $topology-border-muted;
  border-radius: 6px;
  background: $white-alpha-100 radial-gradient($topology-grid-dot 1px, transparent 1px);
  background-size: 10px 10px;
  img {
    width: 96px;
    height: 96px;
    padding: 6px;
    box-sizing: border-box;
    object-fit: contain;
  }
}
.topology-card__type-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 3px 5px;
  border-radius: 4px;
  background: $topology-accent-soft;
  color: $topology-accent;
  font-size: 12px;
}
.topology-card__body {
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 8px 12px;
  border-top: 1px solid $topology-border;
  overscroll-behavior: contain;
}
.topology-card__body--view {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topology-card__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.topology-card__body :deep(.topology-realtime) {
  margin: 0;
  padding: 0;
  border: 0;
}
.topology-card__body--view :deep(.el-tooltip__trigger) {
  display: block;
  flex: 0 0 auto;
  min-width: 0;
}
.topology-card__description {
  display: block;
  box-sizing: border-box;
  margin: 0 0 8px;
  padding: 4px 6px;
  overflow: hidden;
  border-radius: 4px;
  background: $topology-header-bg;
  color: $topology-text-muted;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  text-overflow: ellipsis;
  outline: none;
}
.topology-card__description-prefix {
  display: inline-block;
  margin-right: 4px;
  padding: 0 4px;
  border-radius: 3px;
  background: $topology-accent-soft;
  color: $topology-accent;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
}
.topology-card__description-value.is-empty {
  color: $topology-text-faint;
}
:global(.topology-card-description-tooltip) {
  max-width: 280px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.topology-card__form {
  --vt-control-height: 28px;
}
.topology-card__form :deep(.el-form-item) {
  margin-bottom: 8px !important;
}
.topology-card__form :deep(.el-form-item:last-child) {
  margin-bottom: 0 !important;
}
.topology-card__form :deep(.el-form-item__label) {
  font-size: 12px !important;
  height: 28px;
  line-height: 28px;
  margin: 0 !important;
}
.topology-card__form :deep(.el-form-item__content),
.topology-card__form :deep(.el-select) {
  min-width: 0 !important;
  width: 100%;
}
.topology-card__form :deep(.el-form-item__content) {
  line-height: 28px;
}
.topology-card__form :deep(.el-input),
.topology-card__form :deep(.el-textarea) {
  min-height: 0;
}
.topology-card__form :deep(.el-input__wrapper),
.topology-card__form :deep(.el-select__wrapper) {
  min-height: 28px;
  height: 28px;
  padding: 0 8px;
  box-sizing: border-box;
}
.topology-card__form :deep(.el-input__inner) {
  height: 26px;
  line-height: 26px;
  font-size: 12px;
}
.topology-card__form :deep(.el-select__selected-item) {
  font-size: 12px;
}
.topology-card__form :deep(.el-textarea__inner) {
  padding: 4px 8px;
  font-size: 12px;
  line-height: 16px;
}
</style>

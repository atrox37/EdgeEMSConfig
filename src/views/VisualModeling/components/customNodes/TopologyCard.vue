<template>
  <article class="topology-card" :class="[
    `topology-card--${variant}`,
    { 'topology-card--selected': selected },
  ]">
    <header class="topology-card__header">
      <button type="button" class="topology-card__collapse-button nodrag" aria-label="Toggle details"
        @click.stop="$emit('toggle')">
        <AppIcon :name="expanded ? 'i-tabler-chevron-down' : 'i-tabler-chevron-right'" />
      </button>
      <div class="topology-card__header-copy">
        <div class="topology-card__title" :title="label">{{ label }}</div>
        <div v-if="showBinding" class="topology-card__binding">
          <img class="topology-card__binding-icon" :src="topologyLinkIcon" alt="" aria-hidden="true" />
          <span
            class="topology-card__binding-name"
            :title="bindingDisplayValue || bindingLabel"
          >{{ bindingLabel }}</span>
        </div>
      </div>
    </header>

    <div class="topology-card__preview">
      <div class="topology-card__type-badge">{{ typeLabel }}</div>
      <img v-if="imageUrl" :src="imageUrl" :alt="label" />
      <div class="topology-card__caption" :title="caption || label">{{ caption || label }}</div>
    </div>

    <el-form v-if="expanded" :model="draft" label-position="left" label-width="88"
      class="topology-card__details nodrag"
      :class="{ 'topology-card__details--editing': editing && !viewMode }">
      <el-form-item label="Display Name">
        <el-input v-model="draft.label" :readonly="viewMode || !editing" />
      </el-form-item>
      <el-form-item label="Description">
        <el-input v-model="draft.description" type="textarea" :rows="3" resize="none"
          :readonly="viewMode || !editing" />
      </el-form-item>
      <el-form-item v-if="allowBinding" label="Bind Instance">
        <el-input
          v-if="viewMode || !editing"
          :model-value="bindingDisplayValue"
          :title="bindingDisplayValue"
          readonly
        />
        <el-select v-else v-model="draft.instanceId" clearable placeholder="">
          <el-option v-for="item in availableInstances" :key="item.instance_id" :label="item.instance_name"
            :value="item.instance_id" />
        </el-select>
      </el-form-item>
      <slot name="details" />
    </el-form>

    <slot />

    <footer v-if="expanded && !viewMode" class="topology-card__footer nodrag">
      <template v-if="!editing">
        <button v-if="allowDelete" type="button" class="topology-card__footer-button topology-card__footer-button--danger"
          @click.stop="$emit('delete')">
          <AppIcon name="i-tabler-trash" /> Delete
        </button>
        <button type="button" class="topology-card__footer-button" @click.stop="$emit('edit')">
          <AppIcon name="i-tabler-pencil" /> Edit
        </button>
      </template>
      <template v-else>
        <button type="button" class="topology-card__footer-button topology-card__footer-button--cancel" @click.stop="$emit('cancel')">
          <AppIcon name="i-tabler-x" /> Cancel
        </button>
        <button type="button" class="topology-card__footer-button topology-card__footer-button--save"
          @click.stop="$emit('save')">
          <AppIcon name="i-tabler-check" /> Save
        </button>
      </template>
    </footer>
  </article>
</template>

<script setup lang="ts">
import AppIcon from "@/components/AppIcon.vue";
import topologyLinkIcon from "@/assets/icons/topology-link.svg";
import type { DeviceInstanceBasic } from "@/types/deviceConfiguration";
import type { TopologyNodeDraft } from "../../composables/useTopologyNodeEditor";

withDefaults(
  defineProps<{
    label: string;
    caption?: string;
    bindingLabel: string;
    bindingDisplayValue?: string;
    showBinding?: boolean;
    imageUrl?: string;
    variant?: "standalone" | "component" | "composite" | "container";
    typeLabel?: string;
    expanded: boolean;
    viewMode: boolean;
    selected?: boolean;
    editing: boolean;
    allowBinding: boolean;
    allowDelete?: boolean;
    draft: TopologyNodeDraft;
    availableInstances: DeviceInstanceBasic[];
  }>(),
  {
    caption: "",
    showBinding: true,
    variant: "standalone",
    typeLabel: "Standalone",
    selected: false,
    allowDelete: true,
  },
);

defineEmits<{
  toggle: [];
  delete: [];
  edit: [];
  cancel: [];
  save: [];
}>();
</script>

<style lang="scss" scoped>
.topology-card {
  position: relative;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  border: 2px solid #b3cefa;
  border-radius: 8px;
  background: #ffffff;
}

.topology-card--composite {
  border-color: #fff0e6;
}

.topology-card--container {
  border-color: #e9edf2;
}

.topology-card--selected {
  border-color: #035def;
}

.topology-card--selected.topology-card--composite {
  border-color: #ff6900;
}

.topology-card--selected.topology-card--container {
  border-color: #003c71;
}

.topology-card__header {
  display: flex;
  align-items: center;
  min-height: 46px;
  box-sizing: border-box;
  padding: 7px 12px;
  border-bottom: 1px solid #eeeeee;
  background: #f7f7fd;
}

.topology-card--composite>.topology-card__header {
  background: #fff6f1;
}

.topology-card--container>.topology-card__header {
  background: #f0f3f6;
}

.topology-card__collapse-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  margin-right: 10px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #000000;
  cursor: pointer;
}

.topology-card__header-copy {
  min-width: 0;
  flex: 1;
}

.topology-card__title {
  overflow: hidden;
  color: #000000;
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
  color: #666666;
  font-size: 12px;
  line-height: 1.2;
}

.topology-card__binding-icon {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
}

.topology-card__binding-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-card__preview {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 192px;
  // max-height: 192px;
  margin: 12px;
  overflow: hidden;
  border: 1px solid #eeeeee;
  border-radius: 6px;
  background: #ffffff;
  background-image: radial-gradient(#e8ebf0 1px, transparent 1px);
  background-size: 10px 10px;
}

.topology-card__preview img {
  flex: 1;
  width: 150px;
  padding: 8px;
  box-sizing: border-box;
  object-fit: contain;
}

.topology-card__type-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(3, 93, 239, 0.1);
  color: #035def;
  font-size: 12px;
}

.topology-card--composite>.topology-card__preview>.topology-card__type-badge {
  background: #fff0e9;
  color: #f05a00;
}

.topology-card--container>.topology-card__preview>.topology-card__type-badge {
  background: #e7f0fb;
  color: #1d5fbf;
}

.topology-card__caption {
  // position: absolute;
  // right: 0;
  // bottom: 0;
  // left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  border-top: 1px solid #eeeeee;
  background: #f8f9fb;
  color: #000000;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-card--composite>.topology-card__preview>.topology-card__caption {
  background: #fff7f2;
  font-size: 18px;
}

.topology-card--container>.topology-card__preview>.topology-card__caption {
  background: #e9eef4;
  font-size: 18px;
}

.topology-card__details {
  padding: 0 12px 12px;
  background: #ffffff;
}

.topology-card__details :deep(.el-form-item) {
  margin-bottom: 12px !important;
}

.topology-card__details :deep(.el-form-item__label) {
  font-size: 12px !important;
  margin-right: 0 !important;
}

.topology-card__details :deep(.el-form-item:last-of-type) {
  margin-bottom: 0;
}

.topology-card__details :deep(.el-form-item__content),
.topology-card__details :deep(.el-select) {
  min-width: 0 !important;
  width: 100%;
}

.topology-card__details--editing :deep(.el-input__wrapper),
.topology-card__details--editing :deep(.el-textarea__inner),
.topology-card__details--editing :deep(.el-select__wrapper) {
  border: 1px solid #035def !important;
  // box-shadow: 0 0 0 1px #035def inset !important;
}

.topology-card__details--editing :deep(.el-input__wrapper:hover),
.topology-card__details--editing :deep(.el-input__wrapper.is-focus),
.topology-card__details--editing :deep(.el-select__wrapper:hover),
.topology-card__details--editing :deep(.el-select__wrapper.is-focused),
.topology-card__details--editing :deep(.el-textarea__inner:hover),
.topology-card__details--editing :deep(.el-textarea__inner:focus) {
  border-color: 1px solid #035def !important;
  // box-shadow: 0 0 0 1px #035def inset !important;
}

.topology-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid #EEEEEE;
  background: #F7F7FD;
}

.topology-card--composite>.topology-card__footer {
  background: #fff7f2;
}

.topology-card--container>.topology-card__footer {
  background: #e9eef4;
}

.topology-card__footer-button {
  height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: #333333;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  &:hover{
    background: #EAEAF4;
  }
  &:active{
    background: #DFDEEC;
  }
}

.topology-card__footer-button--danger {
  color: #F53F3F;
}

.topology-card__footer-button--save {
  background: #035DEF;
  color: #ffffff;
  &:hover{
    background: #0051D5;
  }
  &:active{
    background: #0048BC;
  }
}
.topology-card__footer-button--cancel{
  color: #666666;
}
</style>

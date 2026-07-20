<template>
  <div
    class="voltage-class left-panel-shell"
    :class="{ 'left-panel-shell--collapsed': collapsed }"
  >
    <aside v-show="!collapsed" class="left-panel">
      <div class="left-panel__title">Device Node Library</div>

      <div class="left-panel__categories">
        <el-collapse v-model="activeGroups" class="left-panel__collapse">
          <el-collapse-item
            v-for="group in panelGroups"
            :key="group.key"
            :name="group.key"
            :title="group.title"
            class="left-panel__collapse-item"
          >
            <div v-if="productsLoading" class="left-panel__loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>Loading products...</span>
            </div>

            <div
              v-else-if="group.key !== 'devices'"
              class="left-panel__node-list"
            >
              <div
                v-for="tpl in group.templates"
                :key="tpl.id"
                class="left-panel__node-item"
                :class="group.key === 'station' ? 'left-panel__node-item--station' : 'left-panel__node-item--container'"
                draggable="true"
                @dragstart="onDragStart($event, tpl)"
              >
                <div
                  class="left-panel__node-icon"
                  :class="group.key === 'station' ? 'left-panel__node-icon--station' : 'left-panel__node-icon--container'"
                >
                  <AppIcon
                    :name="group.key === 'station' ? 'i-tabler-building-factory-2' : 'i-tabler-layout-grid'"
                  />
                </div>
                <div class="left-panel__node-info">
                  <div class="left-panel__node-name">{{ tpl.label }}</div>
                  <div class="left-panel__node-desc">{{ tpl.description }}</div>
                </div>
              </div>
            </div>

            <div v-else>
              <div class="left-panel__device-filter">
                <span class="left-panel__device-filter-label">Parent Container:</span>
                <el-select
                  v-model="deviceParentFilter"
                  clearable
                  placeholder="All"
                  size="small"
                  :teleported="true"
                  :fit-input-width="true"
                  popper-class="visual-modeling-popper"
                  class="left-panel__device-filter-select"
                >
                  <el-option
                    v-for="opt in DEVICE_PARENT_FILTER_OPTIONS"
                    :key="opt.value || 'all'"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </div>
              <div class="left-panel__image-grid">
              <div
                v-for="tpl in group.templates"
                :key="tpl.id"
                class="left-panel__image-item"
                draggable="true"
                :title="tpl.label"
                @dragstart="onDragStart($event, tpl)"
              >
                <img
                  v-if="tpl.imageUrl"
                  :src="tpl.imageUrl"
                  :alt="tpl.label"
                  class="left-panel__image-thumb"
                  draggable="false"
                />
                <div v-else class="left-panel__image-fallback">{{ tpl.label?.slice(0, 2) }}</div>
                <div class="left-panel__image-label">{{ tpl.label }}</div>
                <div v-if="tpl.parentName && tpl.parentName !== 'Station'" class="left-panel__image-parent">
                  Container: {{ tpl.parentName }}
                </div>
              </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <div class="left-panel__tips">
        <AppIcon name="i-tabler-info-circle" class="left-panel__tips-icon" />
        <span>Drag nodes to the canvas.<br/>Device images keep a transparent background on canvas.</span>
      </div>
    </aside>

    <button
      type="button"
      class="left-panel-shell__toggle"
      :title="collapsed ? 'Expand panel' : 'Collapse panel'"
      @click="toggleCollapsed"
    >
      <AppIcon :name="collapsed ? 'i-tabler-chevron-right' : 'i-tabler-chevron-left'" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  groupLeftPanelProducts,
  productToTemplate,
  mergeWithDefaultProducts,
  DEVICE_PARENT_FILTER_OPTIONS,
} from '@/constants/deviceProducts'
import useModelDnd from '../useModelDnd'
import { useVisualModelingStore } from '@/stores/visualModeling'

const collapsed = defineModel<boolean>('collapsed', { default: false })

const { onDragStart } = useModelDnd()
const store = useVisualModelingStore()

const activeGroups = ref(['station', 'containers', 'devices'])
const deviceParentFilter = ref('')
const productsLoading = computed(() => store.productsLoading)

const panelGroups = computed(() => {
  const list = mergeWithDefaultProducts(store.products)
  return groupLeftPanelProducts(list).map((group) => {
    const templates = group.products.map(productToTemplate)
    const filtered =
      group.key === 'devices' && deviceParentFilter.value
        ? templates.filter((tpl) => tpl.parentName === deviceParentFilter.value)
        : templates
    return {
      ...group,
      templates: filtered,
    }
  })
})

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

onMounted(() => {
  store.loadProducts()
})
</script>

<style lang="scss" scoped>
.left-panel-shell {
  position: relative;
  display: flex;
  height: 100%;
  flex-shrink: 0;
  transition: width 0.25s ease;
}

.left-panel-shell--collapsed {
  width: 0;
}

.left-panel-shell:not(.left-panel-shell--collapsed) {
  width: 300px;
}

.left-panel-shell__toggle {
  position: absolute;
  left: auto;
  right: -22px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 22px;
  height: 44px;
  padding: 0;
  border: 1px solid rgba($secondary-color, 0.35);
  border-radius: 0 8px 8px 0;
  background: #ffffff;
  box-shadow: 2px 0 8px rgba(15, 31, 61, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $secondary-color;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  :deep(svg) {
    width: 14px;
    height: 14px;
    color: currentColor !important;
  }
}

.left-panel-shell__toggle:hover {
  background: $primary-color-alpha-20;
  border-color: $primary-color-alpha-35;
  color: $primary-color;
}

.left-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: rgba(19, 44, 84, 0.08);
    border-right: 1px solid rgba(15, 31, 61, 0.08);
    overflow: hidden;
    border-top-left-radius: 10px;
    border-bottom-left-radius: 10px;
    box-shadow: 6px 0 12px rgba(15, 31, 61, 0.08);

    .left-panel__title {
      padding: 12px 12px 6px;
      font-size: 14px;
      font-weight: 600;
      color: #0f1f3d;
      flex-shrink: 0;
    }

    .left-panel__categories {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .left-panel__collapse {
      border: none;

      :deep(.el-collapse) {
        border: none;
      }

      :deep(.el-collapse-item__wrap) {
        border-bottom: none;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
      }

      :deep(.el-collapse-item__header) {
        padding: 0 4px;
        font-size: 14px;
        font-weight: 600;
        color: $secondary-color;
        background: rgba($secondary-color, 0.12);
        border: 1px solid rgba($secondary-color, 0.35);
        border-radius: 6px;
        height: auto;
        min-height: 36px;
        line-height: 1.4;
      }

      :deep(.el-collapse-item__header.is-active) {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        color: $primary-color;
        background: $primary-color-alpha-20;
        border-color: $primary-color-alpha-35;
      }

      :deep(.el-collapse-item__header.is-active .el-collapse-item__arrow) {
        color: $primary-color;
      }

      :deep(.el-collapse-item__arrow) {
        font-size: 12px;
        color: $secondary-color;
      }

      :deep(.el-collapse-item__title) {
        padding-left: 4px;
      }

      :deep(.el-collapse-item__content) {
        padding: 8px 8px 10px;
        border-radius: 0 0 8px 8px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(255, 138, 0, 0.12);
        border-top: none;
      }
    }

    .left-panel__collapse-item {
      margin-bottom: 8px;

      .left-panel__collapse-item:last-child {
        margin-bottom: 0;
      }
    }

    .left-panel__loading {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 4px;
      font-size: 12px;
      color: #909399;
    }

    .left-panel__node-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .left-panel__device-filter {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .left-panel__device-filter-label {
      font-size: 12px;
      font-weight: 600;
      color: #3d5a80;
      flex-shrink: 0;
    }

    .left-panel__device-filter-select {
      flex: 1;
      min-width: 0;
    }

    .left-panel__node-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: grab;
      transition: all 0.15s;
      border: 1px solid transparent;
    }

    .left-panel__node-item:hover {
      transform: translateX(2px);
    }

    .left-panel__node-item:active {
      cursor: grabbing;
    }

    .left-panel__node-item--station {
      background: rgba(26, 35, 126, 0.08);
      border-color: rgba(26, 35, 126, 0.2);
    }

    .left-panel__node-item--station:hover {
      border-color: #3949ab;
    }

    .left-panel__node-item--container {
      background: rgba(156, 39, 176, 0.07);
      border-color: rgba(156, 39, 176, 0.2);
    }

    .left-panel__node-item--container:hover {
      border-color: #9c27b0;
    }

    .left-panel__node-icon {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      :deep(svg) { width: 16px; height: 16px; }

      .left-panel__node-icon--station {
        background: #e8eaf6;
        :deep(svg) { color: #3949ab !important; }
      }
      .left-panel__node-icon--container {
        background: #f3e5f5;
        :deep(svg) { color: #9c27b0 !important; }
      }
    }

    .left-panel__node-info { flex: 1; min-width: 0; }

    .left-panel__node-name {
      font-size: 12px;
      font-weight: 600;
      color: #1a2438;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .left-panel__node-desc {
      font-size: 10px;
      color: #909399;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .left-panel__image-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .left-panel__image-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 6px 4px;
      border-radius: 8px;
      cursor: grab;
      border: 1px solid transparent;
      background: transparent;
      transition: border-color 0.15s, background 0.15s;
    }

    .left-panel__image-item:hover {
      border-color: rgba(74, 144, 217, 0.35);
      background: rgba(74, 144, 217, 0.05);
    }

    .left-panel__image-item:active {
      cursor: grabbing;
    }

    .left-panel__image-thumb {
      width: 96px;
      height: 96px;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
    }

    .left-panel__image-fallback {
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: #4a90d9;
      background: rgba(74, 144, 217, 0.08);
      border-radius: 8px;
    }

    .left-panel__image-label {
      font-size: 11px;
      font-weight: 600;
      color: #3d5a80;
      text-align: center;
      line-height: 1.3;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .left-panel__image-parent {
      font-size: 10px;
      color: #909399;
      text-align: center;
      line-height: 1.2;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .left-panel__tips {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 10px 12px;
      background: rgba(74, 144, 217, 0.06);
      border-top: 1px solid rgba(15, 31, 61, 0.06);
      font-size: 11px;
      color: #7f8c9a;
      line-height: 1.6;
      flex-shrink: 0;

      .left-panel__tips-icon {
        flex-shrink: 0;
        margin-top: 1px;
        :deep(svg) { width: 14px; height: 14px; color: #7f8c9a !important; }
      }
    }
}
</style>

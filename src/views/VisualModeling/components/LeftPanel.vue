<template>
  <div class="voltage-class left-panel">
    <div class="left-panel__title">节点库</div>

    <el-collapse v-model="activeGroups" class="left-panel__collapse">

      <!-- 基础节点 -->
      <el-collapse-item name="basic" title="基础节点">
        <div class="left-panel__node-list">
          <div
            v-for="tpl in basicTemplates"
            :key="tpl.id"
            class="left-panel__node-item"
            :class="`left-panel__node-item--${tpl.type}`"
            draggable="true"
            @dragstart="onDragStart($event, tpl)"
          >
            <div class="left-panel__node-icon" :class="`left-panel__node-icon--${tpl.type}`">
              <AppIcon :name="tpl.icon" />
            </div>
            <div class="left-panel__node-info">
              <div class="left-panel__node-name">{{ tpl.label }}</div>
              <div class="left-panel__node-desc">{{ tpl.description }}</div>
            </div>
          </div>
        </div>
      </el-collapse-item>

      <!-- 设备实例 -->
      <el-collapse-item name="instances" title="设备实例">
        <div class="left-panel__search">
          <el-input
            v-model="searchText"
            placeholder="搜索实例/产品..."
            size="small"
            clearable
          />
        </div>

        <div v-if="loading" class="left-panel__loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <div v-else-if="filteredInstances.length === 0" class="left-panel__empty">
          {{ searchText ? '无匹配实例' : '暂无设备实例' }}
        </div>
        <div v-else class="left-panel__node-list">
          <div
            v-for="inst in filteredInstances"
            :key="inst.instance_id"
            class="left-panel__node-item left-panel__node-item--product"
            draggable="true"
            @dragstart="onDragStart($event, instanceToTemplate(inst))"
          >
            <div class="left-panel__node-icon left-panel__node-icon--instance">
              <AppIcon name="i-tabler-cpu" />
            </div>
            <div class="left-panel__node-info">
              <div class="left-panel__node-name">{{ inst.instance_name }}</div>
              <div class="left-panel__node-desc">{{ inst.product_name }}</div>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <div class="left-panel__tips">
      <AppIcon name="i-tabler-info-circle" class="left-panel__tips-icon" />
      <span>拖拽实例到画布，<br/>双击节点进行配置</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import AppIcon from '@/components/AppIcon.vue'
import type { ModelNodeTemplate } from '@/types/visualModeling'
import type { DeviceInstanceBasic } from '@/types/deviceConfiguration'
import useModelDnd from '../useModelDnd'
import { useVisualModelingStore } from '@/stores/visualModeling'

const { onDragStart } = useModelDnd()
const store = useVisualModelingStore()

const activeGroups = ref(['basic', 'instances'])
const searchText = ref('')

const loading = computed(() => store.instancesLoading)
const instances = computed(() => store.instances)

const basicTemplates: ModelNodeTemplate[] = [
  {
    id: 'station',
    type: 'station',
    label: 'Station',
    description: '站点根节点',
    color: 'blue',
    icon: 'i-tabler-building-factory-2',
  },
  {
    id: 'product',
    type: 'product',
    label: '设备节点',
    description: '拖入后双击绑定实例',
    color: 'blue',
    icon: 'i-tabler-cpu',
  },
  {
    id: 'group',
    type: 'group',
    label: '组合节点',
    description: '可容纳子节点',
    color: 'purple',
    icon: 'i-tabler-layout-grid',
  },
]

const filteredInstances = computed(() => {
  const kw = searchText.value.trim().toLowerCase()
  if (!kw) return instances.value
  return instances.value.filter(
    (i) =>
      i.instance_name.toLowerCase().includes(kw) ||
      i.product_name.toLowerCase().includes(kw),
  )
})

function instanceToTemplate(inst: DeviceInstanceBasic): ModelNodeTemplate {
  return {
    id: `inst-${inst.instance_id}`,
    type: 'product',
    label: inst.instance_name,
    description: inst.product_name,
    productName: inst.product_name,
    instanceId: inst.instance_id,
    instanceName: inst.instance_name,
    color: 'blue',
    icon: 'i-tabler-cpu',
  }
}

onMounted(() => store.loadInstances())
</script>

<style lang="scss" scoped>
.voltage-class {
  .left-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 220px;
    background: rgba(19, 44, 84, 0.06);
    border-right: 1px solid rgba(15, 31, 61, 0.08);
    overflow: hidden;
    flex-shrink: 0;

    &__title {
      padding: 12px 14px 8px;
      font-size: 13px;
      font-weight: 700;
      color: #0f1f3d;
      border-bottom: 1px solid rgba(15, 31, 61, 0.08);
      flex-shrink: 0;
    }

    &__collapse {
      flex: 1;
      overflow-y: auto;
      padding: 8px;

      :deep(.el-collapse) { border: none; }
      :deep(.el-collapse-item__header) {
        font-size: 12px;
        font-weight: 600;
        color: #3d5a80;
        background: rgba(61, 90, 128, 0.1);
        border: 1px solid rgba(61, 90, 128, 0.2);
        border-radius: 6px;
        padding: 0 8px;
        height: 30px;
        line-height: 30px;
      }
      :deep(.el-collapse-item__header.is-active) {
        border-radius: 6px 6px 0 0;
        background: rgba(61, 90, 128, 0.18);
      }
      :deep(.el-collapse-item__content) {
        padding: 6px 4px 8px;
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(61, 90, 128, 0.15);
        border-top: none;
        border-radius: 0 0 6px 6px;
      }
      :deep(.el-collapse-item__wrap) { border-bottom: none; }
    }

    &__search { padding: 0 0 6px; }

    &__loading,
    &__empty {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 4px;
      font-size: 12px;
      color: #909399;
    }

    &__node-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    &__node-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: grab;
      transition: all 0.15s;
      border: 1px solid transparent;

      &:hover { transform: translateX(2px); }
      &:active { cursor: grabbing; }

      &--station {
        background: rgba(26, 35, 126, 0.08);
        border-color: rgba(26, 35, 126, 0.18);
        &:hover { border-color: #3949ab; }
      }
      &--product {
        background: rgba(74, 144, 217, 0.07);
        border-color: rgba(74, 144, 217, 0.18);
        &:hover { border-color: #4a90d9; }
      }
      &--group {
        background: rgba(142, 36, 170, 0.07);
        border-color: rgba(142, 36, 170, 0.18);
        &:hover { border-color: #8e24aa; }
      }
    }

    &__node-icon {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      :deep(svg) { width: 16px; height: 16px; color: #ffffff !important; }

      &--station  { background: #283593; }
      &--product  { background: #4a90d9; }
      &--group    { background: #8e24aa; }
      &--instance { background: #00897b; }
    }

    &__node-info { flex: 1; min-width: 0; }

    &__node-name {
      font-size: 12px;
      font-weight: 600;
      color: #1a2438;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__node-desc {
      font-size: 10px;
      color: #909399;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__tips {
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

      &-icon {
        flex-shrink: 0;
        margin-top: 1px;
        :deep(svg) { width: 14px; height: 14px; color: #7f8c9a !important; }
      }
    }
  }
}
</style>

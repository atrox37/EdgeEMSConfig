<template>
  <div class="voltage-class visual-modeling-list">
    <!-- 页面头部 -->
    <div class="visual-modeling-list__header">
      <div class="visual-modeling-list__header-left">
        <AppIcon name="i-tabler-topology-star" class="visual-modeling-list__header-icon" />
        <div>
          <div class="visual-modeling-list__header-title">可视化建模</div>
          <div class="visual-modeling-list__header-sub">创建并管理物模型组合方案</div>
        </div>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <AppIcon name="i-tabler-plus" style="margin-right:6px" />
        新建方案
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <div class="visual-modeling-list__toolbar">
      <el-input
        v-model="searchText"
        placeholder="搜索方案名称..."
        style="width:260px"
        clearable
        prefix-icon="Search"
      />
      <span class="visual-modeling-list__count">共 {{ filteredModels.length }} 个方案</span>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredModels.length === 0" class="visual-modeling-list__empty">
      <AppIcon name="i-tabler-topology-star-3" class="visual-modeling-list__empty-icon" />
      <div class="visual-modeling-list__empty-title">
        {{ searchText ? '未找到匹配方案' : '暂无建模方案' }}
      </div>
      <div class="visual-modeling-list__empty-sub">
        {{ searchText ? '请尝试其他关键词' : '点击"新建方案"开始可视化建模' }}
      </div>
      <el-button v-if="!searchText" type="primary" @click="openCreateDialog">
        新建方案
      </el-button>
    </div>

    <!-- 方案卡片列表 -->
    <div v-else class="visual-modeling-list__grid">
      <div
        v-for="model in filteredModels"
        :key="model.id"
        class="visual-modeling-list__card"
        @click="openEditor(model.id)"
      >
        <!-- 预览区域 -->
        <div class="visual-modeling-list__card-preview">
          <!-- 有缩略图时展示真实图 -->
          <img
            v-if="model.thumbnail"
            :src="model.thumbnail"
            class="visual-modeling-list__card-thumb"
            alt="预览"
          />
          <!-- 无缩略图时展示占位 -->
          <template v-else>
            <AppIcon name="i-tabler-topology-star" class="visual-modeling-list__card-preview-icon" />
          </template>
          <!-- 统计角标（始终显示） -->
          <div class="visual-modeling-list__card-stats">
            <span>
              <AppIcon name="i-tabler-circle-dot" />
              {{ getNodeCount(model) }} 节点
            </span>
            <span>
              <AppIcon name="i-tabler-line" />
              {{ getEdgeCount(model) }} 连线
            </span>
          </div>
        </div>

        <!-- 卡片内容 -->
        <div class="visual-modeling-list__card-body">
          <div class="visual-modeling-list__card-name">{{ model.name }}</div>
          <div class="visual-modeling-list__card-desc">
            {{ model.description || '暂无描述' }}
          </div>
          <div class="visual-modeling-list__card-meta">
            <span>更新于 {{ formatDate(model.updatedAt) }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="visual-modeling-list__card-actions" @click.stop>
          <el-tooltip content="编辑方案">
            <el-button size="small" circle text @click="openEditDialog(model)">
              <AppIcon name="i-tabler-pencil" />
            </el-button>
          </el-tooltip>
          <el-tooltip content="导出 JSON">
            <el-button size="small" circle text @click="exportModel(model.id)">
              <AppIcon name="i-tabler-download" />
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除">
            <el-button size="small" circle text type="danger" @click="confirmDelete(model)">
              <AppIcon name="i-tabler-trash" />
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- 新建/编辑对话框 -->
    <ModelCreateDialog
      v-model:visible="createDialogVisible"
      :edit-model="editingModel"
      @confirm="handleCreateOrEdit"
    />

    <!-- 隐藏 import input（用于从列表页也支持导入） -->
    <input
      ref="importInputRef"
      type="file"
      accept="application/json"
      style="display:none"
      @change="handleImportChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import ModelCreateDialog from './components/dialogs/ModelCreateDialog.vue'
import { useVisualModelingStore } from '@/stores/visualModeling'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'
import type { VisualModel } from '@/types/visualModeling'

const router = useRouter()
const store = useVisualModelingStore()

const searchText = ref('')
const createDialogVisible = ref(false)
const editingModel = ref<VisualModel | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)

const filteredModels = computed(() => {
  const kw = searchText.value.trim().toLowerCase()
  if (!kw) return store.models
  return store.models.filter(
    (m) => m.name.toLowerCase().includes(kw) || m.description.toLowerCase().includes(kw),
  )
})

function openCreateDialog() {
  editingModel.value = null
  createDialogVisible.value = true
}

function openEditDialog(model: VisualModel) {
  editingModel.value = model
  createDialogVisible.value = true
}

function handleCreateOrEdit(name: string, description: string) {
  if (editingModel.value) {
    store.updateModelInfo(editingModel.value.id, name, description)
    ElMessage.success('方案信息已更新')
  } else {
    const newModel = store.createModel(name, description)
    ElMessage.success('方案创建成功')
    // 创建后直接进入编辑器
    router.push({ name: 'visualModelingEditor', params: { id: newModel.id } })
  }
}

function openEditor(id: string) {
  router.push({ name: 'visualModelingEditor', params: { id } })
}

async function exportModel(id: string) {
  const json = store.exportModel(id)
  if (!json) return
  const model = store.getModelById(id)!
  const bytes = new TextEncoder().encode(json)
  await saveBytesWithPreferredPath(bytes, `${model.name}.json`, 'application/json')
  ElMessage.success('导出成功')
}

async function confirmDelete(model: VisualModel) {
  try {
    await ElMessageBox.confirm(
      `确认删除方案"${model.name}"？此操作不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    store.deleteModel(model.id)
    ElMessage.success('已删除')
  } catch {}
}

function handleImportChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = store.importModel(reader.result as string)
    if (result) {
      ElMessage.success(`导入成功：${result.name}`)
    } else {
      ElMessage.error('导入失败：格式不正确')
    }
    ;(e.target as HTMLInputElement).value = ''
  }
  reader.readAsText(file)
}

function getNodeCount(model: VisualModel) {
  return model.flowJson?.nodes?.length ?? 0
}

function getEdgeCount(model: VisualModel) {
  return model.flowJson?.edges?.length ?? 0
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}`
  } catch {
    return iso
  }
}
</script>

<style lang="scss" scoped>
.voltage-class {
  .visual-modeling-list {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px 20px;
    overflow-y: auto;
    box-sizing: border-box;

    // ---- 头部 ----
    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      &-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      &-icon {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #1565c0 0%, #4a90d9 100%);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        :deep(svg) { width: 24px; height: 24px; color: #ffffff !important; }
      }

      &-title {
        font-size: 18px;
        font-weight: 700;
        color: #0f1f3d;
      }

      &-sub {
        font-size: 12px;
        color: #7f8c9a;
        margin-top: 2px;
      }
    }

    // ---- 工具栏 ----
    &__toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    &__count {
      font-size: 12px;
      color: #909399;
    }

    // ---- 空状态 ----
    &__empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #b0b8c4;
      padding: 60px 0;

      &-icon {
        :deep(svg) { width: 64px; height: 64px; color: #d0d8e4 !important; }
      }

      &-title {
        font-size: 16px;
        font-weight: 600;
        color: #7f8c9a;
      }

      &-sub {
        font-size: 13px;
        color: #b0b8c4;
      }
    }

    // ---- 卡片网格 ----
    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    &__card {
      background: #ffffff;
      border: 1px solid rgba(15, 31, 61, 0.08);
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      position: relative;

      &:hover {
        border-color: #4a90d9;
        box-shadow: 0 4px 16px rgba(74, 144, 217, 0.18);
        transform: translateY(-2px);
      }

      &-preview {
        height: 100px;
        background: linear-gradient(135deg, #e3f0ff 0%, #dbeafe 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 6px;
        position: relative;
        overflow: hidden;

        :deep(svg) { width: 36px; height: 36px; color: #4a90d9 !important; opacity: 0.5; }
      }

      &-thumb {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        opacity: 0.92;
        transition: opacity 0.2s;
      }

      &:hover &-thumb { opacity: 1; }

      &-stats {
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: #1a2438;
        font-weight: 600;
        position: absolute;
        bottom: 5px;
        right: 7px;
        background: rgba(255,255,255,0.82);
        backdrop-filter: blur(4px);
        border-radius: 6px;
        padding: 2px 6px;
        z-index: 1;

        span {
          display: flex;
          align-items: center;
          gap: 3px;
          :deep(svg) { width: 11px; height: 11px; color: #4a90d9 !important; opacity: 1; }
        }
      }

      &-body {
        padding: 12px 14px 8px;
        flex: 1;
      }

      &-name {
        font-size: 14px;
        font-weight: 700;
        color: #0f1f3d;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &-desc {
        font-size: 12px;
        color: #7f8c9a;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 36px;
      }

      &-meta {
        font-size: 11px;
        color: #b0b8c4;
        margin-top: 6px;
      }

      &-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 2px;
        padding: 6px 8px;
        border-top: 1px solid rgba(15, 31, 61, 0.06);
        background: rgba(248, 250, 252, 0.8);
      }
    }
  }
}
</style>

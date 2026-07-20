<template>
  <div class="voltage-class visual-modeling-list">
    <div class="visual-modeling-list__header">
      <div class="visual-modeling-list__header-left">
        <AppIcon name="i-tabler-topology-star" class="visual-modeling-list__header-icon" />
        <div>
          <div class="visual-modeling-list__header-title">Visual Modeling</div>
          <div class="visual-modeling-list__header-sub">
            Single-station topology for edge gateway (loaded from API / mock)
          </div>
        </div>
      </div>
      <el-button type="primary" :loading="store.topologyLoading" @click="openEditor(STATION_EDITOR_ID)">
        <AppIcon name="i-tabler-pencil" style="margin-right:6px" />
        Open Editor
      </el-button>
    </div>

    <div class="visual-modeling-list__toolbar">
      <el-tag v-if="store.stationTopology?.gateway_id" type="info" size="small">
        Gateway: {{ store.stationTopology.gateway_id }}
      </el-tag>
      <span class="visual-modeling-list__count">{{ filteredModels.length }} station</span>
    </div>

    <div v-if="store.topologyLoading" class="visual-modeling-list__empty">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Loading station topology...</span>
    </div>

    <div v-else-if="filteredModels.length === 0" class="visual-modeling-list__empty">
      <AppIcon name="i-tabler-topology-star-3" class="visual-modeling-list__empty-icon" />
      <div class="visual-modeling-list__empty-title">No station topology loaded</div>
      <div class="visual-modeling-list__empty-sub">Check API connection or mock data</div>
    </div>

    <div v-else class="visual-modeling-list__grid">
      <div
        v-for="model in filteredModels"
        :key="model.id"
        class="visual-modeling-list__card"
      >
        <div class="visual-modeling-list__card-preview" @click="openEditor(model.id)">
          <AppIcon name="i-tabler-topology-star" class="visual-modeling-list__card-preview-icon" />
          <div class="visual-modeling-list__card-stats">
            <span>
              <AppIcon name="i-tabler-circle-dot" />
              {{ getNodeCount(model) }} nodes
            </span>
            <span>
              <AppIcon name="i-tabler-line" />
              {{ getEdgeCount(model) }} edges
            </span>
          </div>
        </div>

        <div class="visual-modeling-list__card-body" @click="openEditor(model.id)">
          <div class="visual-modeling-list__card-name">{{ model.name }}</div>
          <div class="visual-modeling-list__card-desc">
            {{ model.description || 'No description' }}
          </div>
          <div class="visual-modeling-list__card-meta">
            <span>Updated {{ formatDate(model.updatedAt) }}</span>
          </div>
        </div>

        <div class="visual-modeling-list__card-actions">
          <el-tooltip content="Edit plan" placement="top">
            <el-button v-permission="'engineer'" size="small" @click.stop="openEditDialog(model)">
              <AppIcon name="i-tabler-pencil" />
              <span>Edit</span>
            </el-button>
          </el-tooltip>
          <el-dropdown trigger="click" :teleported="true" popper-class="visual-modeling-popper" @command="(cmd: string) => handleExportCommand(model, cmd)">
            <el-button size="small" @click.stop>
              <AppIcon name="i-tabler-download" />
              <span>Export</span>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="json">Export JSON</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-tooltip content="Delete" placement="top">
            <el-button v-permission="'engineer'" size="small" type="danger" plain @click.stop="confirmDelete(model)">
              <AppIcon name="i-tabler-trash" />
              <span>Delete</span>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <ModelCreateDialog
      v-model:visible="createDialogVisible"
      :edit-model="editingModel"
      @confirm="handleCreateOrEdit"
    />

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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import ModelCreateDialog from './components/dialogs/ModelCreateDialog.vue'
import { useVisualModelingStore, STATION_EDITOR_ID } from '@/stores/visualModeling'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'
import type { VisualModel } from '@/types/visualModeling'

const router = useRouter()
const store = useVisualModelingStore()

const createDialogVisible = ref(false)
const editingModel = ref<VisualModel | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)

const filteredModels = computed(() => store.models)

onMounted(() => {
  store.loadStationTopology()
})

function openCreateDialog() {
  editingModel.value = null
  createDialogVisible.value = true
}

function openEditDialog(model: VisualModel) {
  editingModel.value = model
  createDialogVisible.value = true
}

async function handleCreateOrEdit(name: string, description: string) {
  store.updateModelInfo(STATION_EDITOR_ID, name, description)
  const flow = store.stationTopology?.flow_json
  if (flow) {
    await store.saveFlowJson(STATION_EDITOR_ID, flow)
  }
  ElMessage.success('Station info updated')
}

function openEditor(id: string) {
  router.push({ name: 'visualModelingEditor', params: { id } })
}

async function exportModelJson(id: string) {
  const json = store.exportModel(id)
  if (!json) return
  const model = store.getModelById(id)!
  const bytes = new TextEncoder().encode(json)
  const saveResult = await saveBytesWithPreferredPath(bytes, `${model.name}.json`, 'application/json')
  ElMessage.success(`JSON exported: ${saveResult.displayPath}`)
}

function handleExportCommand(model: VisualModel, cmd: string) {
  if (cmd === 'json') exportModelJson(model.id)
}

async function confirmDelete(model: VisualModel) {
  try {
    await ElMessageBox.confirm(
      `Reset topology for "${model.name}" to default? Bindings will be cleared.`,
      'Reset Topology',
      { type: 'warning', confirmButtonText: 'Reset', cancelButtonText: 'Cancel' },
    )
    await store.resetTopology()
    ElMessage.success('Topology reset')
  } catch {}
}

function handleImportChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = store.importModel(reader.result as string)
    if (result) {
      ElMessage.success(`Imported: ${result.name}`)
    } else {
      ElMessage.error('Import failed: invalid format')
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

    .visual-modeling-list__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      .visual-modeling-list__header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .visual-modeling-list__header-icon {
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

      .visual-modeling-list__header-title {
        font-size: 18px;
        font-weight: 700;
        color: #0f1f3d;
      }

      .visual-modeling-list__header-sub {
        font-size: 12px;
        color: #7f8c9a;
        margin-top: 2px;
      }
    }

    .visual-modeling-list__toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .visual-modeling-list__count {
      font-size: 12px;
      color: #909399;
    }

    .visual-modeling-list__empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #b0b8c4;
      padding: 60px 0;

      .visual-modeling-list__empty-icon {
        :deep(svg) { width: 64px; height: 64px; color: #d0d8e4 !important; }
      }

      .visual-modeling-list__empty-title {
        font-size: 16px;
        font-weight: 600;
        color: #7f8c9a;
      }

      .visual-modeling-list__empty-sub {
        font-size: 13px;
        color: #b0b8c4;
      }
    }

    .visual-modeling-list__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      align-items: start;
    }

    .visual-modeling-list__card {
      background: #ffffff;
      border: 1px solid rgba(15, 31, 61, 0.08);
      border-radius: 10px;
      overflow: visible;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      position: relative;
      min-height: 220px;

      .visual-modeling-list__card:hover {
        border-color: #4a90d9;
        box-shadow: 0 4px 16px rgba(74, 144, 217, 0.18);
        transform: translateY(-2px);
      }

      .visual-modeling-list__card-preview {
        height: 120px;
        background: linear-gradient(135deg, #e3f0ff 0%, #dbeafe 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 6px;
        position: relative;
        overflow: hidden;
        border-radius: 10px 10px 0 0;
        cursor: pointer;

        :deep(svg) { width: 36px; height: 36px; color: #4a90d9 !important; opacity: 0.5; }
      }

      .visual-modeling-list__card-thumb {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        background: #f1f5f9;
        pointer-events: none;
      }

      .visual-modeling-list__card-stats {
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: #1a2438;
        font-weight: 600;
        position: absolute;
        bottom: 5px;
        right: 7px;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(4px);
        border-radius: 6px;
        padding: 2px 6px;
        z-index: 2;

        span {
          display: flex;
          align-items: center;
          gap: 3px;
          :deep(svg) { width: 11px; height: 11px; color: #4a90d9 !important; opacity: 1; }
        }
      }

      .visual-modeling-list__card-body {
        padding: 12px 14px 8px;
        flex: 1;
        cursor: pointer;
      }

      .visual-modeling-list__card-name {
        font-size: 14px;
        font-weight: 700;
        color: #0f1f3d;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .visual-modeling-list__card-desc {
        font-size: 12px;
        color: #7f8c9a;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 36px;
      }

      .visual-modeling-list__card-meta {
        font-size: 11px;
        color: #b0b8c4;
        margin-top: 6px;
      }

      .visual-modeling-list__card-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 10px 10px;
        border-top: 1px solid rgba(15, 31, 61, 0.08);
        background: #f8fafc;
        border-radius: 0 0 10px 10px;
        flex-shrink: 0;
        position: relative;
        z-index: 3;

        :deep(.el-button) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #3d5a80 !important;
          border-color: rgba(61, 90, 128, 0.25);
          background: #ffffff !important;

          span {
            color: inherit !important;
          }

          svg, :deep(svg) {
            width: 14px !important;
            height: 14px !important;
            color: #4a90d9 !important;
          }
        }

        :deep(.el-button--danger) {
          color: #c62828 !important;
          border-color: rgba(198, 40, 40, 0.35);
          background: #fff5f5 !important;

          svg, :deep(svg) {
            color: #c62828 !important;
          }
        }
      }
    }
  }
}
</style>

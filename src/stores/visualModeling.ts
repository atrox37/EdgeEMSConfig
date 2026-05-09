import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { getAllInstances } from '@/api/devicesManagement'
import type { VisualModel, ModelFlowData } from '@/types/visualModeling'
import type { DeviceInstanceBasic } from '@/types/deviceConfiguration'

const STORAGE_KEY = 'visual_models'

function loadFromStorage(): VisualModel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(models: VisualModel[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models))
  } catch {
    console.error('[VisualModeling] 保存方案失败')
  }
}

export const useVisualModelingStore = defineStore('visualModeling', () => {
  const models = ref<VisualModel[]>(loadFromStorage())
  const currentModelId = ref<string | null>(null)
  const hasUnsavedChanges = ref(false)

  // ---- 设备实例缓存（LeftPanel 与 NodeConfigDialog 共享，避免重复请求） ----
  const instances = ref<DeviceInstanceBasic[]>([])
  const instancesLoaded = ref(false)
  const instancesLoading = ref(false)

  async function loadInstances(force = false) {
    if (instancesLoaded.value && !force) return
    instancesLoading.value = true
    try {
      const res = await getAllInstances() as any
      const raw: any[] = res?.data?.list ?? res?.data ?? []
      // 兼容后端两种字段命名：{id,name} 或 {instance_id,instance_name,product_name}
      instances.value = Array.isArray(raw)
        ? raw.map((item) => ({
            instance_id:   item.instance_id   ?? item.id   ?? 0,
            instance_name: item.instance_name ?? item.name ?? '',
            product_name:  item.product_name  ?? item.product ?? '',
          }))
        : []
      instancesLoaded.value = true
    } catch {
      console.error('[VisualModeling] 加载实例列表失败')
    } finally {
      instancesLoading.value = false
    }
  }

  /** 当前编辑中的方案 */
  const currentModel = computed(() =>
    models.value.find((m) => m.id === currentModelId.value) ?? null,
  )

  /** 获取所有方案 */
  function getModels(): VisualModel[] {
    return models.value
  }

  /** 根据 id 获取方案 */
  function getModelById(id: string): VisualModel | null {
    return models.value.find((m) => m.id === id) ?? null
  }

  /** 创建新方案 */
  function createModel(name: string, description = ''): VisualModel {
    const now = new Date().toISOString()
    const model: VisualModel = {
      id: uuidv4(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      flowJson: { nodes: [], edges: [] },
    }
    models.value.unshift(model)
    saveToStorage(models.value)
    return model
  }

  /** 更新方案基本信息 */
  function updateModelInfo(id: string, name: string, description: string) {
    const model = models.value.find((m) => m.id === id)
    if (!model) return
    model.name = name
    model.description = description
    model.updatedAt = new Date().toISOString()
    saveToStorage(models.value)
  }

  /** 保存流程图数据（可选传入缩略图 base64） */
  function saveFlowJson(id: string, flowJson: ModelFlowData, thumbnail?: string) {
    const model = models.value.find((m) => m.id === id)
    if (!model) return
    model.flowJson = flowJson
    model.updatedAt = new Date().toISOString()
    if (thumbnail) model.thumbnail = thumbnail
    hasUnsavedChanges.value = false
    saveToStorage(models.value)
  }

  /** 删除方案 */
  function deleteModel(id: string) {
    const idx = models.value.findIndex((m) => m.id === id)
    if (idx > -1) {
      models.value.splice(idx, 1)
      saveToStorage(models.value)
    }
  }

  /** 设置当前编辑方案 */
  function setCurrentModel(id: string | null) {
    currentModelId.value = id
    hasUnsavedChanges.value = false
  }

  /** 标记有未保存更改 */
  function markUnsaved() {
    hasUnsavedChanges.value = true
  }

  /** 导出方案为 JSON 字符串 */
  function exportModel(id: string): string | null {
    const model = models.value.find((m) => m.id === id)
    if (!model) return null
    return JSON.stringify(model, null, 2)
  }

  /** 从 JSON 导入方案 */
  function importModel(json: string): VisualModel | null {
    try {
      const model = JSON.parse(json) as VisualModel
      if (!model.id || !model.name) return null
      // 赋予新 id 避免冲突
      model.id = uuidv4()
      model.createdAt = new Date().toISOString()
      model.updatedAt = new Date().toISOString()
      models.value.unshift(model)
      saveToStorage(models.value)
      return model
    } catch {
      return null
    }
  }

  return {
    models,
    currentModelId,
    currentModel,
    hasUnsavedChanges,
    instances,
    instancesLoaded,
    instancesLoading,
    loadInstances,
    getModels,
    getModelById,
    createModel,
    updateModelInfo,
    saveFlowJson,
    deleteModel,
    setCurrentModel,
    markUnsaved,
    exportModel,
    importModel,
  }
})

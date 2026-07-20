import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Request } from '@/utils/request'
import { getAllInstances, getProducts } from '@/api/devicesManagement'
import { getStationTopology, saveStationTopology, getChannelBindings } from '@/api/stationTopology'
import { STATION_TOPOLOGY_ID } from '@/mock/stationTopologyMock'
import type { VisualModel, ModelFlowData } from '@/types/visualModeling'
import type { NodeChannelBinding, StationTopology } from '@/types/stationTopology'
import type { DeviceInstanceBasic, ProductListItem } from '@/types/deviceConfiguration'
import { DEFAULT_DEVICE_PRODUCTS } from '@/constants/deviceProducts'
import { setModelFlowProductRules } from '@/utils/modelFlowRules'
import { createDefaultModelFlow, isEmptyFlow } from '@/utils/defaultModelFlow'

/** 编辑器路由使用的固定站点 ID */
export const STATION_EDITOR_ID = STATION_TOPOLOGY_ID

const LEGACY_STORAGE_KEY = 'visual_models'

function topologyToVisualModel(t: StationTopology): VisualModel {
  return {
    id: STATION_EDITOR_ID,
    name: t.station_name,
    description: t.description ?? '',
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    flowJson: t.flow_json,
  }
}

function tryMigrateLegacyTopology(): StationTopology | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const list = JSON.parse(raw) as VisualModel[]
    const first = Array.isArray(list) ? list[0] : null
    if (!first?.flowJson) return null
    const now = new Date().toISOString()
    return {
      station_id: STATION_EDITOR_ID,
      station_name: first.name || 'Edge Station',
      description: first.description ?? '',
      flow_json: first.flowJson,
      created_at: first.createdAt ?? now,
      updated_at: first.updatedAt ?? now,
    }
  } catch {
    return null
  }
}

export const useVisualModelingStore = defineStore('visualModeling', () => {
  const stationTopology = ref<StationTopology | null>(null)
  const topologyLoading = ref(false)
  const topologyLoaded = ref(false)

  const currentModelId = ref<string | null>(null)
  const hasUnsavedChanges = ref(false)

  const instances = ref<DeviceInstanceBasic[]>([])
  const instancesLoaded = ref(false)
  const instancesLoading = ref(false)

  const products = ref<ProductListItem[]>([...DEFAULT_DEVICE_PRODUCTS])
  const productsLoaded = ref(false)
  const productsLoading = ref(false)

  const channelBindings = ref<NodeChannelBinding[]>([])
  const channelBindingsLoaded = ref(false)
  const channelBindingsLoading = ref(false)

  /** 兼容列表页：单站点包装为数组 */
  const models = computed<VisualModel[]>(() =>
    stationTopology.value ? [topologyToVisualModel(stationTopology.value)] : [],
  )

  const currentModel = computed(() =>
    currentModelId.value === STATION_EDITOR_ID && stationTopology.value
      ? topologyToVisualModel(stationTopology.value)
      : null,
  )

  async function loadStationTopology(force = false) {
    if (topologyLoaded.value && !force) return
    topologyLoading.value = true
    try {
      const res = await getStationTopology({ skipGlobalLoading: true })
      let data = res?.data
      if (!data?.flow_json || isEmptyFlow(data.flow_json)) {
        const migrated = tryMigrateLegacyTopology()
        if (migrated) {
          data = migrated
          await saveStationTopology({
            flow_json: migrated.flow_json,
            station_name: migrated.station_name,
            description: migrated.description,
          }).catch(() => {})
        }
      }
      if (data) {
        stationTopology.value = data
      }
      topologyLoaded.value = true
    } catch (e) {
      console.error('[VisualModeling] 加载站点拓扑失败', e)
      const migrated = tryMigrateLegacyTopology()
      if (migrated) {
        stationTopology.value = migrated
      } else {
        const now = new Date().toISOString()
        stationTopology.value = {
          station_id: STATION_EDITOR_ID,
          station_name: 'Edge Station',
          description: '',
          flow_json: createDefaultModelFlow(),
          created_at: now,
          updated_at: now,
        }
      }
      topologyLoaded.value = true
    } finally {
      topologyLoading.value = false
    }
  }

  async function loadProducts(force = false) {
    if (productsLoaded.value && !force) return
    productsLoading.value = true
    try {
      const res = await getProducts()
      const list = res?.data?.products
      if (Array.isArray(list) && list.length) {
        products.value = list
      } else if (!products.value.length) {
        products.value = [...DEFAULT_DEVICE_PRODUCTS]
      }
      productsLoaded.value = true
    } catch {
      products.value = [...DEFAULT_DEVICE_PRODUCTS]
      productsLoaded.value = true
    } finally {
      setModelFlowProductRules(products.value)
      productsLoading.value = false
    }
  }

  function mapInstanceRow(item: Record<string, unknown>): DeviceInstanceBasic {
    const instanceId = Number(item.instance_id ?? item.id ?? 0)
    const productRaw = item.product_name ?? item.product ?? item.productName
    let productName = ''
    if (typeof productRaw === 'string') {
      productName = productRaw
    } else if (productRaw && typeof productRaw === 'object') {
      const p = productRaw as Record<string, unknown>
      productName = String(p.product_name ?? p.name ?? '')
    }
    return {
      instance_id: instanceId,
      instance_name: String(item.instance_name ?? item.name ?? ''),
      product_name: productName,
    }
  }

  async function loadInstances(force = false) {
    if (instancesLoaded.value && !force) return
    instancesLoading.value = true
    const requestConfig = { skipGlobalLoading: true, showErrorMessage: false }
    try {
      let raw: Record<string, unknown>[] = []

      // 分页列表含 product_name，优先用于绑定筛选
      const pageRes = await Request.get(
        '/modApi/api/instances',
        { page: 1, page_size: 1000 },
        requestConfig,
      )
      if (Array.isArray(pageRes?.data?.list) && pageRes.data.list.length) {
        raw = pageRes.data.list as Record<string, unknown>[]
      }

      if (!raw.length) {
        const listRes = await getAllInstances(requestConfig)
        if (Array.isArray(listRes?.data?.list)) {
          raw = listRes.data.list as Record<string, unknown>[]
        }
      }

      instances.value = raw
        .map(mapInstanceRow)
        .filter((item) => item.instance_id > 0)
      instancesLoaded.value = true
    } catch {
      instances.value = []
      instancesLoaded.value = true
    } finally {
      instancesLoading.value = false
    }
  }

  async function loadChannelBindings(force = false) {
    if (channelBindingsLoaded.value && !force) return
    channelBindingsLoading.value = true
    try {
      const res = await getChannelBindings({
        skipGlobalLoading: true,
        showErrorMessage: false,
      })
      channelBindings.value = Array.isArray(res?.data?.bindings) ? res.data.bindings : []
      channelBindingsLoaded.value = true
    } catch {
      channelBindings.value = []
      channelBindingsLoaded.value = true
    } finally {
      channelBindingsLoading.value = false
    }
  }

  function getLiveChannelIds(nodeId: string, instanceId: number): number[] {
    const binding = channelBindings.value.find((item) => item.nodeId === nodeId)
    const inst = binding?.instances.find((item) => item.instanceId === instanceId)
    return inst?.channelIds ? [...inst.channelIds] : []
  }

  function getModels(): VisualModel[] {
    return models.value
  }

  function getModelById(id: string): VisualModel | null {
    if (id !== STATION_EDITOR_ID || !stationTopology.value) return null
    return topologyToVisualModel(stationTopology.value)
  }

  function updateModelInfo(_id: string, name: string, description: string) {
    if (!stationTopology.value) return
    stationTopology.value.station_name = name
    stationTopology.value.description = description
    stationTopology.value.updated_at = new Date().toISOString()
  }

  async function saveFlowJson(
    _id: string,
    flowJson: ModelFlowData,
  ): Promise<boolean> {
    if (!stationTopology.value) return false
    try {
      const res = await saveStationTopology({
        station_name: stationTopology.value.station_name,
        description: stationTopology.value.description,
        flow_json: flowJson,
      })
      if (res?.data) {
        stationTopology.value = res.data
      } else {
        stationTopology.value.flow_json = flowJson
        stationTopology.value.updated_at = new Date().toISOString()
      }
      hasUnsavedChanges.value = false
      return true
    } catch (e) {
      console.error('[VisualModeling] 保存站点拓扑失败', e)
      return false
    }
  }

  function setCurrentModel(id: string | null) {
    currentModelId.value = id
    hasUnsavedChanges.value = false
  }

  function markUnsaved() {
    hasUnsavedChanges.value = true
  }

  function exportModel(id: string): string | null {
    const model = getModelById(id)
    if (!model) return null
    return JSON.stringify(
      {
        ...model,
        station_id: stationTopology.value?.station_id,
        gateway_id: stationTopology.value?.gateway_id,
      },
      null,
      2,
    )
  }

  function importModel(json: string): VisualModel | null {
    try {
      const parsed = JSON.parse(json) as VisualModel & { flow_json?: ModelFlowData; flowJson?: ModelFlowData }
      const flow = parsed.flowJson ?? parsed.flow_json
      if (!flow) return null
      const now = new Date().toISOString()
      stationTopology.value = {
        station_id: STATION_EDITOR_ID,
        station_name: parsed.name ?? 'Imported Station',
        description: parsed.description ?? '',
        flow_json: flow,
        created_at: now,
        updated_at: now,
      }
      return topologyToVisualModel(stationTopology.value)
    } catch {
      return null
    }
  }

  /** @deprecated 单站模式请使用 loadStationTopology */
  function createModel(name: string, description = ''): VisualModel {
    const now = new Date().toISOString()
    stationTopology.value = {
      station_id: STATION_EDITOR_ID,
      station_name: name,
      description,
      flow_json: createDefaultModelFlow(),
      created_at: now,
      updated_at: now,
    }
    return topologyToVisualModel(stationTopology.value)
  }

  function deleteModel(_id: string) {
    const now = new Date().toISOString()
    stationTopology.value = {
      station_id: STATION_EDITOR_ID,
      station_name: stationTopology.value?.station_name ?? 'Edge Station',
      description: '',
      flow_json: createDefaultModelFlow(),
      created_at: stationTopology.value?.created_at ?? now,
      updated_at: now,
    }
  }

  async function resetTopology() {
    deleteModel(STATION_EDITOR_ID)
    if (!stationTopology.value) return false
    return saveFlowJson(STATION_EDITOR_ID, stationTopology.value.flow_json)
  }

  return {
    stationTopology,
    topologyLoading,
    topologyLoaded,
    models,
    currentModelId,
    currentModel,
    hasUnsavedChanges,
    instances,
    instancesLoaded,
    instancesLoading,
    products,
    productsLoaded,
    productsLoading,
    channelBindings,
    channelBindingsLoaded,
    channelBindingsLoading,
    loadStationTopology,
    loadProducts,
    loadInstances,
    loadChannelBindings,
    getLiveChannelIds,
    getModels,
    getModelById,
    createModel,
    updateModelInfo,
    saveFlowJson,
    deleteModel,
    resetTopology,
    setCurrentModel,
    markUnsaved,
    exportModel,
    importModel,
  }
})

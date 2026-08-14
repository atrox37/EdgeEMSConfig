import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAllInstances, getProducts } from '@/api/devicesManagement'
import { getChannelBindings, getStationTopology, saveStationTopology } from '@/api/stationTopology'
import type { DeviceInstanceBasic, DeviceInstanceListItem, ProductListItem } from '@/types/deviceConfiguration'
import type { NodeChannelBinding, StationTopology } from '@/types/stationTopology'
import type { ModelFlowData, VisualModel } from '@/types/visualModeling'
import { setModelFlowProductRules } from '@/utils/modelFlowRules'
import { createDefaultModelFlow } from '@/utils/defaultModelFlow'

export const STATION_TOPOLOGY_ID = 'station'

export const STATION_EDITOR_ID = STATION_TOPOLOGY_ID

function topologyToVisualModel(topology: StationTopology): VisualModel {
  return {
    id: STATION_EDITOR_ID,
    name: topology.station_name,
    description: topology.description ?? '',
    createdAt: topology.created_at ?? '',
    updatedAt: topology.updated_at ?? '',
    flowJson: topology.flow_json,
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
  const products = ref<ProductListItem[]>([])
  const productsLoaded = ref(false)
  const productsLoading = ref(false)
  const channelBindings = ref<NodeChannelBinding[]>([])
  const channelBindingsLoaded = ref(false)
  const channelBindingsLoading = ref(false)

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
      const response = await getStationTopology()
      stationTopology.value = response?.data ?? null
      topologyLoaded.value = true
    } catch (error) {
      console.error('[VisualModeling] 加载站点拓扑失败', error)
      stationTopology.value = null
      topologyLoaded.value = true
    } finally {
      topologyLoading.value = false
    }
  }

  async function loadProducts(force = false) {
    if (productsLoaded.value && !force) return
    productsLoading.value = true
    try {
      const response = await getProducts({ topology_enabled: true })
      products.value = response?.data?.products ?? []
      productsLoaded.value = true
    } catch (error) {
      console.error('[VisualModeling] 加载产品列表失败', error)
      products.value = []
      productsLoaded.value = true
    } finally {
      setModelFlowProductRules(products.value)
      productsLoading.value = false
    }
  }

  function mapInstance(item: DeviceInstanceListItem): DeviceInstanceBasic {
    return {
      instance_id: item.id,
      instance_name: item.name,
      product_name: item.product_name,
    }
  }

  async function loadInstances(force = false) {
    if (instancesLoaded.value && !force) return
    instancesLoading.value = true
    try {
      const response = await getAllInstances()
      const list = Array.isArray(response?.data?.list) ? response.data.list : []
      instances.value = list.map((item) => mapInstance(item))
        .filter((item) => item.instance_id > 0)
      instancesLoaded.value = true
    } catch (error) {
      console.error('[VisualModeling] 加载设备实例失败', error)
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
      const response = await getChannelBindings()
      channelBindings.value = response?.data?.bindings ?? []
      channelBindingsLoaded.value = true
    } catch (error) {
      console.error('[VisualModeling] 加载通道绑定失败', error)
      channelBindings.value = []
      channelBindingsLoaded.value = true
    } finally {
      channelBindingsLoading.value = false
    }
  }

  function getLiveChannelIds(nodeId: string, instanceId: number): number[] {
    const node = channelBindings.value.find((item) => item.nodeId === nodeId)
    const instance = node?.instances.find((item) => item.instanceId === instanceId)
    return instance?.channelIds ? [...instance.channelIds] : []
  }

  function getModels() { return models.value }
  function getModelById(id: string) {
    return id === STATION_EDITOR_ID && stationTopology.value ? topologyToVisualModel(stationTopology.value) : null
  }
  function updateModelInfo(_id: string, name: string, description: string) {
    if (!stationTopology.value) return
    stationTopology.value.station_name = name
    stationTopology.value.description = description
    stationTopology.value.updated_at = new Date().toISOString()
  }

  async function saveFlowJson(_id: string, flowJson: ModelFlowData) {
    if (!stationTopology.value) return false
    try {
      const response = await saveStationTopology({
        station_name: stationTopology.value.station_name,
        description: stationTopology.value.description ?? undefined,
        flow_json: flowJson,
      })
      if (!response?.data) return false
      stationTopology.value = response.data
      hasUnsavedChanges.value = false
      return true
    } catch (error) {
      console.error('[VisualModeling] 保存站点拓扑失败', error)
      return false
    }
  }

  function setCurrentModel(id: string | null) { currentModelId.value = id; hasUnsavedChanges.value = false }
  function markUnsaved() { hasUnsavedChanges.value = true }
  function exportModel(id: string) {
    const model = getModelById(id)
    return model ? JSON.stringify(model, null, 2) : null
  }
  function importModel(json: string): VisualModel | null {
    try {
      const parsed = JSON.parse(json) as VisualModel
      const flow = parsed.flowJson
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
    } catch { return null }
  }
  function createModel(name: string, description = ''): VisualModel {
    const now = new Date().toISOString()
    stationTopology.value = { station_id: STATION_EDITOR_ID, station_name: name, description, flow_json: createDefaultModelFlow(), created_at: now, updated_at: now }
    return topologyToVisualModel(stationTopology.value)
  }
  function deleteModel(_id: string) { stationTopology.value = null }
  async function resetTopology() { deleteModel(STATION_EDITOR_ID); return false }

  return {
    stationTopology, topologyLoading, topologyLoaded, models, currentModelId, currentModel,
    hasUnsavedChanges, instances, instancesLoaded, instancesLoading, products, productsLoaded,
    productsLoading, channelBindings, channelBindingsLoaded, channelBindingsLoading,
    loadStationTopology, loadProducts, loadInstances, loadChannelBindings, getLiveChannelIds,
    getModels, getModelById, createModel, updateModelInfo, saveFlowJson, deleteModel, resetTopology,
    setCurrentModel, markUnsaved, exportModel, importModel,
  }
})

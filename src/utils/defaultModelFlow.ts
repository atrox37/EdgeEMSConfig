import type { ModelFlowData, ModelFlowNode, ModelFlowEdge, ModelInstanceBinding } from '@/types/visualModeling'
import { getProductInstanceImageUrl } from '@/utils/productInstanceImages'

/** 默认拓扑期望绑定的实例（与边端实例表一致） */
export interface DefaultFlowInstanceInput {
  instance_id: number
  instance_name: string
  product_name: string
}

interface DeviceSlot {
  instanceName: string
  productName: string
  nodeId: string
  parentId: string
  label: string
}

const STATION_SLOT = { instanceName: 'station_01', productName: 'Station' }
const LOAD_CONTAINER_SLOT = { instanceName: 'Load_01', productName: 'Load' }

const DEVICE_SLOTS: DeviceSlot[] = [
  { instanceName: 'battery_01', productName: 'Battery', nodeId: 'node-battery', parentId: 'node-ess', label: 'Battery' },
  { instanceName: 'diesel_gen_01', productName: 'Diesel', nodeId: 'node-diesel', parentId: 'node-generator', label: 'Diesel' },
  { instanceName: 'pcs_01', productName: 'PCS', nodeId: 'node-pcs', parentId: 'node-ess', label: 'PCS' },
  { instanceName: 'pv_01', productName: 'PV DCDC', nodeId: 'node-pv-dcdc', parentId: 'node-generator', label: 'PV DCDC' },
]

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** 与 Rule Chain 一致：edge-{timestamp} */
let flowEdgeIdSeq = 0
export function createFlowEdgeId(): string {
  flowEdgeIdSeq += 1
  return `edge-${Date.now() + flowEdgeIdSeq}`
}

/** 旧版语义化 id（edge-station-xxx）迁移为时间戳 id */
export function ensureTimestampEdgeIds(edges: ModelFlowEdge[]): ModelFlowEdge[] {
  return edges.map((edge) => {
    if (/^edge-\d+$/.test(edge.id)) return edge
    return { ...edge, id: createFlowEdgeId() }
  })
}

function toBinding(inst: DefaultFlowInstanceInput, productName?: string): ModelInstanceBinding {
  return {
    instanceId: inst.instance_id,
    instanceName: inst.instance_name,
    productName: productName ?? inst.product_name,
  }
}

function findInstance(
  instances: DefaultFlowInstanceInput[],
  preferredName: string,
  productName: string,
): DefaultFlowInstanceInput | undefined {
  if (!instances.length) return undefined
  const nameKey = normalizeKey(preferredName)
  const productKey = normalizeKey(productName)

  const byName = instances.find((i) => normalizeKey(i.instance_name) === nameKey)
  if (byName && normalizeKey(byName.product_name) === productKey) return byName

  const byProduct = instances.filter((i) => normalizeKey(i.product_name) === productKey)
  if (byProduct.length === 1) return byProduct[0]

  return byName
}

function productNode(
  id: string,
  label: string,
  productName: string,
  position: { x: number; y: number },
  instances: ModelInstanceBinding[],
  parentNode?: string,
  parentName?: string | null,
): ModelFlowNode {
  return {
    id,
    type: 'product',
    position,
    ...(parentNode ? { parentNode, extent: 'parent' as const } : {}),
    data: {
      label,
      productName,
      parentName: parentName ?? undefined,
      imageUrl: getProductInstanceImageUrl(productName),
      instances,
    },
  }
}

function groupNode(
  id: string,
  label: string,
  productName: string,
  position: { x: number; y: number },
  width: number,
  height: number,
  instances: ModelInstanceBinding[] = [],
): ModelFlowNode {
  return {
    id,
    type: 'group',
    position,
    data: {
      label,
      productName,
      parentName: 'Station',
      isContainer: true,
      width,
      height,
      instances,
    },
    style: { width: `${width}px`, height: `${height}px` },
    zIndex: 0,
  }
}

/**
 * 根据实际实例列表生成默认站点拓扑：
 * Station → Generator / ESS / Load 容器；容器内仅放置已存在实例对应的设备节点。
 */
export function createDefaultModelFlow(
  instances: DefaultFlowInstanceInput[] = [],
): ModelFlowData {
  const stationInst = findInstance(instances, STATION_SLOT.instanceName, STATION_SLOT.productName)
  const loadInst = findInstance(instances, LOAD_CONTAINER_SLOT.instanceName, LOAD_CONTAINER_SLOT.productName)

  const nodes: ModelFlowNode[] = [
    {
      id: 'node-station',
      type: 'station',
      position: { x: 420, y: 20 },
      data: {
        label: 'Station',
        productName: 'Station',
        instances: stationInst ? [toBinding(stationInst, 'Station')] : [],
      },
    },
    groupNode('node-generator', 'Generator', 'Generator', { x: 240, y: 140 }, 320, 200),
    groupNode('node-ess', 'ESS', 'ESS', { x: 900, y: 140 }, 260, 180),
    groupNode(
      'node-load',
      'Load',
      'Load',
      { x: 580, y: 140 },
      260,
      200,
      loadInst ? [toBinding(loadInst, 'Load')] : [],
    ),
  ]

  const childIndexByParent = new Map<string, number>()

  // Load 容器内放置 Load 设备节点（与容器绑定同一 Load 实例）
  if (loadInst) {
    nodes.push(
      productNode(
        'node-load-device',
        'Load',
        'LoadDevice',
        { x: 24, y: 56 },
        [toBinding(loadInst, 'LoadDevice')],
        'node-load',
        'Load',
      ),
    )
    childIndexByParent.set('node-load', 1)
  }

  for (const slot of DEVICE_SLOTS) {
    const inst = findInstance(instances, slot.instanceName, slot.productName)
    if (!inst) continue

    const parentName =
      slot.parentId === 'node-generator'
        ? 'Generator'
        : slot.parentId === 'node-ess'
          ? 'ESS'
          : 'Load'

    const childIndex = childIndexByParent.get(slot.parentId) ?? 0
    childIndexByParent.set(slot.parentId, childIndex + 1)

    nodes.push(
      productNode(
        slot.nodeId,
        slot.label,
        slot.productName,
        { x: 24 + childIndex * 94, y: 56 },
        [toBinding(inst, slot.productName)],
        slot.parentId,
        parentName,
      ),
    )
  }

  const hierarchyHandle = { sourceHandle: 'bottom-source', targetHandle: 'top-target' } as const

  const edges: ModelFlowEdge[] = [
    { id: createFlowEdgeId(), source: 'node-station', target: 'node-generator', ...hierarchyHandle },
    { id: createFlowEdgeId(), source: 'node-station', target: 'node-ess', ...hierarchyHandle },
    { id: createFlowEdgeId(), source: 'node-station', target: 'node-load', ...hierarchyHandle },
  ]

  return { nodes, edges }
}

export function isEmptyFlow(flow: ModelFlowData) {
  return !flow.nodes.length && !flow.edges.length
}

/** 历史数据可能只有节点没有边：按默认拓扑补全仍存在的节点之间的连线 */
const HIERARCHY_HANDLES = { sourceHandle: 'bottom-source', targetHandle: 'top-target' } as const

/** 根据 Station / 容器 / parentNode 关系补全层级连线 */
export function synthesizeHierarchyEdges(
  nodes: ModelFlowNode[],
  existingEdges: ModelFlowEdge[] = [],
): ModelFlowEdge[] {
  const nodeIds = new Set(nodes.map((n) => n.id))
  const validExisting = existingEdges.filter(
    (e) =>
      typeof e.source === 'string' &&
      typeof e.target === 'string' &&
      !!e.source &&
      !!e.target &&
      nodeIds.has(e.source) &&
      nodeIds.has(e.target),
  )
  const edgeKeys = new Set(validExisting.map((e) => `${e.source}->${e.target}`))
  const merged: ModelFlowEdge[] = validExisting.map((e) => ({
    ...HIERARCHY_HANDLES,
    ...e,
    sourceHandle: e.sourceHandle ?? HIERARCHY_HANDLES.sourceHandle,
    targetHandle: e.targetHandle ?? HIERARCHY_HANDLES.targetHandle,
  }))

  const station = nodes.find((n) => n.type === 'station' && !n.parentNode)
  if (station) {
    for (const node of nodes) {
      if (node.parentNode || node.id === station.id) continue
      const key = `${station.id}->${node.id}`
      if (edgeKeys.has(key)) continue
      edgeKeys.add(key)
      merged.push({
        id: createFlowEdgeId(),
        source: station.id,
        target: node.id,
        ...HIERARCHY_HANDLES,
      })
    }
  }

  return merged
}

export function stripContainerInternalEdges(flow: ModelFlowData): ModelFlowData {
  if (!flow.nodes?.length || !flow.edges?.length) return flow
  const nodeById = new Map(flow.nodes.map((n) => [n.id, n]))
  const edges = flow.edges.filter((e) => {
    const target = nodeById.get(e.target)
    const source = nodeById.get(e.source)
    if (target?.parentNode && source?.id === target.parentNode) return false
    return true
  })
  return edges.length === flow.edges.length ? flow : { ...flow, edges }
}

export function repairMissingFlowEdges(flow: ModelFlowData): ModelFlowData {
  if (!flow.nodes?.length) return flow
  const migratedEdges = ensureTimestampEdgeIds(flow.edges ?? [])
  const synthesized = synthesizeHierarchyEdges(flow.nodes, migratedEdges)
  if (synthesized.length) {
    return stripContainerInternalEdges({
      ...flow,
      edges: ensureTimestampEdgeIds(synthesized),
    })
  }
  const nodeIds = new Set(flow.nodes.map((n) => n.id))
  const candidates = createDefaultModelFlow().edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  )
  if (!candidates.length) return flow
  return stripContainerInternalEdges({ ...flow, edges: candidates.map((e) => ({ ...e })) })
}

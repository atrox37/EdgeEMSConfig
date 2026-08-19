<template>
  <div
    ref="canvasRef"
    class="modeling-editor__canvas"
    :class="{ 'modeling-editor__canvas--view': isViewMode }"
    @dragover="$emit('dragover', $event)"
    @dragleave="$emit('dragleave', $event)"
    @drop="$emit('drop', $event)"
  >
    <LoadingBg :loading="isCanvasLoading" />
    <div class="modeling-editor__fixed-bindings">
      <FixedBindingCard
        kind="station"
        :label="stationLabel"
        :icon-image="topologyStationIcon"
        :instances="stationInstances"
        :readonly="isViewMode"
        :model-value="fixedStationBinding"
        @update:model-value="$emit('update:fixedStationBinding', $event)"
      />
      <FixedBindingCard
        v-if="showEnvironment"
        kind="environment"
        :label="environmentLabel"
        :icon-image="topologyEnvironmentIcon"
        :instances="environmentInstances"
        :readonly="isViewMode"
        :model-value="fixedEnvironmentBinding"
        @update:model-value="$emit('update:fixedEnvironmentBinding', $event)"
      />
    </div>

    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :connection-mode="ConnectionMode.Loose"
      :connection-radius="48"
      :connect-on-click="false"
      :connection-line-style="{ stroke: '#B3CEFA', strokeWidth: 1 }"
      :min-zoom="0.1"
      :max-zoom="4"
      :snap-to-grid="true"
      :snap-grid="[10, 10]"
      :nodes-draggable="true"
      :nodes-connectable="!isViewMode"
      :nodes-deletable="!isViewMode"
      :edges-deletable="!isViewMode"
      :delete-key-code="null"
      :selection-key-code="null"
      :multi-selection-key-code="null"
      :elements-selectable="!isViewMode"
      :edges-focusable="!isViewMode"
      :elevate-edges-on-select="!isViewMode"
      :elevate-nodes-on-select="!isViewMode"
      :class="['modeling-editor__flow', { 'modeling-editor__flow--view': isViewMode }]"
      @update:nodes="$emit('update:nodes', $event)"
      @update:edges="$emit('update:edges', $event)"
      @connect="$emit('connect', $event)"
      @node-click="$emit('node-click', $event)"
      @edge-click="$emit('edge-click', $event)"
      @pane-click="$emit('pane-click')"
    >
      <Background variant="lines" :gap="10" color="rgba(220, 226, 238, 0.78)" />
      <MiniMap
        v-show="showMiniMap"
        class="modeling-editor__minimap"
        :width="200"
        :height="200"
        :node-color="miniMapNodeColor"
        :node-stroke-color="miniMapNodeStrokeColor"
        :node-stroke-width="1.5"
        :node-border-radius="4"
        mask-color="rgba(255, 105, 0, 0.06)"
        mask-stroke-color="#ff6900"
        :mask-stroke-width="2"
        :pannable="true"
        :zoomable="true"
        aria-label="Topology minimap"
      />
      <div class="modeling-editor__flow-controls" aria-label="Canvas controls">
        <button type="button" class="flow-control-button" aria-label="Fit view" @click="fitView()">
          <img class="flow-control-button__icon" :src="fitViewIcon" alt="" aria-hidden="true" />
        </button>
        <span class="flow-control-divider" aria-hidden="true"></span>
        <button type="button" class="flow-control-button" aria-label="Zoom out" @click="zoomOut()">
          <img class="flow-control-button__icon" :src="zoomOutIcon" alt="" aria-hidden="true" />
        </button>
        <span class="flow-control-zoom">{{ Math.round(viewport.zoom * 100) }}%</span>
        <button type="button" class="flow-control-button" aria-label="Zoom in" @click="zoomIn()">
          <img class="flow-control-button__icon" :src="zoomInIcon" alt="" aria-hidden="true" />
        </button>
        <span class="flow-control-divider" aria-hidden="true"></span>
        <button
          type="button"
          class="flow-control-button"
          :class="{ 'is-active': showMiniMap }"
          aria-label="Toggle minimap"
          @click="showMiniMap = !showMiniMap"
        >
          <img class="flow-control-button__icon" :src="toggleMinimapIcon" alt="" aria-hidden="true" />
        </button>
      </div>
    </VueFlow>

    <div v-if="!isViewMode" v-permission="'engineer'" class="modeling-editor__floating-actions">
      <el-button
        class="floating-btn floating-btn--cancel"
        title="Restore to last saved"
        :disabled="!hasUnsavedChanges"
        @click="$emit('restore')"
      >
        <AppIcon name="i-tabler-rotate-2" />
        <span>Restart</span>
      </el-button>
      <el-button
        type="primary"
        class="floating-btn floating-btn--submit"
        :class="{ 'is-dirty': hasUnsavedChanges }"
        :disabled="!hasUnsavedChanges"
        title="Save"
        @click="$emit('save')"
      >
        <AppIcon name="i-tabler-device-floppy" />
        <span>Save</span>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueFlow, ConnectionMode, type Connection, type Edge, type Node, type NodeTypesObject, type EdgeTypesObject } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import AppIcon from '@/components/AppIcon.vue'
import LoadingBg from '@/components/common/LoadingBg.vue'
import type { DeviceInstanceBasic } from '@/types/deviceConfiguration'
import type { ModelInstanceBinding } from '@/types/visualModeling'
import FixedBindingCard from './FixedBindingCard.vue'
import topologyStationIcon from '@/assets/icons/topology-station.svg'
import topologyEnvironmentIcon from '@/assets/icons/topology-environment.svg'
import fitViewIcon from '@/assets/icons/tuopu-fitView.svg'
import toggleMinimapIcon from '@/assets/icons/tuopu-toggleMinimap.svg'
import zoomInIcon from '@/assets/icons/tuopu-zoomIn.svg'
import zoomOutIcon from '@/assets/icons/tuopu-zoomOut.svg'

defineProps<{
  nodes: Node[]
  edges: Edge[]
  nodeTypes: NodeTypesObject
  edgeTypes: EdgeTypesObject
  isViewMode: boolean
  isCanvasLoading: boolean
  hasUnsavedChanges: boolean
  fixedStationBinding: ModelInstanceBinding | null
  fixedEnvironmentBinding: ModelInstanceBinding | null
  stationLabel: string
  environmentLabel: string
  showEnvironment: boolean
  stationInstances: DeviceInstanceBasic[]
  environmentInstances: DeviceInstanceBasic[]
  viewport: { zoom: number }
  miniMapNodeColor: (node: Node) => string
  miniMapNodeStrokeColor: (node: Node) => string
  fitView: () => void
  zoomIn: () => void
  zoomOut: () => void
}>()

const canvasRef = ref<HTMLElement | null>(null)
const showMiniMap = ref(true)

function getExportElement(): HTMLElement | null {
  return canvasRef.value
}

defineExpose({ getExportElement })

defineEmits<{
  dragover: [event: DragEvent]
  dragleave: [event: DragEvent]
  drop: [event: DragEvent]
  connect: [connection: Connection]
  'update:nodes': [value: Node[]]
  'update:edges': [value: Edge[]]
  'node-click': [event: unknown]
  'edge-click': [event: unknown]
  'pane-click': []
  'update:fixedStationBinding': [value: ModelInstanceBinding | null]
  'update:fixedEnvironmentBinding': [value: ModelInstanceBinding | null]
  restore: []
  save: []
}>()
</script>

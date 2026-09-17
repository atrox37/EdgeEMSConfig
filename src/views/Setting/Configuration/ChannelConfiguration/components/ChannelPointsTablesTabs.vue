<template>
  <div class="config-section__tabs-wrapper">
    <el-tabs
      v-model="activeTab"
      :type="tabsType"
      :before-leave="beforeLeave"
      class="config-section__tabs"
      @tab-change="(name) => emit('tabChange', name)"
    >
      <el-tab-pane v-if="channelProtocol !== 'di_do'" label="Telemetry" name="telemetry">
        <template v-if="viewMode === 'points'">
          <PointTablePoints
            ref="telemetryTableRef"
            pointType="T"
            :points="pointsData.telemetry"
            :original-points="originalPointsData.telemetry"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :loading="loading"
            :publish-mode="isPublish && activeTab === 'telemetry'"
            :channel-protocol="channelProtocol"
            @toggle-publish="emit('togglePublish')"
            @enter-edit-mode="(payload) => emit('enterEditMode', payload)"
            @publish-change="(dirty: boolean) => emit('publishChange', dirty)"
          />
        </template>
        <template v-else>
          <PointTableMappings
            ref="telemetryTableRef"
            pointType="T"
            :points="pointsData.telemetry"
            :original-points="originalPointsData.telemetry"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :loading="loading"
            :channel-protocol="channelProtocol"
          />
        </template>
      </el-tab-pane>
      <el-tab-pane label="Signal" name="signal">
        <template v-if="viewMode === 'points'">
          <PointTablePoints
            ref="signalTableRef"
            pointType="S"
            :points="pointsData.signal"
            :original-points="originalPointsData.signal"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :loading="loading"
            :publish-mode="isPublish && activeTab === 'signal'"
            :channel-protocol="channelProtocol"
            @toggle-publish="emit('togglePublish')"
            @enter-edit-mode="(payload) => emit('enterEditMode', payload)"
            @publish-change="(dirty: boolean) => emit('publishChange', dirty)"
          />
        </template>
        <template v-else>
          <PointTableMappings
            ref="signalTableRef"
            pointType="S"
            :points="pointsData.signal"
            :original-points="originalPointsData.signal"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :loading="loading"
            :channel-protocol="channelProtocol"
          />
        </template>
      </el-tab-pane>
      <el-tab-pane v-if="channelProtocol !== 'can'" label="Control" name="control">
        <template v-if="viewMode === 'points'">
          <PointTablePoints
            ref="controlTableRef"
            pointType="C"
            :points="pointsData.control"
            :original-points="originalPointsData.control"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :loading="loading"
            :publish-mode="isPublish && activeTab === 'control'"
            :channel-protocol="channelProtocol"
            @toggle-publish="emit('togglePublish')"
            @enter-edit-mode="(payload) => emit('enterEditMode', payload)"
            @publish-change="(dirty: boolean) => emit('publishChange', dirty)"
          />
        </template>
        <template v-else>
          <PointTableMappings
            ref="controlTableRef"
            pointType="C"
            :points="pointsData.control"
            :original-points="originalPointsData.control"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :loading="loading"
            :channel-protocol="channelProtocol"
          />
        </template>
      </el-tab-pane>
      <el-tab-pane
        v-if="channelProtocol !== 'di_do' && channelProtocol !== 'can'"
        label="Adjustment"
        name="adjustment"
      >
        <template v-if="viewMode === 'points'">
          <PointTablePoints
            ref="adjustmentTableRef"
            pointType="A"
            :points="pointsData.adjustment"
            :original-points="originalPointsData.adjustment"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :loading="loading"
            :publish-mode="isPublish && activeTab === 'adjustment'"
            :channel-protocol="channelProtocol"
            @toggle-publish="emit('togglePublish')"
            @enter-edit-mode="(payload) => emit('enterEditMode', payload)"
            @publish-change="(dirty: boolean) => emit('publishChange', dirty)"
          />
        </template>
        <template v-else>
          <PointTableMappings
            ref="adjustmentTableRef"
            pointType="A"
            :points="pointsData.adjustment"
            :original-points="originalPointsData.adjustment"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :loading="loading"
            :channel-protocol="channelProtocol"
          />
        </template>
      </el-tab-pane>
    </el-tabs>

    <PointsTablesStatusFilter
      v-model:status-checkbox-value="statusCheckboxValue"
      v-model:invalid-checked="invalidChecked"
      :visible="isEditing"
      :view-mode="viewMode"
      :tone="props.statusFilterTone"
      @status-checkbox-change="(val) => emit('statusCheckboxChange', val)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PointInfoResponse } from '@/types/channelConfiguration'
import PointTablePoints from './PointTablePoints.vue'
import PointTableMappings from './PointTableMappings.vue'
import PointsTablesStatusFilter from '@/components/pointsTables/PointsTablesStatusFilter.vue'

import type { DataType } from '@/types/websocket'

type ChannelTabName = 'telemetry' | 'signal' | 'control' | 'adjustment'
const CHANNEL_TAB_NAMES: ChannelTabName[] = ['telemetry', 'signal', 'control', 'adjustment']
type ChannelProtocol = 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'

const props = withDefaults(
  defineProps<{
    viewMode: 'points' | 'mappings'
    editFilters: string[]
    isEditing: boolean
    isPublish: boolean
    pointsData: PointInfoResponse
    originalPointsData: PointInfoResponse
    channelProtocol: ChannelProtocol
    loading?: boolean
    tabsType?: 'card' | ''
    statusFilterTone?: 'page' | 'dialog'
    beforeLeave?: (
      newName: string | number,
      oldName: string | number,
    ) => boolean | Promise<boolean>
  }>(),
  {
    statusFilterTone: 'page',
  },
)

const activeTab = defineModel<ChannelTabName | string>('activeTab', { required: true })
const statusCheckboxValue = defineModel<string[]>('statusCheckboxValue', { default: () => [] })
const invalidChecked = defineModel<boolean>('invalidChecked', { default: false })

const emit = defineEmits<{
  togglePublish: []
  publishChange: [boolean]
  tabChange: [string | number]
  statusCheckboxChange: [string[]]
  enterEditMode: [payload?: { fromImport?: boolean }]
}>()

const telemetryTableRef = ref<InstanceType<typeof PointTablePoints>>()
const signalTableRef = ref<InstanceType<typeof PointTablePoints>>()
const controlTableRef = ref<InstanceType<typeof PointTablePoints>>()
const adjustmentTableRef = ref<InstanceType<typeof PointTablePoints>>()

const tableRefsByTab = {
  telemetry: telemetryTableRef,
  signal: signalTableRef,
  control: controlTableRef,
  adjustment: adjustmentTableRef,
} as const

defineExpose({
  resetPublishForTab(tab: ChannelTabName) {
    tableRefsByTab[tab]?.value?.resetPublish?.()
  },
  hasPublishChangesForTab(tab: ChannelTabName) {
    return !!tableRefsByTab[tab]?.value?.hasPublishChanges?.()
  },
  getTableInstance(tab: ChannelTabName) {
    return tableRefsByTab[tab]?.value
  },
  forEachTableInstance(fn: (instance: any, tab: ChannelTabName) => void) {
    CHANNEL_TAB_NAMES.forEach((tab) => {
      const instance = tableRefsByTab[tab]?.value
      if (instance) fn(instance, tab)
    })
  },
  applyRealtimeValues(dataType: DataType, values: Record<string, number>, ts?: Record<string, number>) {
    const refByType = {
      T: telemetryTableRef,
      S: signalTableRef,
      C: controlTableRef,
      A: adjustmentTableRef,
    }
    refByType[dataType]?.value?.applyRealtimeValues?.(values, ts)
  },
  scrollActiveTabToTop(tab: ChannelTabName) {
    tableRefsByTab[tab]?.value?.scrollToTop?.()
  },
})
</script>

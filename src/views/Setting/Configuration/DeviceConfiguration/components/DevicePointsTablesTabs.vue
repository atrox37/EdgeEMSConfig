<template>
  <div class="config-section__tabs-wrapper">
    <el-tabs
      v-model="activeTab"
      :type="tabsType"
      :before-leave="beforeLeave"
      class="config-section__tabs"
      @tab-change="(name) => emit('tabChange', name)"
    >
      <el-tab-pane v-if="viewMode === 'points'" label="property" name="property">
        <DevicePointTablePoints
          ref="propertyPointsRef"
          category="property"
          :points="propertyRows"
          :original-points="originalPointsData.property"
          :view-mode="viewMode"
          :edit-filters="editFilters"
          :is-editing="isEditing"
          :publish-mode="false"
          :loading="loading"
        />
      </el-tab-pane>
      <el-tab-pane label="measurement" name="measurement">
        <template v-if="viewMode === 'points'">
          <DevicePointTablePoints
            ref="measurementPointsRef"
            category="measurement"
            :points="measurementRows"
            :original-points="originalPointsData.measurement"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :publish-mode="isPublish && activeTab === 'measurement'"
            :loading="loading"
            @publish-change="(dirty: boolean) => emit('publishChange', dirty)"
            @toggle-publish="emit('togglePublish')"
          />
        </template>
        <template v-else>
          <DevicePointTableRouting
            ref="measurementRoutingRef"
            category="measurement"
            :points="measurementRows"
            :original-points="originalPointsData.measurement"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :channels="channelsForRouting"
            :loading="loading"
          />
        </template>
      </el-tab-pane>
      <el-tab-pane label="action" name="action">
        <template v-if="viewMode === 'points'">
          <DevicePointTablePoints
            ref="actionPointsRef"
            category="action"
            :points="actionRows"
            :original-points="originalPointsData.action"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :publish-mode="isPublish && activeTab === 'action'"
            :loading="loading"
            @publish-change="(dirty: boolean) => emit('publishChange', dirty)"
            @toggle-publish="emit('togglePublish')"
          />
        </template>
        <template v-else>
          <DevicePointTableRouting
            ref="actionRoutingRef"
            category="action"
            :points="actionRows"
            :original-points="originalPointsData.action"
            :view-mode="viewMode"
            :edit-filters="editFilters"
            :is-editing="isEditing"
            :channels="channelsForRouting"
            :loading="loading"
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
      :compact="props.statusFilterCompact"
      @status-checkbox-change="(val) => emit('statusCheckboxChange', val)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type {
  InstanceActionItem,
  InstanceMeasurementItem,
  InstancePropertyItem,
} from '@/types/deviceConfiguration'
import DevicePointTablePoints from './DevicePointTablePoints.vue'
import DevicePointTableRouting from './DevicePointTableRouting.vue'
import PointsTablesStatusFilter from '@/components/pointsTables/PointsTablesStatusFilter.vue'

type DeviceTabName = 'measurement' | 'action' | 'property'

const props = withDefaults(
  defineProps<{
    viewMode: 'points' | 'routing'
    editFilters: string[]
    isEditing: boolean
    isPublish: boolean
    propertyRows: InstancePropertyItem[]
    measurementRows: InstanceMeasurementItem[]
    actionRows: InstanceActionItem[]
    originalPointsData: {
      property: InstancePropertyItem[]
      measurement: InstanceMeasurementItem[]
      action: InstanceActionItem[]
    }
    channelsForRouting: Array<{ id: number; name: string }>
    loading?: boolean
    tabsType?: 'card' | ''
    statusFilterTone?: 'page' | 'dialog'
    statusFilterCompact?: boolean
    beforeLeave?: (
      newName: string | number,
      oldName: string | number,
    ) => boolean | Promise<boolean>
  }>(),
  {
    statusFilterTone: 'page',
    statusFilterCompact: false,
  },
)

const activeTab = defineModel<DeviceTabName>('activeTab', { required: true })
const statusCheckboxValue = defineModel<string[]>('statusCheckboxValue', { default: () => [] })
const invalidChecked = defineModel<boolean>('invalidChecked', { default: false })

const emit = defineEmits<{
  togglePublish: []
  publishChange: [boolean]
  tabChange: [string | number]
  statusCheckboxChange: [string[]]
}>()

const propertyPointsRef = ref<InstanceType<typeof DevicePointTablePoints>>()
const measurementPointsRef = ref<InstanceType<typeof DevicePointTablePoints>>()
const actionPointsRef = ref<InstanceType<typeof DevicePointTablePoints>>()
const measurementRoutingRef = ref<InstanceType<typeof DevicePointTableRouting>>()
const actionRoutingRef = ref<InstanceType<typeof DevicePointTableRouting>>()

const pointsTableRefsByTab = {
  measurement: measurementPointsRef,
  action: actionPointsRef,
  property: propertyPointsRef,
} as const

defineExpose({
  resetPublishForTab(tab: DeviceTabName) {
    pointsTableRefsByTab[tab]?.value?.resetPublish?.()
  },
  hasPublishChangesForTab(tab: DeviceTabName) {
    return !!pointsTableRefsByTab[tab]?.value?.hasPublishChanges?.()
  },
  getPointsTable(tab: DeviceTabName) {
    return pointsTableRefsByTab[tab]?.value
  },
  getMeasurementRouting() {
    return measurementRoutingRef.value
  },
  getActionRouting() {
    return actionRoutingRef.value
  },
  applyRealtimeValues(
    category: DeviceTabName,
    values: Record<string, number>,
    ts?: Record<string, number>,
  ) {
    pointsTableRefsByTab[category]?.value?.applyRealtimeValues?.(values, ts)
  },
})
</script>

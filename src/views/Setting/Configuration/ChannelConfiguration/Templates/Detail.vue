<template>
  <div class="voltage-class template-detail-page">
    <el-page-header @back="handleBack" class="template-detail-page__header">
      <template #content>
        <div class="points-tables-page__header-content">
          <span class="points-tables-page__channel-name">
            {{ templateDetail?.name || '' }} -&nbsp;
          </span>
          <el-dropdown trigger="click" :teleported="true" @command="handleDropdownCommand">
            <span class="points-tables-page__dropdown-trigger">
              {{ viewMode === 'points' ? 'Points Table' : 'Mappings Table' }}
              <AppIcon name="i-tabler-chevron-down" className="el-icon--right" />
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="points">Points Table</el-dropdown-item>
                <el-dropdown-item command="mappings">Mappings Table</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>
    </el-page-header>

    <div class="template-detail-page__content" v-loading="loading">
      <div class="rule-management__expand-content">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="Telemetry" name="telemetry" v-if="templateProtocol !== 'di_do'">
            <template v-if="viewMode === 'points'">
              <div class="template-detail-page__table-panel">
                <PointTablePoints
                  pointType="T"
                  :points="pointsSnapshot.telemetry"
                  :original-points="pointsSnapshot.telemetry"
                  :view-mode="viewMode"
                  :edit-filters="[]"
                  :is-editing="false"
                  :show-operation-column="false"
                  :show-actions="false"
                  :show-realtime-columns="false"
                  :channel-protocol="templateProtocol"
                />
              </div>
            </template>
            <template v-else>
              <div class="template-detail-page__table-panel">
                <PointTableMappings
                  pointType="T"
                  :points="mappingPointsSnapshot.telemetry"
                  :original-points="mappingPointsSnapshot.telemetry"
                  :view-mode="viewMode"
                  :edit-filters="[]"
                  :is-editing="false"
                  :show-actions="false"
                  :channel-protocol="templateProtocol"
                />
              </div>
            </template>
          </el-tab-pane>

          <el-tab-pane label="Signal" name="signal">
            <template v-if="viewMode === 'points'">
              <div class="template-detail-page__table-panel">
                <PointTablePoints
                  pointType="S"
                  :points="pointsSnapshot.signal"
                  :original-points="pointsSnapshot.signal"
                  :view-mode="viewMode"
                  :edit-filters="[]"
                  :is-editing="false"
                  :show-operation-column="false"
                  :show-actions="false"
                  :show-realtime-columns="false"
                  :channel-protocol="templateProtocol"
                />
              </div>
            </template>
            <template v-else>
              <div class="template-detail-page__table-panel">
                <PointTableMappings
                  pointType="S"
                  :points="mappingPointsSnapshot.signal"
                  :original-points="mappingPointsSnapshot.signal"
                  :view-mode="viewMode"
                  :edit-filters="[]"
                  :is-editing="false"
                  :show-actions="false"
                  :channel-protocol="templateProtocol"
                />
              </div>
            </template>
          </el-tab-pane>

          <el-tab-pane label="Control" name="control" v-if="templateProtocol !== 'di_do' && templateProtocol !== 'can'">
            <template v-if="viewMode === 'points'">
              <div class="template-detail-page__table-panel">
                <PointTablePoints
                  pointType="C"
                  :points="pointsSnapshot.control"
                  :original-points="pointsSnapshot.control"
                  :view-mode="viewMode"
                  :edit-filters="[]"
                  :is-editing="false"
                  :show-operation-column="false"
                  :show-actions="false"
                  :show-realtime-columns="false"
                  :channel-protocol="templateProtocol"
                />
              </div>
            </template>
            <template v-else>
              <div class="template-detail-page__table-panel">
                <PointTableMappings
                  pointType="C"
                  :points="mappingPointsSnapshot.control"
                  :original-points="mappingPointsSnapshot.control"
                  :view-mode="viewMode"
                  :edit-filters="[]"
                  :is-editing="false"
                  :show-actions="false"
                  :channel-protocol="templateProtocol"
                />
              </div>
            </template>
          </el-tab-pane>

          <el-tab-pane label="Adjustment" name="adjustment" v-if="templateProtocol !== 'di_do' && templateProtocol !== 'can'">
            <template v-if="viewMode === 'points'">
              <div class="template-detail-page__table-panel">
                <PointTablePoints
                  pointType="A"
                  :points="pointsSnapshot.adjustment"
                  :original-points="pointsSnapshot.adjustment"
                  :view-mode="viewMode"
                  :edit-filters="[]"
                  :is-editing="false"
                  :show-operation-column="false"
                  :show-actions="false"
                  :show-realtime-columns="false"
                  :channel-protocol="templateProtocol"
                />
              </div>
            </template>
            <template v-else>
              <div class="template-detail-page__table-panel">
                <PointTableMappings
                  pointType="A"
                  :points="mappingPointsSnapshot.adjustment"
                  :original-points="mappingPointsSnapshot.adjustment"
                  :view-mode="viewMode"
                  :edit-filters="[]"
                  :is-editing="false"
                  :show-actions="false"
                  :channel-protocol="templateProtocol"
                />
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import PointTablePoints from '@/views/Setting/Configuration/ChannelConfiguration/components/PointTablePoints.vue'
import PointTableMappings from '@/views/Setting/Configuration/ChannelConfiguration/components/PointTableMappings.vue'
import type {
  ChannelTemplateDetail,
  TemplateMappingSnapshotItem,
  TemplateMappingsSnapshot,
} from '@/types/channelTemplates'
import type { PointInfo, PointInfoResponse } from '@/types/channelConfiguration'
import { getTemplateDetail } from '@/api/channelTemplates'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const activeTab = ref<'telemetry' | 'signal' | 'control' | 'adjustment'>('telemetry')

// 根据协议决定默认 tab：di_do 无 telemetry → signal；其余均从 telemetry 开始
const getDefaultTab = (protocol: string): 'telemetry' | 'signal' => {
  return protocol === 'di_do' ? 'signal' : 'telemetry'
}
const viewModeSwitch = ref(false)
const viewMode = computed(() => (viewModeSwitch.value ? 'mappings' : 'points'))
const templateDetail = ref<ChannelTemplateDetail | null>(null)

const templateProtocol = computed(
  () => templateDetail.value?.protocol || ('modbus_tcp' as 'modbus_tcp'),
)

const emptyPoints: PointInfoResponse = {
  telemetry: [],
  signal: [],
  control: [],
  adjustment: [],
}

const pointsSnapshot = computed<PointInfoResponse>(() => {
  const raw = templateDetail.value?.points_snapshot
  if (!raw) return emptyPoints
  const normalize = (rows: any[], type: 'T' | 'S' | 'C' | 'A') =>
    (rows || []).map((item: any, idx: number) => ({
      ...item,
      rowKey: `${type}_${item.point_id}_${idx}`,
      rowStatus: 'normal',
      modifiedFields: [],
    }))
  return {
    telemetry: normalize(raw.telemetry || [], 'T'),
    signal: normalize(raw.signal || [], 'S'),
    control: normalize(raw.control || [], 'C'),
    adjustment: normalize(raw.adjustment || [], 'A'),
  } as PointInfoResponse
})

const toPointInfo = (
  item: TemplateMappingSnapshotItem,
  type: 'T' | 'S' | 'C' | 'A',
  idx: number,
): PointInfo => {
  const protocolData = (item?.protocol_data || {}) as Record<string, any>
  const protocol = templateProtocol.value

  // 按协议类型构建对应的 protocol_mapping，避免 CAN/di_do 字段被错误填入 modbus 结构
  let mappingData: any
  if (protocol === 'can') {
    mappingData = {
      can_id:
        protocolData.can_id === undefined || protocolData.can_id === null
          ? undefined
          : String(protocolData.can_id),
      byte_offset:
        protocolData.byte_offset === undefined || protocolData.byte_offset === null
          ? undefined
          : Number(protocolData.byte_offset),
      bit_position:
        protocolData.bit_position === undefined || protocolData.bit_position === null
          ? undefined
          : Number(protocolData.bit_position),
      bit_length:
        protocolData.bit_length === undefined || protocolData.bit_length === null
          ? undefined
          : Number(protocolData.bit_length),
      data_type:
        protocolData.data_type === undefined || protocolData.data_type === null
          ? undefined
          : String(protocolData.data_type),
    }
  } else if (protocol === 'di_do') {
    mappingData = {
      gpio_number:
        protocolData.gpio_number === undefined || protocolData.gpio_number === null
          ? undefined
          : Number(protocolData.gpio_number),
    }
  } else {
    // modbus_tcp / modbus_rtu / virt
    mappingData = {
      slave_id:
        protocolData.slave_id === undefined || protocolData.slave_id === null
          ? undefined
          : Number(protocolData.slave_id),
      function_code:
        protocolData.function_code === undefined || protocolData.function_code === null
          ? undefined
          : Number(protocolData.function_code),
      register_address:
        protocolData.register_address === undefined || protocolData.register_address === null
          ? undefined
          : Number(protocolData.register_address),
      data_type:
        protocolData.data_type === undefined || protocolData.data_type === null
          ? undefined
          : String(protocolData.data_type),
      byte_order:
        protocolData.byte_order === undefined || protocolData.byte_order === null
          ? undefined
          : String(protocolData.byte_order),
      bit_position:
        protocolData.bit_position === undefined || protocolData.bit_position === null
          ? undefined
          : Number(protocolData.bit_position),
      gpio_number:
        protocolData.gpio_number === undefined || protocolData.gpio_number === null
          ? undefined
          : Number(protocolData.gpio_number),
    }
  }

  return {
    point_id: Number(item.point_id || 0),
    signal_name: String(item.signal_name || ''),
    scale: 1,
    offset: 0,
    unit: '',
    data_type: String(protocolData.data_type || ''),
    reverse: false,
    description: '',
    rowStatus: 'normal',
    modifiedFields: [],
    protocol_mapping: mappingData,
    originalData: {
      rowKey: `${type}_${item.point_id}_${idx}`,
    },
  } as PointInfo
}

const mappingPointsSnapshot = computed<PointInfoResponse>(() => {
  const raw: TemplateMappingsSnapshot | undefined = templateDetail.value?.mappings_snapshot
  if (!raw) return emptyPoints
  return {
    telemetry: (raw.telemetry || []).map((item, idx) => toPointInfo(item, 'T', idx)),
    signal: (raw.signal || []).map((item, idx) => toPointInfo(item, 'S', idx)),
    control: (raw.control || []).map((item, idx) => toPointInfo(item, 'C', idx)),
    adjustment: (raw.adjustment || []).map((item, idx) => toPointInfo(item, 'A', idx)),
  }
})

const handleDropdownCommand = (command: string) => {
  viewModeSwitch.value = command === 'mappings'
}

const handleBack = () => {
  router.push('/channelConfiguration/templates')
}

const loadDetail = async () => {
  const id = Number(route.query.template_id)
  if (!id) {
    ElMessage.error('template_id is required')
    handleBack()
    return
  }
  loading.value = true
  try {
    const res = await getTemplateDetail(id)
    if (res.success) {
      templateDetail.value = res.data
      activeTab.value = getDefaultTab(templateDetail.value.protocol)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.voltage-class.template-detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;

  .template-detail-page__header {
    height: 64px;
    display: flex;
    align-items: center;
  }

  .points-tables-page__header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    min-width: 0;

    .points-tables-page__dropdown-trigger {
      display: inline-flex;
      align-items: center;
      font-size: var(--vt-font-size-lg);
      font-weight: var(--vt-font-weight-semibold);
      color: var(--vt-text-primary);
      cursor: pointer;

      :deep(.el-icon--right) {
        margin-left: 4px;
        width: 1em;
        height: 1em;
      }
    }

    .points-tables-page__channel-name {
      font-size: var(--vt-font-size-lg);
      font-weight: var(--vt-font-weight-semibold);
      color: var(--vt-text-primary);
      flex-shrink: 0;
      margin-left: 4px;
    }
  }

  .template-detail-page__content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    // padding: 20px;
  }

  .rule-management__expand-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.el-tab-pane) {
    height: 100%;
    overflow: hidden;
  }

  .template-detail-page__table-panel {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.point-table) {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.point-table__wrapper) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}
</style>


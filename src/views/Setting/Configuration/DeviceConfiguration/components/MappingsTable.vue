<template>
  <div class="voltage-class mappings-table">
    <el-table :data="editItems" class="mappings-table__content" table-layout="fixed" height="5rem">
      <el-table-column prop="point_id" label="Point ID" width="100" />
      <el-table-column prop="channel.id" label="Channel ID" width="120">
        <template #default="{ row: itemRow, $index }">
          <template v-if="isEditing">
            <el-select
              v-model="(editItems[$index].channel as any).id"
              placeholder="Channel"
              filterable
              @change="(val: any) => onChannelChange($index, val)"
            >
              <el-option v-for="c in channelOptions" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </template>
          <template v-else>
            <span>{{ (itemRow.channel as any)?.id }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="channel.four_remote" label="Four Remote" width="140">
        <template #default="{ row: itemRow, $index }">
          <template v-if="isEditing">
            <el-select
              v-model="(editItems[$index].channel as any).four_remote"
              placeholder="Four Remote"
              @change="(val: any) => onFourRemoteChange($index, val)"
            >
              <el-option v-for="o in fourRemoteOptions" :key="o" :label="o" :value="o" />
            </el-select>
          </template>
          <template v-else>
            <span>{{ (itemRow.channel as any)?.four_remote }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="channel.point_id" label="Channel Point ID" width="160">
        <template #default="{ row: itemRow, $index }">
          <template v-if="isEditing">
            <el-select
              v-model="(editItems[$index].channel as any).point_id"
              placeholder="Channel Point"
              filterable
              @change="(val: any) => onChannelPointChange($index, val)"
            >
              <el-option
                v-for="p in getChannelPointOptions(editItems[$index])"
                :key="p.point_id"
                :label="String(p.point_id)"
                :value="p.point_id"
              />
            </el-select>
          </template>
          <template v-else>
            <span>{{ (itemRow.channel as any)?.point_id }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="protocol_data.register_address" label="Register Address" width="160">
        <template #default="{ row: itemRow, $index }">
          <template v-if="isEditing">
            <el-input
              :model-value="getRegisterAddressStr($index)"
              :maxlength="5"
              placeholder="Register Address"
              @input="(val: any) => onRegisterAddressInput($index, String(val))"
            />
          </template>
          <template v-else>
            <span>{{ (itemRow.protocol_data as any)?.register_address }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="protocol_data.bit_position" label="Bit Pos" width="120">
        <template #default="{ row: itemRow, $index }">
          <template v-if="isEditing">
            <el-input-number
              v-model.number="(editItems[$index].protocol_data as any).bit_position"
              :controls="false"
              :min="0"
              :max="15"
              :step="1"
              :disabled="!canEditBitPosition($index)"
              align="left"
              @change="(val: any) => onBitPositionChange($index, Number(val))"
            />
          </template>
          <template v-else>
            <span>{{ (itemRow.protocol_data as any)?.bit_position }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="enabled" label="Enabled" width="120">
        <template #default="{ row: itemRow, $index }">
          <template v-if="isEditing">
            <el-switch v-model="editItems[$index].enabled" />
          </template>
          <template v-else>
            <span :style="{ color: itemRow.enabled ? '#67C23A' : '#F56C6C', fontWeight: 600 }">
              {{ itemRow.enabled ? 'true' : 'false' }}
            </span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="Description" min-width="200">
        <template #default="{ row: itemRow, $index }">
          <template v-if="isEditing">
            <el-input
              v-model="editItems[$index].description"
              :maxlength="64"
              show-word-limit
              placeholder="Description"
            />
          </template>
          <template v-else>
            <span>{{ itemRow.description }}</span>
          </template>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { InstanceMappingItem } from '@/types/deviceConfiguration'
import { getPointsTables } from '@/api/channelsManagement'

interface Props {
  items: InstanceMappingItem[]
  isEditing: boolean
  tabType: 'measurement' | 'action'
}

const props = defineProps<Props>()

const editItems = ref<any[]>([])
// 仅记录被修改过的字段：{ [point_id]: { protocol_data: { key: value } } }
const changedMap = ref<Record<number, { protocol_data: Record<string, any> }>>({})

// 依赖下拉：通道、四遥、点位
const channelOptions = ref<Array<{ id: number; name: string }>>([])
// 根据 tab 约束四遥可选项
const fourRemoteOptions = computed(() =>
  props.tabType === 'measurement' ? ['T', 'S'] : ['C', 'A'],
)
// 模拟/缓存每个通道下的点位（仅 id）
const channelIdToPoints = ref<Record<number, Array<{ point_id: number }>>>({})

async function ensureChannelPointsLoaded(channelId: number, fourRemote: 'T' | 'S' | 'C' | 'A') {
  if (!channelId || channelIdToPoints.value[channelId]) return
  const res = await getPointsTables(channelId)
  if (res?.success) {
    const all = [
      ...(res.data?.telemetry || []),
      ...(res.data?.signal || []),
      ...(res.data?.control || []),
      ...(res.data?.adjustment || []),
    ]
    channelIdToPoints.value[channelId] = all.map((p: any) => ({ point_id: p.point_id }))
  }
}

function getChannelPointOptions(item: any) {
  const cid = item?.channel?.id
  return channelIdToPoints.value[cid] || []
}

function normalizeType(v: string): string {
  return (v || '').toLowerCase()
}

function recordChange(pointId: number, key: string, value: any) {
  if (!changedMap.value[pointId]) {
    changedMap.value[pointId] = { protocol_data: {} }
  }
  changedMap.value[pointId].protocol_data[key] = value
}

async function onChannelChange(index: number, channelId: number) {
  editItems.value[index].channel = editItems.value[index].channel || {}
  editItems.value[index].channel.id = channelId
  editItems.value[index].channel.four_remote = undefined
  editItems.value[index].channel.point_id = undefined
}

function onFourRemoteChange(index: number, fr: 'T' | 'S' | 'C' | 'A') {
  editItems.value[index].channel = editItems.value[index].channel || {}
  editItems.value[index].channel.four_remote = fr
  editItems.value[index].channel.point_id = undefined
}

function onChannelPointChange(index: number, pid: number) {
  editItems.value[index].channel = editItems.value[index].channel || {}
  editItems.value[index].channel.point_id = pid
}

function canEditBitPosition(index: number): boolean {
  const pd = (editItems.value[index].protocol_data as any) || {}
  const fc = Number(pd.function_code)
  const dt = String(pd.data_type || '').toLowerCase()
  const isBoolFC = (fc === 3 || fc === 4) && (dt === 'bool' || dt === 'boolean')
  const is16 = dt === 'float16' || dt === 'int16' || dt === 'uint16'
  return isBoolFC || is16
}

function onBitPositionChange(index: number, val: number) {
  const v = Math.max(0, Math.min(15, Math.round(Number(val))))
  ;(editItems.value[index].protocol_data as any).bit_position = v
  recordChange(editItems.value[index].point_id, 'bit_position', v)
}

function getRegisterAddressStr(index: number) {
  const v = (editItems.value[index].protocol_data as any)?.register_address
  return v == null ? '' : String(v)
}

function onRegisterAddressInput(index: number, str: string) {
  const digits = (str || '').replace(/\D+/g, '').slice(0, 5)
  const num = digits === '' ? undefined : Number(digits)
  ;(editItems.value[index].protocol_data as any).register_address = num
  recordChange(editItems.value[index].point_id, 'register_address', num)
}

watch(
  () =>
    editItems.value.map((i: any) => ({
      fc: (i.protocol_data as any)?.function_code,
      dt: String((i.protocol_data as any)?.data_type || '').toLowerCase(),
    })),
  () => {
    editItems.value.forEach((_, idx) => {
      if (!canEditBitPosition(idx)) {
        if ((editItems.value[idx].protocol_data as any).bit_position != null) {
          ;(editItems.value[idx].protocol_data as any).bit_position = undefined
          recordChange(editItems.value[idx].point_id, 'bit_position', undefined)
        }
      }
    })
  },
  { deep: true },
)

watch(
  () => ({ items: props.items, isEditing: props.isEditing }),
  (val) => {
    if (!val.isEditing && Array.isArray(val.items)) {
      editItems.value = val.items.map((item: any) => ({
        ...item,
        channel: { ...(item.channel || {}) },
      }))
      changedMap.value = {}
    }
  },
  { immediate: true, deep: true },
)

const getEditedData = () => {
  const results: any[] = []
  for (const item of editItems.value as any[]) {
    results.push({
      point_id: item.point_id,
      channel: {
        id: item.channel?.id,
        four_remote: item.channel?.four_remote,
        point_id: item.channel?.point_id,
      },
      enabled: item.enabled,
      description: item.description,
    })
  }
  return results
}

defineExpose({ getEditedData })
</script>

<style scoped lang="scss">
.voltage-class .mappings-table {
  .mappings-table__content {
    :deep(.el-table__body-wrapper) {
      td {
        .cell {
          min-height: 0.32rem;
        }
      }
    }
  }
}
</style>

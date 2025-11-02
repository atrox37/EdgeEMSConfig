<template>
  <div class="voltage-class points-table">
    <el-table :data="rows" class="points-table__el" height="5rem">
      <el-table-column prop="point_index" label="Point Index" width="120" />

      <el-table-column prop="name" label="Name" width="240" show-overflow-tooltip />

      <el-table-column label="Value" width="140">
        <template #default="{ row }">
          <el-input v-if="editable" v-model="(row as any).value" />
          <span v-else>{{ (row as any).value }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="unit" label="Unit" width="140" />
      <el-table-column label="Descript" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.description || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="pointType !== 'property'" label="Operation" width="200">
        <template #default="{ row }">
          <div class="point-table__operation-cell">
            <div class="point-table__operation-btn" @click="handleSetting(row)">
              <el-icon>
                <Setting />
              </el-icon>
              <span>Setting</span>
            </div>
            <div
              v-if="pointType === 'action'"
              class="point-table__operation-btn"
              @click="handleExecute(row)"
            >
              <el-icon>
                <Position />
              </el-icon>
              <span>Execute</span>
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <ExecuteDialog ref="executeDialogRef" />
    <PointsSettingDialog ref="pointsSettingDialogRef" :pointType="pointType" />
  </div>
</template>

<script setup lang="ts">
import type { InstancePointItem } from '@/types/deviceConfiguration'
import { Position, Setting } from '@element-plus/icons-vue'
import { ref } from 'vue'
import ExecuteDialog from './ExecuteDialog.vue'
import PointsSettingDialog from './PointsSettingDialog.vue'
const props = defineProps<{
  rows: InstancePointItem[]
  editable?: boolean
  pointType: 'measurement' | 'action' | 'property'
}>()

const emit = defineEmits<{
  (e: 'execute', payload: { row: InstancePointItem }): void
}>()

const pointsSettingDialogRef = ref<{
  open: (
    point_index: number,
    routing?: {
      channel_id: number
      channel_point_id: number
      channel_type: 'T' | 'S' | 'C' | 'A'
      enabled: boolean
    },
  ) => void
  close: () => void
} | null>(null)

const executeDialogRef = ref<{
  open: (point_id: string) => void
  close: () => void
} | null>(null)

function handleSetting(row: InstancePointItem) {
  pointsSettingDialogRef.value?.open(row.point_index, row.routing)
}

function handleExecute(row: InstancePointItem) {
  executeDialogRef.value?.open(String(row.point_index))
}

const rows = props.rows
const editable = props.editable ?? false
</script>

<style scoped lang="scss">
.voltage-class {
  .points-table {
    .points-table__el {
      width: 100%;
    }
  }
  .point-table__operation-cell {
    display: flex;
    gap: 0.08rem;
    align-items: center;
  }
  .point-table__operation-btn {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.04rem;
    font-size: 0.12rem;
  }
}
</style>

<template>
  <div class="voltage-class point-table">
    <el-table :data="editPoints" class="point-table__content" table-layout="fixed" height="5rem">
      <el-table-column prop="point_id" label="Point ID" width="100" />
      <el-table-column prop="signal_name" label="Signal Name">
        <template #default="{ row: pointRow, $index }">
          <template v-if="isEditing">
            <el-input
              v-model="editPoints[$index].signal_name"
              placeholder="Please enter signal name"
            />
          </template>
          <template v-else>
            <span>{{ pointRow.signal_name }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="realTimeValue " label="Value" width="180">
        <template #default="{ row: pointRow }">
          <span>{{ pointRow.config?.realTimeValue || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        v-if="props.pointType == 'T' || props.pointType == 'A'"
        prop="scale"
        label="Scale"
        width="140"
      >
        <template #default="{ row: pointRow, $index }">
          <template v-if="isEditing">
            <el-input v-model.number="editPoints[$index].scale" placeholder="Scale" type="number" />
          </template>
          <template v-else>
            <span>{{ pointRow.scale }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column
        v-if="props.pointType == 'T' || props.pointType == 'A'"
        prop="offset"
        label="Offset"
        width="100"
      >
        <template #default="{ row: pointRow, $index }">
          <template v-if="isEditing">
            <el-input-number
              v-model="editPoints[$index].offset"
              placeholder="Offset"
              :controls="false"
              align="left"
            />
          </template>
          <template v-else>
            <span>{{ pointRow.offset }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column
        v-if="props.pointType == 'T' || props.pointType == 'A'"
        prop="unit"
        label="Unit"
        width="120"
      >
        <template #default="{ row: pointRow, $index }">
          <template v-if="isEditing">
            <el-input v-model="editPoints[$index].unit" placeholder="Unit" />
          </template>
          <template v-else>
            <span>{{ pointRow.unit }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="data_type" label="Data Type" width="140">
        <template #default="{ row: pointRow, $index }">
          <template v-if="isEditing">
            <el-select v-model="editPoints[$index].data_type" placeholder="Data Type">
              <el-option
                v-for="option in DATA_TYPE_OPTIONS"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
          <template v-else>
            <span>{{ pointRow.data_type }}</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="reverse" label="Reverse" width="120">
        <template #default="{ row: pointRow, $index }">
          <template v-if="isEditing">
            <el-switch v-model="editPoints[$index].reverse" />
          </template>
          <template v-else>
            <span :style="{ color: pointRow.reverse ? '#67C23A' : '#409EFF', fontWeight: 600 }">
              {{ pointRow.reverse ? 'YES' : 'NO' }}
            </span>
          </template>
        </template>
      </el-table-column>
      <el-table-column
        v-if="!isEditing && !publishMode"
        label="Operation"
        fixed="right"
        width="180"
      >
        <template #default="{ row: pointRow, $index }">
          <div class="point-table__operation-cell">
            <template v-if="!isEditing">
              <div class="point-table__setting-btn" @click="handlePointSetting(pointRow)">
                <el-icon>
                  <Setting />
                </el-icon>
                <span>Setting</span>
              </div>
              <div
                v-if="props.pointType == 'C' || props.pointType == 'A'"
                class="point-table__publish-btn"
                @click="handlePublish(pointRow)"
              >
                <el-icon>
                  <Position />
                </el-icon>
                <span>Publish</span>
              </div>
            </template>
            <div v-if="isEditing" class="point-table__delete-btn" @click="deletePoint($index)">
              <el-icon>
                <Delete />
              </el-icon>
              <span>Delete</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        v-if="publishMode && (props.pointType == 'C' || props.pointType == 'A')"
        label="Publish Value"
        width="180"
      >
        <template #default="{ row: pointRow }">
          <template v-if="getDataType(pointRow.data_type) === 'boolean'">
            <el-select v-model="publishValues[pointRow.point_id]" placeholder="Select">
              <el-option label="True" :value="1" />
              <el-option label="False" :value="0" />
            </el-select>
          </template>
          <template v-else-if="getDataType(pointRow.data_type) === 'int'">
            <el-input-number
              v-model="publishValues[pointRow.point_id]"
              :controls="false"
              step-strictly
              @change="notifyPublishChange"
            />
          </template>
          <template v-else-if="getDataType(pointRow.data_type) === 'float'">
            <el-input-number
              v-model="publishValues[pointRow.point_id]"
              :controls="false"
              @change="notifyPublishChange"
            />
          </template>
          <template v-else>
            <el-input
              v-model="publishValues[pointRow.point_id]"
              placeholder="Enter"
              @change="notifyPublishChange"
            />
          </template>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <PointConfigDialog ref="pointConfigDialogRef" />
  <ValuePublishDialog ref="valuePublishDialogRef" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Delete, Position } from '@element-plus/icons-vue'
import type { PointInfo } from '@/types/channelConfiguration'
import { DATA_TYPE_OPTIONS } from '@/types/channelConfiguration'
import PointConfigDialog from './PointConfigDialog.vue'
import ValuePublishDialog from './ValuePublishDialog.vue'
// Props
interface Props {
  pointType: 'T' | 'S' | 'C' | 'A'
  points: PointInfo[]
  publishMode?: boolean
  isEditing: boolean
}

const props = withDefaults(defineProps<Props>(), {
  publishMode: false,
})

const emit = defineEmits<{ 'publish-change': [dirty: boolean] }>()
// 编辑数据副本
const editPoints = ref<PointInfo[]>([])
const pointConfigDialogRef = ref()
const valuePublishDialogRef = ref()
const publishValues = ref<Record<number, any>>({})
// 监听 props，进入编辑时基于传入数据创建本地副本
watch(
  () => ({ points: props.points, isEditing: props.isEditing }),
  (val) => {
    if (!val.isEditing && Array.isArray(val.points)) {
      editPoints.value = val.points.map((item: PointInfo) => ({ ...item }))
    }
  },
  { immediate: true, deep: true },
)

// 删除点
const deletePoint = async (index: number) => {
  try {
    await ElMessageBox.confirm('Are you sure you want to delete this point?', 'Confirm delete', {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
    editPoints.value.splice(index, 1)
    ElMessage.success('Point deleted successfully')
  } catch {
    // 用户取消删除
  }
}

const handlePointSetting = (pointRow: PointInfo) => {
  pointConfigDialogRef.value.open(pointRow.point_id, props.pointType)
}

const handlePublish = (pointRow: PointInfo) => {
  valuePublishDialogRef.value.open({
    pointId: pointRow.point_id,
    dataType: pointRow.data_type,
    category: props.pointType as 'T' | 'A',
    signalName: pointRow.signal_name,
  })
}

function getDataType(raw: string): 'boolean' | 'int' | 'float' | 'string' {
  const v = (raw || '').toLowerCase()
  if (v === 'boolean' || v === 'bool') return 'boolean'
  if (/^(int|int16|int32|uint16|uint32|u8|u16|u32)$/i.test(v)) return 'int'
  if (/^(float|float16|float32|float64)$/i.test(v)) return 'float'
  return 'string'
}

function notifyPublishChange() {
  emit('publish-change', hasPublishChanges())
}

function getPublishCommands(): Array<{ point_id: number; value: number }> {
  const commands: Array<{ point_id: number; value: number }> = []
  Object.entries(publishValues.value).forEach(([key, val]) => {
    if (val !== '' && val !== null && val !== undefined) {
      const num = Number(val)
      if (Number.isFinite(num)) {
        commands.push({ point_id: Number(key), value: num })
      }
    }
  })
  return commands
}

function hasPublishChanges(): boolean {
  return getPublishCommands().length > 0
}

function resetPublish() {
  publishValues.value = {}
  notifyPublishChange()
}

// 暴露：获取当前副本数据、添加点
const getEditedData = () => editPoints.value
const addPoint = (point: PointInfo) => {
  editPoints.value.push({ ...point })
}

defineExpose({ getEditedData, addPoint, getPublishCommands, resetPublish, hasPublishChanges })
</script>

<style scoped lang="scss">
.voltage-class .point-table {
  .point-table__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.15rem;
    padding-bottom: 0.08rem;
    border-bottom: 0.01rem solid rgba(255, 255, 255, 0.1);

    .point-table__title {
      font-size: 0.14rem;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }
  }

  .point-table__content {
    // 设置表格单元格高度
    :deep(.el-table__body-wrapper) {
      td {
        .cell {
          min-height: 0.32rem;
        }
      }
    }

    .point-table__operation-cell {
      display: flex;

      gap: 0.08rem;
      align-items: center;

      .point-table__setting-btn,
      .point-table__delete-btn,
      .point-table__publish-btn {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.04rem;
        font-size: 0.12rem;
      }
    }
  }
}
</style>

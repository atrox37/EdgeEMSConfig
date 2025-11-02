<template>
  <div class="voltage-class rule-management__expand-content">
    <div class="rule-management__config-section">
      <div class="rule-management__config-header">
        <h3 class="rule-management__config-title">Configuration Information</h3>
        <div class="rule-management__config-actions">
          <template v-if="!isEditing">
            <el-button type="warning" @click="handleEnterEdit">
              <el-icon>
                <Plus />
              </el-icon>
              Edit
            </el-button>
          </template>
          <template v-else>
            <el-button
              v-if="activeTab === 'measurement'"
              type="primary"
              @click="handleAddMeasurement"
            >
              <el-icon>
                <Plus />
              </el-icon>
              Add measurement
            </el-button>
            <el-button v-if="activeTab === 'action'" type="primary" @click="handleAddAction">
              <el-icon>
                <Plus />
              </el-icon>
              Add action
            </el-button>
            <el-button type="warning" @click="handleCancelEdit"> Cancel </el-button>
            <el-button type="primary" @click="handleSubmitEdit"> Submit </el-button>
          </template>
        </div>
      </div>

      <!-- measurement Tab -->
      <el-tabs v-model="activeTab" class="rule-management__tabs">
        <el-tab-pane label="measurement" name="measurement">
          <div class="rule-management__table-container">
            <div v-if="!isEditing" class="rule-management__table-header">
              <IconButton
                type="warning"
                :icon="tableRefreshIcon"
                text="Reload Value"
                @click="handleMeasurementReload"
              />
            </div>
            <el-table
              :data="isEditing ? editMeasurementData : measurementData"
              class="rule-management__config-table"
              table-layout="fixed"
              align="center"
              header-align="center"
            >
              <el-table-column prop="id" label="ID" align="center" width="100" />
              <el-table-column prop="name" label="Name" align="center">
                <template #default="{ row: configRow, $index }">
                  <template v-if="isEditing">
                    <el-input
                      v-model="editMeasurementData[$index].name"
                      placeholder="Please enter name"
                      @change="
                        updateMeasurementData($index, 'name', editMeasurementData[$index].name)
                      "
                    />
                  </template>
                  <template v-else>
                    <span>{{ configRow.name }}</span>
                  </template>
                </template>
              </el-table-column>
              <el-table-column prop="value" label="Value" align="center">
                <template #default="{ row: configRow, $index }">
                  <template v-if="isEditing">
                    <el-input
                      v-model="editMeasurementData[$index].value"
                      placeholder="Please enter value"
                      @change="
                        updateMeasurementData($index, 'value', editMeasurementData[$index].value)
                      "
                    />
                  </template>
                  <template v-else>
                    <span>{{ configRow.value }}</span>
                  </template>
                </template>
              </el-table-column>
              <el-table-column label="Config" align="center">
                <template #default="{ row: configRow, $index }">
                  <div class="rule-management__config-cell">
                    <el-tag size="small" type="primary" class="rule-management__config-tag">
                      {{ getConfigDisplayText(configRow.config) }}
                    </el-tag>
                    <el-icon
                      class="rule-management__setting-icon"
                      @click="handleMeasurementSetting(configRow)"
                    >
                      <Setting />
                    </el-icon>
                  </div>
                </template>
              </el-table-column>
              <el-table-column v-if="isEditing" label="Operation" align="center" fixed="right">
                <template #default="{ $index }">
                  <div class="rule-management__delete-btn" @click="deleteMeasurement($index)">
                    <el-icon>
                      <Delete />
                    </el-icon>
                    <span>Delete</span>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- action Tab -->
        <el-tab-pane label="action" name="action">
          <div class="rule-management__table-container">
            <el-table
              :data="isEditing ? editActionData : actionData"
              class="rule-management__config-table"
              table-layout="fixed"
              align="center"
              header-align="center"
            >
              <el-table-column prop="id" label="ID" align="center" />
              <el-table-column prop="name" label="Name" align="center">
                <template #default="{ row: configRow, $index }">
                  <template v-if="isEditing">
                    <el-input
                      v-model="editActionData[$index].name"
                      placeholder="Please enter name"
                      @change="updateActionData($index, 'name', editActionData[$index].name)"
                    />
                  </template>
                  <template v-else>
                    <span>{{ configRow.name }}</span>
                  </template>
                </template>
              </el-table-column>
              <el-table-column label="Config" align="center">
                <template #default="{ row: configRow, $index }">
                  <div class="rule-management__config-cell">
                    <el-tag size="small" type="primary" class="rule-management__config-tag">
                      {{ getConfigDisplayText(configRow.config) }}
                    </el-tag>
                    <el-icon
                      class="rule-management__setting-icon"
                      @click="handleActionSetting(configRow)"
                    >
                      <Setting />
                    </el-icon>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="Operation" align="center">
                <template #default="{ row: configRow, $index }">
                  <template v-if="isEditing">
                    <div class="rule-management__delete-btn" @click="deleteAction($index)">
                      <el-icon>
                        <Delete />
                      </el-icon>
                      <span>Delete</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="rule-management__publish-btn" @click="handlePublish(configRow)">
                      <el-icon><Position /></el-icon>
                      <span>Publish</span>
                    </div>
                  </template>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Setting, Delete, Position } from '@element-plus/icons-vue'
import tableRefreshIcon from '@/assets/icons/table-refresh.svg'
import type { MeasurementConfig, ActionConfig } from '@/types/deviceConfiguration'

// Props
interface Props {
  instanceId: number
  measurementData: MeasurementConfig[]
  actionData: ActionConfig[]
  isEditing: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'enter-edit': []
  'cancel-edit': []
  'submit-edit': []
  'add-measurement': []
  'add-action': []
  'update-measurement': [index: number, field: string, value: any]
  'update-action': [index: number, field: string, value: any]
  'delete-measurement': [index: number]
  'delete-action': [index: number]
  'measurement-reload': []
  'measurement-setting': [configRow: MeasurementConfig]
  'action-setting': [configRow: ActionConfig]
  publish: [configRow: ActionConfig]
}>()

// 每个实例独立的 tab 状态
const activeTab = ref('measurement')

// 编辑数据副本
const editMeasurementData = ref<MeasurementConfig[]>([])
const editActionData = ref<ActionConfig[]>([])

// 监听 props 变化，创建编辑数据副本
watch(
  () => props.isEditing,
  (newVal) => {
    if (newVal) {
      editMeasurementData.value = props.measurementData.map((item) => ({ ...item }))
      editActionData.value = props.actionData.map((item) => ({ ...item }))
    } else {
      editMeasurementData.value = []
      editActionData.value = []
    }
  },
  { immediate: true },
)

// 获取配置显示文本
const getConfigDisplayText = (config: any) => {
  if (!config || !config.channelName) {
    return 'Not Configured'
  }

  const channelType = config.channelType || ''
  const point = config.point || ''

  if (channelType && point) {
    return `${config.channelName}/${channelType}/${point}`
  } else if (channelType) {
    return `${config.channelName}/${channelType}`
  } else {
    return config.channelName
  }
}

// 事件处理方法
const handleEnterEdit = () => {
  emit('enter-edit')
}

const handleCancelEdit = () => {
  emit('cancel-edit')
}

const handleSubmitEdit = () => {
  emit('submit-edit')
}

const handleAddMeasurement = () => {
  emit('add-measurement')
}

const handleAddAction = () => {
  emit('add-action')
}

const updateMeasurementData = (index: number, field: string, value: any) => {
  emit('update-measurement', index, field, value)
}

const updateActionData = (index: number, field: string, value: any) => {
  emit('update-action', index, field, value)
}

const deleteMeasurement = async (index: number) => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this measurement?',
      'Confirm delete',
      {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning',
      },
    )
    emit('delete-measurement', index)
    ElMessage.success('measurement deleted successfully')
  } catch {
    // 用户取消删除
  }
}

const deleteAction = async (index: number) => {
  try {
    await ElMessageBox.confirm('Are you sure you want to delete this action?', 'Confirm delete', {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
    emit('delete-action', index)
    ElMessage.success('action deleted successfully')
  } catch {
    // 用户取消删除
  }
}

const handleMeasurementReload = () => {
  emit('measurement-reload')
}

const handleMeasurementSetting = (configRow: MeasurementConfig) => {
  emit('measurement-setting', configRow)
}

const handleActionSetting = (configRow: ActionConfig) => {
  emit('action-setting', configRow)
}

const handlePublish = (configRow: ActionConfig) => {
  emit('publish', configRow)
}
</script>

<style scoped lang="scss">
.voltage-class .rule-management__expand-content {
  padding: 0.2rem;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 0.04rem;
  margin: 0.1rem 0;

  .rule-management__config-section {
    .rule-management__config-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.15rem;
      padding-bottom: 0.08rem;
      border-bottom: 0.01rem solid rgba(255, 255, 255, 0.1);

      .rule-management__config-title {
        font-size: 0.16rem;
        font-weight: 600;
        color: #fff;
        margin: 0;
      }

      .rule-management__config-actions {
        display: flex;
        gap: 0.08rem;
      }
    }

    .rule-management__tabs {
      .el-tabs__content {
        padding: 0.1rem 0;
      }
    }

    .rule-management__table-container {
      .rule-management__table-header {
        display: flex;
        justify-content: flex-end;
        padding-bottom: 0.1rem;
      }

      .rule-management__config-table {
        // 设置表格单元格高度
        :deep(.el-table__body-wrapper) {
          td {
            .cell {
              min-height: 0.32rem;
            }
          }
        }

        .rule-management__config-cell {
          display: flex;
          align-items: center;
          gap: 0.08rem;
          justify-content: center;

          .rule-management__config-tag {
            flex-shrink: 0;
            word-break: break-all;
            text-align: center;
            line-height: 1.2;
          }

          .rule-management__setting-icon {
            cursor: pointer;
            font-size: 0.16rem;

            &:hover {
              // color: #66b1ff;
            }
          }
        }

        .rule-management__delete-btn {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.04rem;

          &:hover {
            // color: #f78989;
          }

          .el-icon {
            font-size: 0.14rem;
          }
        }

        .rule-management__publish-btn {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.04rem;

          &:hover {
            // color: #85ce61;
          }

          .el-icon {
            font-size: 0.14rem;
          }
        }
      }
    }
  }
}
</style>

<template>
  <div class="voltage-class rule-management" ref="ruleManagementRef">
    <LoadingBg :loading="loading">
      <div class="rule-management__header">
        <div class="rule-management__search-form" ref="levelSelectRef">
          <!-- 宽屏模式：显示完整筛选表单 -->
          <el-form
            v-if="!isFilterCollapsed"
            :model="filters"
            :inline="true"
            class="test-form"
          >
            <el-form-item label="Protocol:">
              <el-select
                v-model="filters.protocol"
                placeholder="select protocol"
                clearable
              >
                <el-option
                  v-for="option in PROTOCOL_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Enabled:">
              <el-select
                v-model="filters.enabled"
                placeholder="select enabled status"
                clearable
              >
                <el-option label="Enabled" :value="true" />
                <el-option label="Disabled" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item label="Connected:">
              <el-select
                v-model="filters.connected"
                placeholder="select connected status"
                clearable
              >
                <el-option label="Connected" :value="true" />
                <el-option label="Disconnected" :value="false" />
              </el-select>
            </el-form-item>
          </el-form>

          <!-- 窄屏模式：Filter 按钮 + 筛选标签 -->
          <div v-else class="filter-compact">
            <el-dropdown trigger="click" :teleported="false">
              <el-button class="filter-button">
                <el-icon style="margin-right: 6px"><Filter /></el-icon>
                Filter
              </el-button>
              <template #dropdown>
                <el-dropdown-menu class="filter-dropdown">
                  <div class="filter-dropdown__content">
                    <el-form :model="filters" label-position="top">
                      <el-form-item label="Protocol:">
                        <el-select
                          v-model="filters.protocol"
                          placeholder="select protocol"
                          clearable
                          style="width: 100%"
                        >
                          <el-option
                            v-for="option in PROTOCOL_OPTIONS"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                          />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="Enabled:">
                        <el-select
                          v-model="filters.enabled"
                          placeholder="select enabled status"
                          clearable
                          style="width: 100%"
                        >
                          <el-option label="Enabled" :value="true" />
                          <el-option label="Disabled" :value="false" />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="Connected:">
                        <el-select
                          v-model="filters.connected"
                          placeholder="select connected status"
                          clearable
                          style="width: 100%"
                        >
                          <el-option label="Connected" :value="true" />
                          <el-option label="Disconnected" :value="false" />
                        </el-select>
                      </el-form-item>
                    </el-form>
                  </div>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <!-- 已选筛选标签 -->
            <div class="filter-tags">
              <el-tag
                v-if="filters.protocol"
                closable
                @close="filters.protocol = ''"
                class="filter-tag"
              >
                Protocol: {{ filters.protocol }}
              </el-tag>
              <el-tag
                v-if="filters.enabled !== null"
                closable
                @close="filters.enabled = null"
                class="filter-tag"
              >
                Enabled: {{ filters.enabled ? 'Yes' : 'No' }}
              </el-tag>
              <el-tag
                v-if="filters.connected !== null"
                closable
                @close="filters.connected = null"
                class="filter-tag"
              >
                Connected: {{ filters.connected ? 'Yes' : 'No' }}
              </el-tag>
            </div>
          </div>

          <div class="form-oprations">
            <IconButton
              type="warning"
              :icon="tableRefreshIcon"
              text="Reload"
              custom-class="rule-management__btn"
              @click="handleRefresh"
            />
            <IconButton
              type="primary"
              :icon="tableSearchIcon"
              text="Search"
              custom-class="rule-management__btn"
              @click="handleSearch"
            />
            <IconButton
              type="primary"
              :icon="userAddIcon"
              text="New Channel"
              custom-class="rule-management__btn"
              @click="addChannel"
            />
          </div>
        </div>
        <div class="rule-management__table-operations"></div>
      </div>
      <div class="rule-management__table">
        <el-table
          :data="tableData"
          class="rule-management__table-content"
          align="left"
          
        >
          <el-table-column prop="id" label="ID" show-overflow-tooltip width="100" />
          <el-table-column prop="name" label="Name" min-width="200" show-overflow-tooltip />
          <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ row.description || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="protocol" label="Protocol" show-overflow-tooltip width="140" />
          <el-table-column prop="enabled" label="Enabled" width="120">
            <template #default="{ row, $index }">
              <el-switch
                v-model="row.enabled"
                @change="handleEnabledChange($event as boolean, row, $index)"
                :loading="channelControlLoadings[$index][0]"
              />
            </template>
          </el-table-column>
          <el-table-column prop="connected" label="Connected" width="140">
            <template #default="{ row }">
              <span
                :style="{
                  color: row.connected ? '#67C23A' : '#F56C6C',
                  fontWeight: '500',
                }"
              >
                {{ row.connected ? 'Connected' : 'Disconnected' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="error_count" label="Error Count" width="140" />
          <el-table-column label="Operation" fixed="right" :width="isNarrow ? 140 : 380">
            <template #default="{ row }">
              <OperationDropdown @command="(cmd) => handleOperationCommand(cmd, row)">
                <!-- 宽屏：显示所有按钮 -->
                <template #buttons>
                  <div class="rule-management__operation">
                    <div class="rule-management__operation-item" @click="handleDetail(row)">
                      <img :src="tableEditIcon" />
                      <span class="rule-management__operation-text">Detail</span>
                    </div>
                    <div class="rule-management__operation-item" @click="handlePointsTables(row)">
                      <img :src="tableEditIcon" />
                      <span class="rule-management__operation-text">Points</span>
                    </div>
                    <div class="rule-management__operation-item" @click="handleMappings(row)">
                      <img :src="tableEditIcon" />
                      <span class="rule-management__operation-text">Mappings</span>
                    </div>
                    <div
                      class="rule-management__operation-item"
                      @click="
                        deleteRow(
                          row.id,
                          `Are you sure you want to delete channel ${row.name}?`,
                          ruleManagementRef,
                        )
                      "
                    >
                      <img :src="tableDeleteIcon" />
                      <span class="rule-management__operation-text">Delete</span>
                    </div>
                  </div>
                </template>

                <!-- 窄屏：下拉菜单项 -->
                <template #dropdown>
                  <el-dropdown-item command="detail">
                    <img :src="tableEditIcon" />
                    Detail
                  </el-dropdown-item>
                  <el-dropdown-item command="points">
                    <img :src="tableEditIcon" />
                    Points
                  </el-dropdown-item>
                  <el-dropdown-item command="mappings">
                    <img :src="tableEditIcon" />
                    Mappings
                  </el-dropdown-item>
                  <el-dropdown-item command="delete">
                    <img :src="tableDeleteIcon" />
                    Delete
                  </el-dropdown-item>
                </template>
              </OperationDropdown>
            </template>
          </el-table-column>
        </el-table>

        <div class="rule-management__pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </LoadingBg>
    <ChannelDetailDialog
      ref="ChannelDetailDialogRef"
      @submit="fetchTableData"
      @cancel="handleChannelDetailCancel"
    />

    <!-- Points Tables 对话框 -->
    <PointsTablesDialog ref="PointsTablesDialogRef" />
    <!-- Mappings 对话框 -->
    <MappingsDialog ref="MappingsDialogRef" />
  </div>
</template>

<script setup lang="ts">
// 正确引入SVG图标，避免部署后图片加载不出�?
import tableRefreshIcon from '@/assets/icons/table-refresh.svg'
import tableSearchIcon from '@/assets/icons/table-search.svg'
import userAddIcon from '@/assets/icons/user-add.svg'
import tableEditIcon from '@/assets/icons/table-edit.svg'
import tableDeleteIcon from '@/assets/icons/table-delect.svg'
import ChannelDetailDialog from './ChannelDetailDialog.vue'
import PointsTablesDialog from './PointsTablesDialog.vue'
import MappingsDialog from './MappingsDialog.vue'
import OperationDropdown from '@/components/common/OperationDropdown.vue'
import { ChangeChannelEnabled } from '@/api/channelsManagement'
import type { ChannelListItem, ChannelDetail, PointInfo } from '@/types/channelConfiguration'
import { PROTOCOL_OPTIONS } from '@/types/channelConfiguration'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Filter } from '@element-plus/icons-vue'

import { useTableData, type TableConfig } from '@/composables/useTableData'
import { useResponsive } from '@/composables/useResponsive'

const tableConfig: TableConfig = {
  listUrl: '/comApi/api/channels',
  deleteUrl: '/comApi/api/channels/{id}',
  defaultPageSize: 20,
}
const {
  loading,
  tableData,
  pagination,
  handlePageSizeChange,
  fetchTableData,
  filters,
  handlePageChange,
  deleteRow,
} = useTableData<ChannelListItem>(tableConfig)

filters.productName = ''
filters.enabled = null
filters.connected = null

// 使用响应式监听
const { isNarrow, isFilterCollapsed } = useResponsive()

const levelSelectRef = ref<HTMLElement | null>(null)
const ChannelDetailDialogRef = ref()
const PointsTablesDialogRef = ref()
const MappingsDialogRef = ref()
const ruleManagementRef = ref<HTMLElement | null>(null)
// 展开行控制
const expandedRows = ref<number[]>([])
// 编辑状态管理 - 每个通道独立的编辑状态
const editingChannels = ref<Set<number>>(new Set())
const editPointsData = ref<Record<number, Record<string, PointInfo[]>>>({})

// 点位数据存储
const pointsData = ref<Record<number, Record<string, PointInfo[]>>>({})

// 每个通道的 tab 状态
const channelTabs = ref<Record<number, string>>({})

const channelControlLoadings = ref<boolean[][]>([])
// 检查特定通道是否在编辑状态
const isChannelEditing = (channelId: number) => {
  return editingChannels.value.has(channelId)
}

// 获取通道的活跃 tab
const getActiveTab = (channelId: number) => {
  if (!channelTabs.value[channelId]) {
    channelTabs.value[channelId] = 'telemetry'
  }
  return channelTabs.value[channelId]
}

// 设置通道的活跃 tab
const setActiveTab = (channelId: number, tabName: string) => {
  channelTabs.value[channelId] = tabName
}

// Points Tables 对话框相关数据
const currentChannelId = ref<number>(0)

watch(
  tableData,
  (newVal) => {
    // 只有当数组长度发生变化时才更新loading状态，避免不必要的更新
    if (channelControlLoadings.value.length !== newVal.length) {
      channelControlLoadings.value = newVal.map(() => [false, false])
    }
  },
  { deep: false },
)

// 查看详情
const handleDetail = (row: ChannelListItem) => {
  ChannelDetailDialogRef.value?.open(row.id)
}

// 添加通道
const addChannel = () => {
  ChannelDetailDialogRef.value?.open()
}

// 处理 Points Tables
const handlePointsTables = (row: ChannelListItem) => {
  currentChannelId.value = row.id as number
  PointsTablesDialogRef.value?.open(row.id as number, row.name, row.protocol)
}

// 打开 Mappings 对话框
const handleMappings = (row: ChannelListItem) => {
  currentChannelId.value = row.id as number
  MappingsDialogRef.value?.open(row.id, row.protocol)
}

// 删除通道
const handleDelete = async (row: ChannelListItem) => {
  if (!ruleManagementRef.value) return
  ElMessageBox.confirm(
    `Are you sure you want to delete channel "${row.name}"?`,
    'Delete Confirmation',
    {
      appendTo: ruleManagementRef.value,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning',
    },
  ).then(async () => {
    await deleteRow(row.id as number)
  })
}

// 处理启用状态变化
const handleEnabledChange = async (state: boolean, row: ChannelListItem, index: number) => {
  channelControlLoadings.value[index][0] = true
  row.enabled = !state
  try {
    const res = await ChangeChannelEnabled(row.id as number, state)
    if (res.success) {
      // 更新成功后刷新数据，而不是直接修改row
      await fetchTableData()
    } else {
      // 如果失败，恢复原状态
      row.enabled = !state
    }
  } catch (error) {
    // 发生错误时恢复原状态
    row.enabled = !state
    ElMessage.error(error as string)
  } finally {
    channelControlLoadings.value[index][0] = false
  }
}

const handleRefresh = () => {
  filters.protocol = ''
  filters.enabled = null
  filters.connected = null
  fetchTableData(true)
}

const handleSearch = () => {
  fetchTableData(true)
}

// // 控制通道状态
// const handleControl = (row: ChannelListItem, operation: 'start' | 'stop' | 'restart') => {
//   controlChannelStatus(row.id as number, operation)
// }

// 通道详情弹窗提交
const handleChannelDetailSubmit = (data: ChannelDetail) => {
  console.log('Channel detail submitted:', data)
}

// 通道详情弹窗取消
const handleChannelDetailCancel = () => {
  console.log('Channel detail cancelled')
}

// 处理操作下拉菜单命令
const handleOperationCommand = (command: string, row: ChannelListItem) => {
  switch (command) {
    case 'detail':
      handleDetail(row)
      break
    case 'points':
      handlePointsTables(row)
      break
    case 'mappings':
      handleMappings(row)
      break
    case 'delete':
      if(row.id) {
      deleteRow(
        row.id,
          `Are you sure you want to delete channel ${row.name}?`,
          ruleManagementRef.value,
        )
      }
      break
  }
}
</script>

<style scoped lang="scss">
.voltage-class .rule-management {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  .rule-management__header {
    margin-bottom: 20px;

    .rule-management__search-form {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;

      :deep(.el-form-item) {
        margin-bottom: 0;
      }

      .form-oprations {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      // 窄屏筛选样式
      .filter-compact {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        flex: 1;

        .filter-button {
          display: flex;
          align-items: center;
        }

        .filter-tags {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          .filter-tag {
            font-size: 12px;
            height: 24px;
            line-height: 24px;
          }
        }
      }
    }

    .rule-management__table-operations {
      width: 100%;
      //   padding-top: 20px;
      //   border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .rule-management__btn {
      display: flex;
      align-items: center;
      gap: 8px;

      .rule-management__btn-icon {
        width: 14px;
        height: 14px;
        margin-right: 8px;
      }
    }
  }

  .rule-management__table {
    // height: calc(100% - px);
    flex: 1;
    // max-width: 1660px;
    display: flex;
    flex-direction: column;

    .rule-management__table-content {
      flex: 1;
      overflow-y: auto;

      .rule-management__operation {
        display: flex;
        align-items: center;
        gap: 20px;
        .position-relative {
          position: relative;
        }
        .rule-management__operation-item {
          cursor: pointer;
          display: flex;
          align-items: center;

          img {
            width: 14px;
            height: 14px;
            margin-right: 4px;
            object-fit: contain;
          }
          .rule-management__operation-text {
            font-size: 14px;
            color: #fff;
          }
        }
      }

      .rule-management__table-icon {
        width: 46px;
        height: 20px;
        object-fit: contain;
      }
    }

    .rule-management__pagination {
      display: flex;
      justify-content: flex-end;
      // margin: 20px 0;
    }
  }

  .rule-management__expand-content {
    .rule-management__edit-controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      .el-button {
        display: flex;
        align-items: center;
        font-size: 14px;
        padding: 8px 16px;
        border-radius: 4px;

        img {
          width: 14px;
          height: 14px;
          margin-right: 4px;
          object-fit: contain;
        }
      }
    }
  }
  :deep(.el-table__body-wrapper td .cell) {
    overflow: visible;
    position: relative;
    z-index: 100;
  }
}

// 筛选下拉框样式
:deep(.filter-dropdown) {
  .filter-dropdown__content {
    padding: 0 16px;
    min-width: 280px;

    .el-form-item {
      margin-bottom: 16px !important;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .el-form-item__label {
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 4px !important;
    }
  }
}
</style>

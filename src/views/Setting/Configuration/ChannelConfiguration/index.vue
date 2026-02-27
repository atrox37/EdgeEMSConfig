<template>
  <div class="voltage-class rule-management" ref="ruleManagementRef">
    <div class="rule-management__header">
      <h2 class="rule-management__title">Channel Config</h2>
    </div>
    <div class="rule-management__content">
      <div class="rule-management__search-form" ref="levelSelectRef">
        <!-- 移动端：筛选按钮和筛选标?-->
        <div class="rule-management__filters-mobile">
          <div class="rule-management__filter-trigger-wrapper" ref="filterTriggerRef">
            <el-popover v-model:visible="showFilterPopover" placement="bottom-start" :width="300" trigger="click"
              :teleported="false">
              <template #reference>
                <IconButton type="primary" :icon="tableSearchIcon" text="Filter"
                  custom-class="rule-management__btn rule-management__filter-btn" />
              </template>
              <el-form :model="filters" label-width="100px" class="rule-management__filter-form">
                <el-form-item label="Protocol:" class="rule-management__filter-form-item">
                  <el-select v-model="filters.protocol" placeholder="select protocol" clearable style="width: 100%"
                    @change="handleFilterChange('protocol', filters.protocol)">
                    <el-option v-for="option in PROTOCOL_OPTIONS" :key="option.value" :label="option.label"
                      :value="option.value" />
                  </el-select>
                </el-form-item>
                <el-form-item label="Enabled:" class="rule-management__filter-form-item">
                  <el-select v-model="filters.enabled" placeholder="select enabled status" clearable style="width: 100%"
                    @change="handleFilterChange()">
                    <el-option label="Enabled" :value="true" />
                    <el-option label="Disabled" :value="false" />
                  </el-select>
                </el-form-item>
                <el-form-item label="Connected:" class="rule-management__filter-form-item-last">
                  <el-select v-model="filters.connected" placeholder="select connected status" clearable
                    style="width: 100%" @change="handleFilterChange()">
                    <el-option label="Connected" :value="true" />
                    <el-option label="Disconnected" :value="false" />
                  </el-select>
                </el-form-item>
                <div style="text-align: right; margin-top: 12px;">
                  <el-button size="small" @click="showFilterPopover = false">Close</el-button>
                  <el-button type="primary" size="small" @click="applyFilters">Apply</el-button>
                </div>
              </el-form>
            </el-popover>
            <!-- 筛选标�?-->
            <div class="rule-management__filter-tags">
              <el-tag v-for="tag in activeFilterTags" :key="tag.key" closable @close="removeFilterTag(tag.key)"
                class="rule-management__filter-tag">
                {{ tag.value }}
              </el-tag>
            </div>
          </div>
        </div>
        <!-- 桌面端：显示筛选框 -->
        <el-form :model="filters" :inline="true" class="test-form rule-management__filters-desktop">
          <el-form-item label="Protocol:">
            <el-select v-model="filters.protocol" placeholder="select protocol" :teleported="false" clearable
              @change="handleDesktopFilterChange('protocol', filters.protocol)">
              <el-option v-for="option in PROTOCOL_OPTIONS" :key="option.value" :label="option.label"
                :value="option.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="Enabled:">
            <el-select v-model="filters.enabled" placeholder="select enabled status" clearable :teleported="false"
              :fit-input-width="true" @change="handleDesktopFilterChange('enabled', filters.enabled)">
              <el-option label="Enabled" :value="true" />
              <el-option label="Disabled" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item label="Connected:">
            <el-select v-model="filters.connected" placeholder="select connected status" clearable
              :fit-input-width="true" :teleported="false"
              @change="handleDesktopFilterChange('connected', filters.connected)">
              <el-option label="Connected" :value="true" />
              <el-option label="Disconnected" :value="false" />
            </el-select>
          </el-form-item>
        </el-form>
        <div class="rule-management__reload-icon" @click="handleReload">
          <img :src="tableRefreshIcon" alt="Reload" />
        </div>



      </div>
      <div class="rule-management__table">
        <el-table v-loading="loading" :data="tableData" class="rule-management__table-content" align="left"
          :expand-row-keys="expandedRows.map(String)" row-key="id">
          <el-table-column prop="id" label="ID" min-width="80" />
          <el-table-column prop="name" label="Name" min-width="160" show-overflow-tooltip />
          <el-table-column prop="description" label="Description" show-overflow-tooltip min-width="200">
            <template #default="{ row }">
              <span>{{ row.description || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="protocol" label="Protocol" min-width="140" show-overflow-tooltip />
          <el-table-column prop="enabled" label="Enabled" min-width="100">
            <template #default="{ row, $index }">
              <el-switch :model-value="row.enabled" @change="val => handleEnabledChange(!!val, row, $index)"
                :loading="channelControlLoadings[$index][0]" />
            </template>
          </el-table-column>
          <el-table-column prop="connected" label="Connected" min-width="130">
            <template #default="{ row }">
              <span :style="{
                color: row.connected ? '#67C23A' : '#F56C6C',
                fontWeight: '500',
              }">
                {{ row.connected ? 'Connected' : 'Disconnected' }}
              </span>
            </template>
          </el-table-column>
          <!-- <el-table-column prop="error_count" label="Error Count" /> -->
          <el-table-column min-width="330" fixed="right">
            <template #header>
              <IconButton type="primary" :icon="userAddIcon" text="New"
                custom-class="rule-management__btn rule-management__table-header-btn" @click="addChannel" />
            </template>
            <template #default="{ row }">
              <div class="rule-management__operation">
                <div class="rule-management__operation-item" @click="handleDetail(row)">
                  <img :src="buttonDetailIcon" />
                  <span class="rule-management__operation-text">Detail</span>
                </div>
                <div class="rule-management__operation-item" @click="handlePointsTables(row)">
                  <img :src="buttonPointsIcon" />
                  <span class="rule-management__operation-text">Points/Mappings</span>
                </div>
                <!-- <div class="rule-management__operation-item" @click="handleMappings(row)">
                  <img :src="tableEditIcon" />
                  <span class="rule-management__operation-text">Mappings</span>
                </div> -->
                <div class="rule-management__operation-item" @click="
                  deleteRow(
                    row.id,
                    `Are you sure you want to delete channel ${row.name}?`,
                    ruleManagementRef,
                  )
                  ">
                  <img :src="tableDeleteIcon" />
                  <span class="rule-management__operation-text">Delete</span>
                </div>

                <!-- <el-dropdown
                  trigger="click"
                  placement="bottom"
                  :show-arrow="false"
                  :teleported="false"
                >
                  <div class="rule-management__operation-item">
                    <img :src="tableDeleteIcon" />
                    <span class="rule-management__operation-text">control</span>
                  </div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="handleControl(row, 'start')"
                        >Start</el-dropdown-item
                      >
                      <el-dropdown-item @click="handleControl(row, 'stop')">Stop</el-dropdown-item>
                      <el-dropdown-item @click="handleControl(row, 'restart')"
                        >Restart</el-dropdown-item
                      >
                    </el-dropdown-menu>
                  </template>
      </el-dropdown> -->
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="rule-management__pagination">
          <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]" :total="pagination.total" :teleported="false"
            layout="total, sizes, prev, pager, next" @size-change="handlePageSizeChange"
            @current-change="handlePageChange" />
        </div>
      </div>
    </div>
    <ChannelDetailDialog
      ref="channelDetailDialogRef"
      @submit="handleChannelDialogSubmit"
      @cancel="handleChannelDialogCancel"
    />
  </div>
</template>

<script setup lang="ts">
// 正确引入SVG图标，避免部署后图片加载不出�?
import tableRefreshIcon from '@/assets/icons/table-refresh.svg'
import tableSearchIcon from '@/assets/icons/table-search.svg'
import userAddIcon from '@/assets/icons/user-add.svg'
import tableDeleteIcon from '@/assets/icons/table-delect.svg'
import buttonDetailIcon from '@/assets/icons/button-detail.svg'
import buttonPointsIcon from '@/assets/icons/button-point.svg'
import { ChangeChannelEnabled } from '@/api/channelsManagement'
import type { ChannelListItem } from '@/types/channelConfiguration'
import { PROTOCOL_OPTIONS } from '@/types/channelConfiguration'
import { ElMessage } from 'element-plus'
import { useTableData, type TableConfig } from '@/composables/useTableData'
import { useRouter } from 'vue-router'
import ChannelDetailDialog from '@/views/Setting/Configuration/ChannelConfiguration/components/ChannelDetailDialog.vue'

const router = useRouter()
const channelDetailDialogRef = ref<InstanceType<typeof ChannelDetailDialog> | null>(null)

const tableConfig: TableConfig = {
  listUrl: '/comApi/api/channels', // 使用 /comApi 前缀
  deleteUrl: '/comApi/api/channels/{id}', // 使用 /comApi 前缀
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
  reloadFilters,
} = useTableData<ChannelListItem>(tableConfig)

filters.productName = ''
filters.protocol = null
filters.enabled = null
filters.connected = null
const ruleManagementRef = ref<HTMLElement | null>(null)
const showFilterPopover = ref(false)

// 筛选标签管�?
interface FilterTag {
  key: string
  label: string
  value: string | boolean | null
}

const activeFilterTags = ref<FilterTag[]>([])

// 更新筛选标�?
const updateFilterTags = () => {
  activeFilterTags.value = []
  if (filters.protocol !== null && filters.protocol !== undefined && filters.protocol !== '') {
    const option = PROTOCOL_OPTIONS.find(opt => opt.value === filters.protocol)
    activeFilterTags.value.push({
      key: 'protocol',
      label: 'Protocol',
      value: option?.label || filters.protocol,
    })
  }
  if (filters.enabled !== null && filters.enabled !== undefined) {
    activeFilterTags.value.push({
      key: 'enabled',
      label: 'Enabled',
      value: filters.enabled ? 'Enabled' : 'Disabled',
    })
  }
  if (filters.connected !== null && filters.connected !== undefined) {
    activeFilterTags.value.push({
      key: 'connected',
      label: 'Connected',
      value: filters.connected ? 'Connected' : 'Disconnected',
    })
  }
}

// 防抖定时器
let debounceTimer: any = null

// 处理筛选变�?（移动端）
const handleFilterChange = (_key?: string, _value?: any) => {
  updateFilterTags()
}

// 处理桌面端筛选变化（带防抖）
const handleDesktopFilterChange = (_key?: string, _value?: any) => {
  updateFilterTags()
  // 清除之前的定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  // 设置新的定时器，500ms后执行
  debounceTimer = setTimeout(() => {
    fetchTableData(true)
  }, 500)
}

// 初始化页面，重新发起所有请求（reloadFilters 内部已调用 fetchTableData，避免重复请求）
const handleReload = () => {
  reloadFilters()
}

// 移除筛选标�?
const removeFilterTag = (key: string) => {
  if (key === 'protocol') {
    filters.protocol = null
  } else if (key === 'enabled') {
    filters.enabled = null
  } else if (key === 'connected') {
    filters.connected = null
  }
  updateFilterTags()
  fetchTableData(true)
}

// 应用筛�?
const applyFilters = () => {
  updateFilterTags()
  showFilterPopover.value = false
  fetchTableData(true)
}

// 监听筛选变�?
watch([() => filters.protocol, () => filters.enabled, () => filters.connected], () => {
  updateFilterTags()
}, { deep: true })
// 展开行控�?
const expandedRows = ref<number[]>([])

const channelControlLoadings = ref<boolean[][]>([])

// Points Tables 对话框相关数�?
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
  channelDetailDialogRef.value?.open(row.id)
}

// 添加通道
const addChannel = () => {
  channelDetailDialogRef.value?.open(undefined)
}

// 处理 Points Tables
const handlePointsTables = (row: ChannelListItem) => {
  router.push({
    path: '/channelConfiguration/pointsTables',
    query: {
      id: row.id,
      name: row.name,
      protocol: row.protocol,
    },
  })
}

// 处理启用状态变�?
const handleEnabledChange = async (newState: boolean, row: ChannelListItem, index: number) => {
  channelControlLoadings.value[index][0] = true
  const originalState = row.enabled
  row.enabled = newState
  try {
    const res = await ChangeChannelEnabled(row.id as number, newState)
    if (res.success) {
      // 更新成功后刷新数据，而不是直接修改row
      await fetchTableData()
    } else {
      // 如果失败，恢复原状�?
      row.enabled = originalState
    }
  } catch (error) {
    // 发生错误时恢复原状�?
    row.enabled = originalState
    ElMessage.error(error as string)
  } finally {
    channelControlLoadings.value[index][0] = false
  }
}

const handleChannelDialogSubmit = () => {
  fetchTableData(true)
}

const handleChannelDialogCancel = () => {
  // 取消时不做额外处理，保持列表状态
}

</script>

<style scoped lang="scss">
.voltage-class .rule-management {
  // position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;


  .rule-management__header {
    margin-bottom: 24px;

    .rule-management__title {
      font-size: $font-size-large;
      font-weight: $font-weight-semibold;
      color: $text-color-primary;
      margin: 0;
    }
  }

  .rule-management__content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;

    .rule-management__search-form {
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;

      //   padding-bottom: 20px;
      :deep(.el-form-item) {
        margin-bottom: 0;
      }

      .form-oprations {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;

        &__row {
          display: flex;
          align-items: flex-start;
          gap: 10px;

          .rule-management__divider {
            align-self: stretch;
            margin: 0 8px;
          }
        }
      }

      // 桌面端筛选框
      .rule-management__filters-desktop {
        display: flex;
        flex: 1;
        min-width: 0;
        align-items: center;
      }

      .rule-management__reload-icon {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        transition: opacity 0.2s;

        &:hover {
          opacity: 0.7;
        }

        img {
          width: 32px;
          height: 32px;
          // 主题色 rgba(255, 105, 0, 1)
          filter: brightness(0) saturate(100%) invert(48%) sepia(100%) saturate(7498%) hue-rotate(1deg) brightness(102%) contrast(101%);
        }
      }

      // 移动端筛选按钮和标签
      .rule-management__filters-mobile {
        display: none;
        flex: 1;
        min-width: 0;
      }

      .rule-management__filter-trigger-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .rule-management__filter-tags {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .rule-management__filter-tag {
        margin: 0;
        padding: 6px 12px;
        font-size: 14px;
        background-color: rgba(3, 59, 108, 0.3);
        color: #ffffff;
        border: none;

        :deep(.el-tag__close) {
          color: #ffffff;

          &:hover {
            background-color: rgba(255, 255, 255, 0.2);
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

    // 筛选弹出框样式
    :deep(.el-popover) {
      background-color: #f5f5f5 !important;

      .rule-management__filter-form {
        .rule-management__filter-form-item {
          margin-bottom: 16px;
        }

        .rule-management__filter-form-item-last {
          margin-bottom: 0;
        }
      }
    }
  }

  .rule-management__table {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .rule-management__table-content {
      flex: 1;
      overflow-y: auto;
      min-height: 0;

      :deep(.el-table-fixed-column--right) {
        background-color: #d3dde7 !important;
      }

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
            color: #000000;
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
}

// 媒体查询：小�?200px时隐藏桌面端筛选框，显示移动端筛选按�?
@media (max-width: 1059px) {
  .voltage-class .rule-management {
    .rule-management__content {
      .rule-management__search-form {
        .rule-management__filters-desktop {
          display: none;
        }

        .rule-management__filters-mobile {
          display: flex;
        }
      }
    }
  }
}

// 媒体查询：大于等�?200px时显示桌面端筛选框，隐藏移动端筛选按�?
@media (min-width: 1060px) {
  .voltage-class .rule-management {
    .rule-management__content {
      .rule-management__search-form {
        .rule-management__filters-desktop {
          display: flex;
        }

        .rule-management__filters-mobile {
          display: none;
        }
      }
    }
  }
}
</style>

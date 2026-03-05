<template>
  <div class="voltage-class rule-management" ref="ruleManagementRef">
    <div class="rule-management__header">
      <h2 class="rule-management__title">Model Config</h2>
    </div>
    <div class="rule-management__content">
      <div class="rule-management__search-form" ref="levelSelectRef">
        <!-- 桌面端：显示筛选框 -->
        <el-form :model="filters" :inline="true" class="test-form rule-management__filters-desktop">
          <el-form-item label="Product Name:">
            <el-select v-model="filters.product_name" :fit-input-width="true" placeholder="Select product name" clearable filterable
              :append-to="levelSelectRef || undefined"
              @change="handleDesktopFilterChange('product_name', filters.product_name)">
              <el-option v-for="opt in productOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-form>
        <!-- 
        <div class="rule-management__filters-mobile">
          <div class="rule-management__filter-trigger-wrapper" ref="filterTriggerRef">
            <el-popover v-model:visible="showFilterPopover" placement="bottom-start" :width="300" trigger="click"
              :teleported="false">
              <template #reference>
                <IconButton type="primary" :icon="tableSearchIcon" text="Filter"
                  custom-class="rule-management__btn rule-management__filter-btn" />
              </template>
<el-form :model="filters" label-width="120px" class="rule-management__filter-form">
  <el-form-item label="productName:" class="rule-management__filter-form-item-last">
    <el-select v-model="filters.product_name" :fit-input-width="true" placeholder="Please select productName" clearable filterable
      style="width: 100%" @change="handleFilterChange()">
      <el-option v-for="opt in productOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
    </el-select>
  </el-form-item>
  <div style="text-align: right; margin-top: 12px;">
    <el-button size="small" @click="showFilterPopover = false">Close</el-button>
    <el-button type="primary" size="small" @click="applyFilters">Apply</el-button>
  </div>
</el-form>
</el-popover>

<div class="rule-management__filter-tags">
  <el-tag v-for="tag in activeFilterTags" :key="tag.key" closable @close="removeFilterTag(tag.key)"
    class="rule-management__filter-tag">
    {{ tag.value }}
  </el-tag>
</div>
</div>
</div> -->
        <div class="rule-management__reload-icon" @click="handleReload">
          <img :src="tableRefreshIcon" alt="Reload" />
        </div>



      </div>
      <div class="rule-management__table">
        <el-table v-loading="loading" :data="tableData" class="rule-management__table-content" align="left"
          row-key="instance_id">
          <el-table-column prop="instance_id" label="ID" width="100" />
          <el-table-column prop="instance_name" label="Instance Name" min-width="200" />
          <el-table-column prop="product_name" label="Product Name" min-width="200" />
          <el-table-column min-width="230" fixed="right">
            <template #header>
              <IconButton type="primary" :icon="userAddIcon" text="New"
                custom-class="rule-management__btn rule-management__table-header-btn" @click="handleAddUser" />
            </template>
            <template #default="{ row }">
              <div class="rule-management__operation">
                <div class="rule-management__operation-item" @click="handleDetail(row)">
                  <img :src="detailIcon" />
                  <span class="rule-management__operation-text">Detail</span>
                </div>
                <div class="rule-management__operation-item" @click="openPointsDialog(row)">
                  <img :src="pointIcon" />
                  <span class="rule-management__operation-text">Points/Routings</span>
                </div>
                <!-- <div class="rule-management__operation-item" @click="openMappingsDialog(row)">
                  <img :src="tableEditIcon" />
                  <span class="rule-management__operation-text">Mappings</span>
                </div> -->
                <div class="rule-management__operation-item"
                  @click="deleteRow(row.instance_id as any, `Are you sure you want to delete instance '${row.instance_name}'?`, ruleManagementRef)">
                  <img :src="tableDeleteIcon" />
                  <span class="rule-management__operation-text">Delete</span>
                </div>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="rule-management__pagination">
          <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]" :total="pagination.total" layout="total, sizes, prev, pager, next"
            @size-change="handlePageSizeChange" @current-change="handlePageChange" />
        </div>
      </div>
    </div>
    <InstanceDetailDialog ref="instanceDetailDialogRef" :product-options="productOptions"
      @submit="fetchTableData(true)" />

    <!-- Mappings 对话框（DeviceConfiguration 专用�?-->
    <!-- <MappingsDialog ref="MappingsDialogRef" /> -->
  </div>
</template>

<script setup lang="ts">
// 正确引入SVG图标，避免部署后图片加载不出�?
import tableRefreshIcon from '@/assets/icons/table-refresh.svg'
import tableSearchIcon from '@/assets/icons/table-search.svg'
import userAddIcon from '@/assets/icons/user-add.svg'
import tableDeleteIcon from '@/assets/icons/table-delect.svg'
import detailIcon from '@/assets/icons/button-detail.svg'
import pointIcon from '@/assets/icons/button-point.svg'

import InstanceDetailDialog from './components/InstanceDetailDialog.vue'
import type { DeviceInstanceBasic, ProductListItem } from '@/types/deviceConfiguration'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getProducts } from '@/api/devicesManagement'
import { useTableData, type TableConfig } from '@/composables/useTableData'
import { useRouter } from 'vue-router'

const tableConfig: TableConfig = {
  listUrl: '/modApi/api/instances',
  deleteUrl: '/modApi/api/instances/{id}',
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
  reloadFilters,
  deleteRow
} = useTableData<DeviceInstanceBasic>(tableConfig)

filters.product_name = ''

const levelSelectRef = ref<HTMLElement | null>(null)
const filterTriggerRef = ref<HTMLElement | null>(null)
const showFilterPopover = ref(false)
const router = useRouter()
const ruleManagementRef = ref<HTMLElement | null>(null)
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
  if (filters.product_name !== null && filters.product_name !== undefined && filters.product_name !== '') {
    activeFilterTags.value.push({
      key: 'product_name',
      label: 'Product Name',
      value: filters.product_name,
    })
  }
}

// 防抖定时器
let debounceTimer: any = null

// // 处理筛选变�?（移动端）
// const handleFilterChange = (_key?: string, _value?: any) => {
//   updateFilterTags()
// }

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
  if (key === 'product_name') {
    filters.product_name = ''
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
watch(() => filters.product_name, () => {
  updateFilterTags()
}, { deep: true })

const productOptions = ref<Array<{ label: string; value: string }>>([])
const getProductOptions = async () => {
  const res = await getProducts()
  productOptions.value = (res?.data?.products || []).map((it: ProductListItem) => ({
    label: it.product_name,
    value: it.product_name,
  }))
}
onMounted(() => getProductOptions())

const instanceDetailDialogRef = ref()
// const MappingsDialogRef = ref()

// 配置弹窗相关数据
const configDialogVisible = ref(false)
const currentConfigRow = ref<any>(null)
const currentConfigData = ref({
  channelName: '',
  channelType: '',
  point: '',
})

// 添加规则
const handleAddUser = () => {
  // 设备实例新增：以实例名形式调�?open 并进入编辑态。这里传空字符串代表新建�?
  instanceDetailDialogRef.value?.open(null as any)
}

// 查看详情
const handleDetail = (row: DeviceInstanceBasic) => {
  instanceDetailDialogRef.value?.open(row.instance_id as any)
}

// 打开 Device Points/Mappings 对话�?
const openPointsDialog = (row: DeviceInstanceBasic) => {
  router.push({
    path: '/modelConfiguration/pointsTables',
    query: {
      id: String(row.instance_id),
      name: String(row.instance_name || ''),
    },
  })
}
// const openMappingsDialog = (row: DeviceInstanceBasic) => {
//   MappingsDialogRef.value?.open(row.instance_id)
// }
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
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #dcdfe6;
      :deep(.el-select){
    width:180px;
  }
      //   padding-bottom: 20px;
      :deep(.el-form-item) {
        margin: 0;
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

      // // 移动端筛选按钮和标签
      // .rule-management__filters-mobile {
      //   display: none;
      //   flex: 1;
      //   min-width: 0;
      // }

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
  }

}


// // 媒体查询：小�?200px时隐藏桌面端筛选框，显示移动端筛选按�?
// @media (max-width: 1199px) {
//   .voltage-class .rule-management {
//     .rule-management__content {
//       .rule-management__search-form {
//         .rule-management__filters-desktop {
//           display: none;
//         }

//         .rule-management__filters-mobile {
//           display: flex;
//         }
//       }
//     }
//   }
// }

// // 媒体查询：大于等�?200px时显示桌面端筛选框，隐藏移动端筛选按�?
// @media (min-width: 1200px) {
//   .voltage-class .rule-management {
//     .rule-management__content {
//       .rule-management__search-form {
//         .rule-management__filters-desktop {
//           display: flex;
//         }

//         .rule-management__filters-mobile {
//           display: none;
//         }
//       }
//     }
//   }
// }</style>

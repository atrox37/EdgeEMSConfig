<template>
  <div class="voltage-class rule-management" ref="ruleManagementRef" v-if="!isDetailRoute">
    <div class="rule-management__header">
      <h2 class="rule-management__title">Rule Config</h2>
    </div>
      <div class="rule-management__content">
        <div class="rule-management__search-form" ref="levelSelectRef">
          <div></div>
          <div class="rule-management__reload-icon" @click="handleReload">
            <AppIcon name="i-tabler-refresh" className="rule-management__inline-icon" />
          </div>
        </div>
        <div class="rule-management__table">
          <el-table v-loading="loading"
            :data="tableData"
            class="rule-management__table-content"
            align="left"
            table-layout="fixed"
            row-key="id"
          >
            <el-table-column prop="id" label="ID" show-overflow-tooltip min-width="100" />
            <el-table-column prop="name" label="Name" min-width="140" show-overflow-tooltip />
            <el-table-column
              prop="description"
              label="Description"
              min-width="260"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span>{{ row.description || '-' }}</span>
              </template>
            </el-table-column>
            <!-- <el-table-column prop="priority" label="Priority" width="120" /> -->
            <el-table-column prop="enabled" label="Enabled" min-width="60">
              <template #default="{ row, $index }">
                <el-switch
                  :model-value="row.enabled"
                  :loading="switchLoadings[$index]"
                  :before-change="() => handleEnabledBeforeChange(!row.enabled, row, $index)"
                />
              </template>
            </el-table-column>
            <el-table-column min-width="200" fixed="right">
              <template #header>
                <IconButton
                  type="primary"
                  :icon="userAddIcon"
                  text="New"
                  custom-class="rule-management__btn rule-management__table-header-btn"
                @click="openCreateDialog"
                />
              </template>
              <template #default="{ row }">
                <div class="rule-management__operation">
                  <div class="rule-management__operation-item" @click="openDetail(row)">
                    <AppIcon name="i-tabler-file-text" className="rule-management__inline-icon" />
                    <span class="rule-management__operation-text">Detail</span>
                  </div>
                  <div class="rule-management__operation-item" @click="openEditDialog(row)">
                    <AppIcon name="i-tabler-edit" className="rule-management__inline-icon" />
                    <span class="rule-management__operation-text">Edit</span>
                  </div>
                  <div class="rule-management__operation-item" @click="deleteRow(row.id, `Are you sure you want to delete rule '${row.name}'?`, ruleManagementRef)">
                    <AppIcon name="i-tabler-trash" className="rule-management__inline-icon" />
                    <span class="rule-management__operation-text">Delete</span>
                  </div>
                </div>
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
      </div>                        
<RuleEditDialog ref="ruleEditDialogRef" @submitted="fetchTableData(true)" />
  </div>
  <router-view v-else />
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import RuleEditDialog from './components/RuleEditDialog.vue'
import { enableRule, disableRule } from '@/api/rulesManagement'
import { useRoute, useRouter } from 'vue-router'
import type { Rule } from '@/types/ruleConfiguration'
import { useTableData, type TableConfig } from '@/composables/useTableData'
// 使用 useTableData 管理表格数据

const tableConfig: TableConfig = {
  listUrl: '/ruleApi/api/rules',
  deleteUrl: '/ruleApi/api/rules/{id}',
  defaultPageSize: 20,
}

const {
  loading,
  tableData,
  pagination,
  handlePageSizeChange,
  fetchTableData,
  handlePageChange,
  deleteRow,
  reloadFilters,
} = useTableData<Rule>(tableConfig)
const route = useRoute()
const router = useRouter()
const isDetailRoute = computed(() => route.name === 'ruleChainEditor')
const ruleManagementRef = ref<HTMLElement | null>(null)
// 分页事件由 useTableData 提供的 handlePageSizeChange / handlePageChange 处理

const switchLoadings = ref<boolean[]>([])
const levelSelectRef = ref<HTMLElement | null>(null)
const ruleEditDialogRef = ref()
const userAddIcon = 'i-tabler-plus'

// 初始化页面，重新发起所有请求（reloadFilters 内部已调用 fetchTableData，避免重复请求）
const handleReload = () => {
  reloadFilters()
}

function openCreateDialog() {
  ruleEditDialogRef.value?.open()
}

function openEditDialog(row: Rule) {
  ruleEditDialogRef.value?.open(row)
}

function openDetail(row: { id: string }) {
  router.push({ name: 'ruleChainEditor', params: { id: row.id } })
}

async function handleEnabledBeforeChange(next: boolean, row: Rule, index: number) {
  switchLoadings.value[index] = true
  try {
    if (next) {
      const r = await enableRule(row.id)
      if (r.success === false) {
        ElMessage.error('Enable failed')
        return false
      }
    } else {
      const r = await disableRule(row.id)
      if (r.success === false) {
        return false
      }
    }
    // 后端成功后再变更本地状态
    row.enabled = next
    return true
  } catch (e) {
    return false
  } finally {
    switchLoadings.value[index] = false
  }
}

watch(
  tableData,
  (list) => {
    if (Array.isArray(list)) {
      switchLoadings.value = list.map(() => false)
    }
  },
  { deep: false },
)
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
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #dcdfe6;
      //   padding-bottom: 20px;
      :deep(.el-form-item) {
        margin-bottom: 0;
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

        .rule-management__inline-icon,
        img {
          width: 32px;
          height: 32px;
          // 主题色 rgba(255, 105, 0, 1)
          filter: brightness(0) saturate(100%) invert(48%) sepia(100%) saturate(7498%) hue-rotate(1deg) brightness(102%) contrast(101%);
        }
      }
    }

    .rule-management__table-operations {
      width: 100%;
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

    .rule-management__table {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;

      .rule-management__table-content {
        flex: 1;
        overflow-y: auto;
        min-height: 0;

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

            .rule-management__inline-icon,
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

        .rule-management__inline-icon,
        img {
          width: 14px;
          height: 14px;
          margin-right: 4px;
          object-fit: contain;
        }
      }
    }
  }
  :deep(.el-switch) {
    height: 22px;
  }
}
</style>













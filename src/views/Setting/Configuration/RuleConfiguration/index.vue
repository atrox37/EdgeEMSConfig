<template>
  <div class="voltage-class rule-management">
    <LoadingBg :loading="loading">
      <div class="rule-management__header">
        <div class="rule-management__search-form" ref="levelSelectRef">
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
              @click="fetchTableData"
            />
            <IconButton
              type="primary"
              :icon="userAddIcon"
              text="New a rule"
              custom-class="rule-management__btn"
              @click="openCreateDialog"
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
          table-layout="fixed"
          row-key="id"
        >
          <el-table-column prop="id" label="ID" show-overflow-tooltip width="220" />
          <el-table-column prop="name" label="Name" width="260" show-overflow-tooltip />
          <el-table-column prop="description" label="Description" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ row.description || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="priority" label="Priority" width="120" />
          <el-table-column prop="enabled" label="Enabled" width="120">
            <template #default="{ row, $index }">
              <el-switch
                v-model="row.enabled"
                :loading="switchLoadings[$index]"
                @change="(val: boolean) => handleEnabledToggle(val, row, $index)"
              />
            </template>
          </el-table-column>
          <el-table-column label="Operation" fixed="right" width="220">
            <template #default="{ row }">
              <div class="rule-management__operation">
                <div class="rule-management__operation-item" @click="openEditDialog(row)">
                  <img :src="tableEditIcon" />
                  <span class="rule-management__operation-text">Edit</span>
                </div>
                <div class="rule-management__operation-item" @click="handleDelete(row)">
                  <img :src="tableDeleteIcon" />
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
    </LoadingBg>
    <RuleEditDialog ref="ruleEditDialogRef" @submitted="fetchTableData(true)" />
  </div>
</template>

<script setup lang="ts">
import tableRefreshIcon from '@/assets/icons/table-refresh.svg'
import tableSearchIcon from '@/assets/icons/table-search.svg'
import userAddIcon from '@/assets/icons/user-add.svg'
import tableEditIcon from '@/assets/icons/table-edit.svg'
import tableDeleteIcon from '@/assets/icons/table-delect.svg'
import { ElMessageBox, ElMessage } from 'element-plus'
import RuleEditDialog from './RuleEditDialog.vue'
import { enableRule, disableRule } from '@/apis/rules'
import type { Rule } from '@/types/rule'
import { useTableData, type TableConfig } from '@/composables/useTableData'

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
} = useTableData<Rule>(tableConfig)

const switchLoadings = ref<boolean[]>([])
const levelSelectRef = ref<HTMLElement | null>(null)
const ruleEditDialogRef = ref()

function handleRefresh() {
  fetchTableData(true)
}

function openDetail() {
  console.log('openDetail')
}

function openCreateDialog() {
  ruleEditDialogRef.value?.open()
}

function openEditDialog(row: Rule) {
  ruleEditDialogRef.value?.open(row)
}

async function handleDelete(row: Rule) {
  await ElMessageBox.confirm(
    `Are you sure you want to delete rule "${row.name}"?`,
    'Delete Confirmation',
    {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning',
    },
  )
  const ok = await deleteRow(row.id)
  if (ok) ElMessage.success('Rule deleted')
}

async function handleEnabledToggle(next: boolean, row: Rule, index: number) {
  switchLoadings.value[index] = true
  const prev = !next
  try {
    if (next) {
      const r = await enableRule(row.id)
      if (!r.success) {
        row.enabled = prev
        return
      }
    } else {
      const r = await disableRule(row.id)
      if (!r.success) {
        row.enabled = prev
        return
      }
    }
    // 成功则保持 row.enabled = next
  } catch (e) {
    row.enabled = prev
    ElMessage.error('Operation failed')
  } finally {
    switchLoadings.value[index] = false
  }
}

onMounted(() => {
  fetchTableData(true)
})

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
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  .rule-management__header {
    margin: 0.2rem 0;

    .rule-management__search-form {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      //   padding-bottom: 0.2rem;
      :deep(.el-form-item) {
        margin-bottom: 0;
      }
      .form-oprations {
        display: flex;
        align-items: flex-start;
        gap: 0.1rem;
      }
    }

    .rule-management__table-operations {
      width: 100%;
    }

    .rule-management__btn {
      display: flex;
      align-items: center;
      gap: 0.08rem;

      .rule-management__btn-icon {
        width: 0.14rem;
        height: 0.14rem;
        margin-right: 0.08rem;
      }
    }
  }

  .rule-management__table {
    height: calc(100% - 0.72rem);
    display: flex;
    flex-direction: column;

    .rule-management__table-content {
      height: calc(100% - 0.92rem);
      overflow-y: auto;

      .rule-management__operation {
        display: flex;
        align-items: center;
        gap: 0.2rem;
        .position-relative {
          position: relative;
        }
        .rule-management__operation-item {
          cursor: pointer;
          display: flex;
          align-items: center;

          img {
            width: 0.14rem;
            height: 0.14rem;
            margin-right: 0.04rem;
            object-fit: contain;
          }
          .rule-management__operation-text {
            font-size: 0.14rem;
            color: #fff;
          }
        }
      }

      .rule-management__table-icon {
        width: 0.46rem;
        height: 0.2rem;
        object-fit: contain;
      }
    }

    .rule-management__pagination {
      display: flex;
      justify-content: flex-end;
      margin: 0.2rem 0;
    }
  }

  .rule-management__expand-content {
    .rule-management__edit-controls {
      display: flex;
      gap: 0.1rem;
      margin-bottom: 0.2rem;
      padding: 0.1rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      .el-button {
        display: flex;
        align-items: center;
        font-size: 0.14rem;
        padding: 0.08rem 0.16rem;
        border-radius: 0.04rem;

        img {
          width: 0.14rem;
          height: 0.14rem;
          margin-right: 0.04rem;
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
</style>

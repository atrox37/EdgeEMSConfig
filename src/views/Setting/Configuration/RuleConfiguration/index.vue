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
                @change="(val: boolean | string | number) => handleEnabledToggle(val as boolean, row, $index)"
              />
            </template>
          </el-table-column>
          <el-table-column label="Operation" fixed="right" :width="isNarrow ? 80 : 220">
            <template #default="{ row }">
              <OperationDropdown @command="(cmd) => handleOperationCommand(cmd, row)">
                <!-- 宽屏：显示所有按钮 -->
                <template #buttons>
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

                <!-- 窄屏：下拉菜单项 -->
                <template #dropdown>
                  <el-dropdown-item command="edit">
                    <img :src="tableEditIcon" />
                    Edit
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
import OperationDropdown from '@/components/common/OperationDropdown.vue'
import { enableRule, disableRule } from '@/api/rules'
import type { Rule } from '@/types/rule'
import { useTableData, type TableConfig } from '@/composables/useTableData'
import { useResponsive } from '@/composables/useResponsive'

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

// 使用响应式监听
const { isNarrow } = useResponsive()

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

// 处理操作下拉菜单命令
const handleOperationCommand = (command: string, row: Rule) => {
  switch (command) {
    case 'edit':
      openEditDialog(row)
      break
    case 'delete':
      handleDelete(row)
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
    margin: 20px 0;

    .rule-management__search-form {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      //   padding-bottom: 20px;
      :deep(.el-form-item) {
        margin-bottom: 0;
      }
      .form-oprations {
        display: flex;
        align-items: flex-start;
        gap: 10px;
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
  }

  .rule-management__table {
    // height: calc(100% - 72px);
    flex:1;
    display: flex;
    flex-direction: column;

    .rule-management__table-content {
      height: calc(100% - 92px);
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
</style>

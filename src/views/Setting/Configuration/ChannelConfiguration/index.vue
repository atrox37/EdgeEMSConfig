<template>
  <div class="voltage-class rule-management" ref="ruleManagementRef">
    <div class="rule-management__header">
      <PageTitle title="Channel Config" />
    </div>
    <div class="rule-management__content">
      <div class="rule-management__search-form" ref="levelSelectRef">
        <!-- 移动端：筛选按钮和筛选标?-->
        <div class="rule-management__filters-mobile">
          <div
            class="rule-management__filter-trigger-wrapper"
            ref="filterTriggerRef"
          >
            <el-popover
              v-model:visible="showFilterPopover"
              placement="bottom-start"
              :width="300"
              trigger="click"
              :teleported="false"
              popper-class="rule-management__filter-popover"
            >
              <template #reference>
                <IconButton
                  type="primary"
                  :icon="tableSearchIcon"
                  text="Filter"
                  custom-class="rule-management__btn rule-management__filter-btn"
                />
              </template>
              <el-form
                :model="filters"
                label-width="88px"
                class="rule-management__filter-form"
              >
                <el-form-item
                  label="Protocol:"
                  class="rule-management__filter-form-item"
                >
                  <el-select
                    v-model="mobileFilterDraft.protocol"
                    :fit-input-width="true"
                    :teleported="false"
                    placeholder="Select protocol"
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
                <el-form-item
                  label="Enabled:"
                  class="rule-management__filter-form-item"
                >
                  <el-select
                    v-model="mobileFilterDraft.enabled"
                    :fit-input-width="true"
                    :teleported="false"
                    placeholder="Select enabled status"
                    clearable
                    style="width: 100%"
                  >
                    <el-option label="Enabled" :value="true" />
                    <el-option label="Disabled" :value="false" />
                  </el-select>
                </el-form-item>
                <el-form-item
                  label="Connected:"
                  class="rule-management__filter-form-item-last"
                >
                  <el-select
                    v-model="mobileFilterDraft.connected"
                    :fit-input-width="true"
                    :teleported="false"
                    placeholder="Select connected status"
                    clearable
                    style="width: 100%"
                  >
                    <el-option label="Connected" :value="true" />
                    <el-option label="Disconnected" :value="false" />
                  </el-select>
                </el-form-item>
                <div style="text-align: right; margin-top: 12px">
                  <el-button size="small" @click="resetMobileFilters"
                    >Reset</el-button
                  >
                  <el-button
                    type="primary"
                    size="small"
                    @click="searchWithMobileFilters"
                    >Search</el-button
                  >
                </div>
              </el-form>
            </el-popover>
            <!-- 筛选标签 -->
            <div class="rule-management__filter-tags">
              <el-tag
                v-for="tag in activeFilterTags"
                :key="tag.key"
                closable
                @close="removeFilterTag(tag.key)"
                class="rule-management__filter-tag"
              >
                {{ tag.value }}
              </el-tag>
            </div>
          </div>
        </div>
        <!-- 桌面端：显示筛选框 -->
        <el-form
          :model="filters"
          :inline="true"
          class="test-form rule-management__filters-desktop"
        >
          <el-form-item label="Protocol:">
            <el-select
              v-model="filters.protocol"
              :fit-input-width="true"
              placeholder="Select protocol"
              clearable
              @change="handleDesktopFilterChange('protocol', filters.protocol)"
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
              placeholder="Select enabled status"
              clearable
              :fit-input-width="true"
              @change="handleDesktopFilterChange('enabled', filters.enabled)"
            >
              <el-option label="Enabled" :value="true" />
              <el-option label="Disabled" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item label="Connected:">
            <el-select
              v-model="filters.connected"
              placeholder="Select connected status"
              clearable
              :fit-input-width="true"
              @change="
                handleDesktopFilterChange('connected', filters.connected)
              "
            >
              <el-option label="Connected" :value="true" />
              <el-option label="Disconnected" :value="false" />
            </el-select>
          </el-form-item>
        </el-form>
        <div class="rule-management__reload-icon" @click="handleReload">
          <AppIcon
            name="i-tabler-refresh"
            className="rule-management__inline-icon"
          />
        </div>
      </div>
      <div class="rule-management__search-form-second-row">
        <IconButton
          type="primary"
          :icon="sidebarSettingIcon"
          text="Template"
          custom-class="rule-management__btn"
          @click="handleTemplateManagement"
        />
        <IconButton
          v-permission="'engineer'"
          type="primary"
          :icon="userAddIcon"
          text="New"
          custom-class="rule-management__btn"
          @click="addChannel"
        />
      </div>
      <div class="rule-management__table">
        <el-table
          stripe
          v-loading="loading"
          :data="tableData"
          class="rule-management__table-content"
          align="left"
          :expand-row-keys="expandedRows.map(String)"
          row-key="id"
        >
          <el-table-column
            prop="name"
            label="Name"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            prop="description"
            label="Description"
            show-overflow-tooltip
            min-width="200"
          >
            <template #default="{ row }">
              <span>{{ row.description || "-" }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="protocol"
            label="Protocol"
            min-width="140"
            show-overflow-tooltip
          />
          <el-table-column prop="enabled" label="Enabled" min-width="100">
            <template #default="{ row, $index }">
              <el-switch
                :model-value="row.enabled"
                @change="(val) => handleEnabledChange(!!val, row, $index)"
                :loading="channelControlLoadings[$index][0]"
              />
            </template>
          </el-table-column>
          <el-table-column prop="connected" label="Connected" min-width="130">
            <template #default="{ row }">
              <span
                :style="{
                  color: row.connected ? '#67C23A' : '#F56C6C',
                  fontWeight: '500',
                }"
              >
                {{ row.connected ? "Connected" : "Disconnected" }}
              </span>
            </template>
          </el-table-column>
          <!-- <el-table-column prop="error_count" label="Error Count" /> -->
          <el-table-column label="Action" width="380" fixed="right">
            <template #default="{ row }">
              <div class="rule-management__operation">
                <div
                  class="rule-management__operation-item"
                  @click="handleDetail(row)"
                >
                  <AppIcon
                    name="i-tabler-file-text"
                    className="rule-management__inline-icon"
                  />
                  <span class="rule-management__operation-text">Detail</span>
                </div>
                <div
                  class="rule-management__operation-item"
                  @click="handlePointsTables(row)"
                >
                  <AppIcon
                    name="i-tabler-transform-point"
                    className="rule-management__inline-icon"
                  />
                  <span class="rule-management__operation-text"
                    >Points/Mappings</span
                  >
                </div>
                <div
                  v-permission="'engineer'"
                  class="rule-management__operation-item"
                  @click="
                    deleteRow(
                      row.id,
                      `Are you sure you want to delete channel ${row.name}?`,
                      ruleManagementRef,
                    )
                  "
                >
                  <AppIcon
                    name="i-tabler-trash"
                    className="rule-management__inline-icon"
                  />
                  <span class="rule-management__operation-text">Delete</span>
                </div>
                <el-dropdown
                  v-permission="'engineer'"
                  trigger="click"
                  placement="bottom-end"
                  :show-arrow="false"
                  :teleported="true"
                >
                  <div
                    class="rule-management__operation-item rule-management__operation-item--more"
                  >
                    <AppIcon
                      name="i-tabler-dots"
                      className="rule-management__more-icon"
                    />
                  </div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="openAssignTemplateDialog(row)">
                        Assign Template
                      </el-dropdown-item>
                      <el-dropdown-item @click="openAsTemplateDialog(row)"
                        >As Template</el-dropdown-item
                      >
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
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
            :teleported="false"
            layout="total, prev, pager, next, sizes"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
    <ChannelDetailDialog
      ref="channelDetailDialogRef"
      @submit="handleChannelDialogSubmit"
      @cancel="handleChannelDialogCancel"
    />

    <AssignTemplateDialog
      ref="assignTemplateDialogRef"
      :template-options="templateOptions"
      @submit="submitAssignTemplate"
    />
    <AsTemplateDialog ref="asTemplateDialogRef" @submit="submitAsTemplate" />
  </div>
</template>

<script setup lang="ts">
import { ChangeChannelEnabled } from "@/api/channelsManagement";
import {
  applyTemplateToChannel,
  createTemplateFromChannel,
  getTemplates,
} from "@/api/channelTemplates";
import type { ChannelListItem } from "@/types/channelConfiguration";
import type { ChannelTemplateListItem } from "@/types/channelTemplates";
import { PROTOCOL_OPTIONS } from "@/types/channelConfiguration";
import { ElMessage, ElMessageBox } from "element-plus";
import AppIcon from "@/components/AppIcon.vue";
import PageTitle from "@/components/common/PageTitle.vue";
import { useTableData, type TableConfig } from "@/composables/useTableData";
import { useRouter } from "vue-router";
import ChannelDetailDialog from "@/views/Setting/Configuration/ChannelConfiguration/components/ChannelDetailDialog.vue";
import AssignTemplateDialog from "@/views/Setting/Configuration/ChannelConfiguration/components/AssignTemplateDialog.vue";
import AsTemplateDialog from "@/views/Setting/Configuration/ChannelConfiguration/components/AsTemplateDialog.vue";

const tableSearchIcon = "i-tabler-filter";
const userAddIcon = "i-tabler-plus";
const sidebarSettingIcon = "i-tabler-template";
const router = useRouter();
const channelDetailDialogRef = ref<InstanceType<
  typeof ChannelDetailDialog
> | null>(null);

const tableConfig: TableConfig = {
  listUrl: "/comApi/api/channels", // 使用 /comApi 前缀
  deleteUrl: "/comApi/api/channels/{id}", // 使用 /comApi 前缀
  defaultPageSize: 20,
};
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
} = useTableData<ChannelListItem>(tableConfig);

filters.productName = "";
filters.protocol = null;
filters.enabled = null;
filters.connected = null;
const ruleManagementRef = ref<HTMLElement | null>(null);
const showFilterPopover = ref(false);
const mobileFilterDraft = reactive<{
  protocol: string | null;
  enabled: boolean | null;
  connected: boolean | null;
}>({
  protocol: null,
  enabled: null,
  connected: null,
});

// 筛选标签管理
interface FilterTag {
  key: string;
  label: string;
  value: string | boolean | null;
}

const activeFilterTags = ref<FilterTag[]>([]);

// 更新筛选标签
const updateFilterTags = () => {
  activeFilterTags.value = [];
  if (
    filters.protocol !== null &&
    filters.protocol !== undefined &&
    filters.protocol !== ""
  ) {
    const option = PROTOCOL_OPTIONS.find(
      (opt) => opt.value === filters.protocol,
    );
    activeFilterTags.value.push({
      key: "protocol",
      label: "Protocol",
      value: option?.label || filters.protocol,
    });
  }
  if (filters.enabled !== null && filters.enabled !== undefined) {
    activeFilterTags.value.push({
      key: "enabled",
      label: "Enabled",
      value: filters.enabled ? "Enabled" : "Disabled",
    });
  }
  if (filters.connected !== null && filters.connected !== undefined) {
    activeFilterTags.value.push({
      key: "connected",
      label: "Connected",
      value: filters.connected ? "Connected" : "Disconnected",
    });
  }
};

// 防抖定时器
let debounceTimer: any = null;

// 处理筛选变化（移动端）
const handleFilterChange = (_key?: string, _value?: any) => {
  // 移动端筛选仅在点击 Apply 后生效
};

// 处理桌面端筛选变化（带防抖）
const handleDesktopFilterChange = (_key?: string, _value?: any) => {
  updateFilterTags();
  // 清除之前的定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  // 设置新的定时器，500ms后执行
  debounceTimer = setTimeout(() => {
    fetchTableData(true);
  }, 500);
};

// 初始化页面，重新发起所有请求（reloadFilters 内部已调用 fetchTableData，避免重复请求）
const handleReload = () => {
  reloadFilters();
};

// 移除筛选标签
const removeFilterTag = (key: string) => {
  if (key === "protocol") {
    filters.protocol = null;
  } else if (key === "enabled") {
    filters.enabled = null;
  } else if (key === "connected") {
    filters.connected = null;
  }
  updateFilterTags();
  fetchTableData(true);
};

// 应用筛选
const searchWithMobileFilters = () => {
  filters.protocol = mobileFilterDraft.protocol;
  filters.enabled = mobileFilterDraft.enabled;
  filters.connected = mobileFilterDraft.connected;
  updateFilterTags();
  showFilterPopover.value = false;
  fetchTableData(true);
};

const resetMobileFilters = () => {
  mobileFilterDraft.protocol = null;
  mobileFilterDraft.enabled = null;
  mobileFilterDraft.connected = null;
};

// 监听筛选变化
watch(
  [() => filters.protocol, () => filters.enabled, () => filters.connected],
  () => {
    if (showFilterPopover.value) return;
    updateFilterTags();
  },
  { deep: true },
);

watch(
  () => showFilterPopover.value,
  (visible) => {
    if (visible) {
      mobileFilterDraft.protocol = (filters.protocol as string | null) ?? null;
      mobileFilterDraft.enabled = (filters.enabled as boolean | null) ?? null;
      mobileFilterDraft.connected =
        (filters.connected as boolean | null) ?? null;
    }
  },
);
// 展开行控制
const expandedRows = ref<number[]>([]);

const channelControlLoadings = ref<boolean[][]>([]);

const templateOptions = ref<ChannelTemplateListItem[]>([]);
const assignTemplateDialogRef = ref<InstanceType<
  typeof AssignTemplateDialog
> | null>(null);
const asTemplateDialogRef = ref<InstanceType<typeof AsTemplateDialog> | null>(
  null,
);

watch(
  tableData,
  (newVal) => {
    // 只有当数组长度发生变化时才更新loading状态，避免不必要的更新
    if (channelControlLoadings.value.length !== newVal.length) {
      channelControlLoadings.value = newVal.map(() => [false, false]);
    }
  },
  { deep: false },
);

// 查看详情
const handleDetail = (row: ChannelListItem) => {
  channelDetailDialogRef.value?.open(row.id);
};

// 添加通道
const addChannel = () => {
  channelDetailDialogRef.value?.open(undefined);
};

// 处理 Points Tables
const handlePointsTables = (row: ChannelListItem) => {
  router.push({
    path: "/channelConfiguration/pointsTables",
    query: {
      id: row.id,
      name: row.name,
      protocol: row.protocol,
    },
  });
};

const handleTemplateManagement = () => {
  router.push("/channelConfiguration/templates");
};

const loadTemplateOptions = async (protocol?: string) => {
  const res = await getTemplates((protocol || undefined) as any);
  if (res.success) {
    templateOptions.value = Array.isArray(res.data) ? res.data : [];
  }
};

const openAssignTemplateDialog = async (row: ChannelListItem) => {
  await loadTemplateOptions(String(row.protocol || ""));
  assignTemplateDialogRef.value?.open({
    channel_id: Number(row.id),
    channel_name: String(row.name || row.id),
    channel_protocol: String(row.protocol || ""),
  });
};

const submitAssignTemplate = async (payload: {
  channel_id: number;
  channel_name: string;
  template_id: number;
}) => {
  try {
    await ElMessageBox.confirm(
      `Apply selected template to channel ${payload.channel_name}?`,
      "Confirm",
      {
        type: "warning",
        confirmButtonText: "Apply",
        cancelButtonText: "Cancel",
        center: true,
        showClose: false,
      },
    );
  } catch {
    return;
  }
  const res = await applyTemplateToChannel(
    payload.template_id,
    payload.channel_id,
    {
      clear_existing: true,
      slave_id_override: null,
    },
  );
  if (res.success) {
    ElMessage.success(
      (res as any).data?.message || "Template applied successfully",
    );
    assignTemplateDialogRef.value?.close();
  }
};

const openAsTemplateDialog = (row: ChannelListItem) => {
  asTemplateDialogRef.value?.open({
    channel_id: Number(row.id),
    channel_name: String(row.name || row.id),
    protocol: String(row.protocol || ""),
  });
};

const submitAsTemplate = async (payload: {
  channel_id: number;
  channel_name: string;
  name: string;
  description: string;
  protocol: string;
}) => {
  const res = await createTemplateFromChannel(payload.channel_id, {
    name: payload.name,
    description: payload.description,
  });
  if (res.success) {
    ElMessage.success("Template created from channel successfully");
    asTemplateDialogRef.value?.close();
  }
};

// 处理启用状态变化
const handleEnabledChange = async (
  newState: boolean,
  row: ChannelListItem,
  index: number,
) => {
  channelControlLoadings.value[index][0] = true;
  const originalState = row.enabled;
  row.enabled = newState;
  try {
    const res = await ChangeChannelEnabled(row.id as number, newState);
    if (res.success) {
      // 更新成功后刷新数据，而不是直接修改row
      await fetchTableData();
    } else {
      // 如果失败，恢复原状态
      row.enabled = originalState;
    }
  } catch (error) {
    // 发生错误时恢复原状态
    row.enabled = originalState;
    ElMessage.error(error as string);
  } finally {
    channelControlLoadings.value[index][0] = false;
  }
};

const handleChannelDialogSubmit = () => {
  fetchTableData(true);
};

const handleChannelDialogCancel = () => {
  // 取消时不做额外处理，保持列表状态
};
</script>

<style scoped lang="scss">
.voltage-class .rule-management {
  // position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  .rule-management__header {
    height: 64px;
    padding: 0 20px;
    display: flex;
    align-items: center;
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
      padding: 0 20px 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid #dcdfe6;

      //   padding-bottom: 20px;
      :deep(.el-form-item) {
        margin-bottom: 0;
      }

      .form-oprations {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;

        .form-oprations__row {
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

        .rule-management__reload-icon:hover {
          opacity: 0.7;
        }

        .rule-management__inline-icon,
        img {
          width: 32px;
          height: 32px;
          // 主题色 rgba(255, 105, 0, 1)
          filter: brightness(0) saturate(100%) invert(48%) sepia(100%)
            saturate(7498%) hue-rotate(1deg) brightness(102%) contrast(101%);
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
      }

      :deep(.rule-management__filter-popover) {
        box-sizing: border-box;

        .el-popper__arrow {
          display: none;
        }
      }

      .rule-management__filter-form {
        width: 100%;

        :deep(.el-form-item) {
          display: flex;
          align-items: center;
          margin-bottom: 14px;
        }

        :deep(.rule-management__filter-form-item-last) {
          margin-bottom: 0;
        }

        :deep(.el-form-item__label) {
          flex: 0 0 88px;
          padding-right: 10px;
        }

        :deep(.el-form-item__content) {
          flex: 1;
          min-width: 0;
        }

        :deep(.el-select) {
          display: block;
          width: 100% !important;
          max-width: 100%;
          box-sizing: border-box;
        }
      }
    }

    .rule-management__search-form-second-row {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
      padding: 0 20px;
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
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0 20px 22px;

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

          .rule-management__operation-item.rule-management__operation-item--more {
            width: 22px;
            height: 22px;
            justify-content: center;

            :deep(.rule-management__more-icon) {
              width: 20px;
              height: 20px;
              color: #606266;
            }
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

// 媒体查询：小于 1060px 时隐藏桌面端筛选框，显示移动端筛选按钮
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

// 媒体查询：大于等于 1060px 时显示桌面端筛选框，隐藏移动端筛选按钮
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

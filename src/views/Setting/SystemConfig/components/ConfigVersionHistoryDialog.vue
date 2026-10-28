<template>
  <FormDialog
    ref="dialogRef"
    title="Restore Points"
    width="960px"
    size="wide"
    dialog-class="config-history-dialog-wrapper"
    :before-close="handleDialogBeforeClose"
  >
    <template #dialog-body>
      <div class="config-history-dialog">
        <div class="config-history-dialog__body">
          <div v-if="storage" class="config-history-dialog__storage">
            <div class="config-history-dialog__storage-header">
              <span class="config-history-dialog__storage-label"
                >Backup Storage:</span
              >
              <span class="config-history-dialog__storage-value">{{
                backupStorageLabel
              }}</span>
            </div>
            <el-progress
              :percentage="backupStoragePercent"
              :stroke-width="8"
              :show-text="false"
              :status="backupStorageStatus"
              class="config-history-dialog__storage-bar"
            />
          </div>

          <el-table
            stripe
            v-loading="loading || deleting"
            :data="tableRows"
            :tooltip-options="tableTooltipOptions"
            class="config-history-dialog__table"
          >
            <el-table-column
              prop="restorePointLabel"
              label="Restore Point"
              width="160"
              show-overflow-tooltip
            />
            <el-table-column label="Status" width="120">
              <template #default="{ row }">
                <span
                  class="config-history-dialog__status"
                  :class="
                    historyRow(row).status === 'current'
                      ? 'is-current'
                      : 'is-history'
                  "
                >
                  {{
                    historyRow(row).status === "current"
                      ? "Current"
                      : "Available"
                  }}
                </span>
              </template>
            </el-table-column>
            <el-table-column
              prop="originLabel"
              label="Origin"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column label="Created / Activated" min-width="180">
              <template #default="{ row }">
                <span>{{ formatDateTime(historyRow(row).activated_at) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="operatorDisplay"
              label="Operator"
              min-width="110"
              show-overflow-tooltip
            />
            <el-table-column
              prop="descriptionDisplay"
              label="Description"
              min-width="240"
              show-overflow-tooltip
            />
            <el-table-column label="Operation" width="300" fixed="right">
              <template #default="{ row }">
                <div class="config-history-dialog__operation">
                  <div
                    class="config-history-dialog__operation-item"
                    :class="{
                      'is-disabled': busy && exportingId !== historyRow(row).id,
                      'is-loading': exportingId === historyRow(row).id,
                    }"
                    @click="handleExport(historyRow(row))"
                  >
                    <AppIcon
                      name="i-tabler-download"
                      className="config-history-dialog__inline-icon"
                    />
                    <span class="config-history-dialog__operation-text">
                      {{
                        exportingId === historyRow(row).id
                          ? "Exporting..."
                          : "Export"
                      }}
                    </span>
                  </div>
                  <div
                    class="config-history-dialog__operation-item"
                    :class="{
                      'is-disabled':
                        busy ||
                        historyRow(row).status === 'current' ||
                        (restoring && restoringId !== historyRow(row).id) ||
                        (deleting && deletingId !== historyRow(row).id),
                      'is-loading':
                        restoring && restoringId === historyRow(row).id,
                    }"
                    @click="handleRestore(historyRow(row))"
                  >
                    <AppIcon
                      name="i-tabler-history"
                      className="config-history-dialog__inline-icon"
                    />
                    <span class="config-history-dialog__operation-text">
                      {{
                        restoring && restoringId === historyRow(row).id
                          ? "Restoring..."
                          : "Restore"
                      }}
                    </span>
                  </div>
                  <div
                    class="config-history-dialog__operation-item"
                    :class="{
                      'is-disabled':
                        busy ||
                        historyRow(row).status === 'current' ||
                        (deleting && deletingId !== historyRow(row).id) ||
                        (restoring && restoringId !== historyRow(row).id),
                      'is-loading':
                        deleting && deletingId === historyRow(row).id,
                    }"
                    @click="handleDelete(historyRow(row))"
                  >
                    <AppIcon
                      name="i-tabler-trash"
                      className="config-history-dialog__inline-icon"
                    />
                    <span class="config-history-dialog__operation-text">
                      {{
                        deleting && deletingId === historyRow(row).id
                          ? "Deleting..."
                          : "Delete"
                      }}
                    </span>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="config-history-dialog__pagination">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, prev, pager, next, sizes"
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </template>
    <template #dialog-footer>
      <el-button :disabled="restoring || deleting" @click="close">Close</el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ConfigOperationError } from '@/utils/configOperation';
import { ElMessage, ElMessageBox } from "element-plus";
import FormDialog from "@/components/dialog/FormDialog.vue";
import {
  deleteConfigVersion,
  downloadConfigVersionExport,
  restoreConfigVersion,
} from "@/api/systemConfig";
import type {
  ConfigVersionListData,
  ConfigVersionListItem,
  ConfigVersionStorage,
} from "@/types/systemConfig";
import { useTableData } from "@/composables/useTableData";
import { asTableRow } from "@/utils/tableRow";
import { formatDateTime } from "@/utils/date";
import {
  buildConfigDescriptionPayload,
  buildConfigExportFilename,
  formatBackupStorageLabel,
  formatRestorePointLabel,
  getBackupStorageProgressStatus,
  getConfigErrorMessage,
  getConfigOriginLabel,
  normalizeBackupStoragePercent,
  validateConfigDescription,
} from "@/utils/configVersion";

interface ConfigVersionTableRow extends ConfigVersionListItem {
  restorePointLabel: string;
  originLabel: string;
  operatorDisplay: string;
  descriptionDisplay: string;
}

const emit = defineEmits<{
  (e: "busy-change", busy: boolean): void;
}>();

const dialogRef = ref<InstanceType<typeof FormDialog> | null>(null);
const restoring = ref(false);
const restoringId = ref("");
const deleting = ref(false);
const deletingId = ref("");
const exportingId = ref("");
const {
  loading,
  tableData: items,
  responseData,
  pagination,
  fetchTableData: fetchVersions,
  handlePageSizeChange,
  handlePageChange,
} = useTableData<ConfigVersionListItem, ConfigVersionListData>({
  listUrl: "/api/v1/config/versions",
  defaultPageSize: 20,
  autoLoad: false,
  requestConfig: { skipGlobalLoading: true },
});
const storage = computed<ConfigVersionStorage | null>(
  () => responseData.value?.storage ?? null,
);

const busy = computed(
  () =>
    loading.value ||
    restoring.value ||
    deleting.value ||
    Boolean(exportingId.value),
);

const historyRow = (row: unknown): ConfigVersionListItem =>
  asTableRow<ConfigVersionListItem>(row);

const toTableRow = (item: ConfigVersionListItem): ConfigVersionTableRow => ({
  ...item,
  restorePointLabel: formatRestorePointLabel(item.version),
  originLabel: getConfigOriginLabel(item.origin),
  operatorDisplay: item.operator?.trim() || "-",
  descriptionDisplay: item.description?.trim() || "-",
});

const tableRows = computed(() => items.value.map(toTableRow));
const backupStorageLabel = computed(() =>
  formatBackupStorageLabel(storage.value),
);
const backupStoragePercent = computed(() =>
  normalizeBackupStoragePercent(storage.value?.used_percent),
);
const backupStorageStatus = computed(() =>
  getBackupStorageProgressStatus(storage.value?.used_percent),
);

// Element Plus mounts table overflow tooltips inside the table by default.
// This dialog is transformed for centering and its table can scroll horizontally,
// which makes that positioning context inaccurate. Mount the popper at the page
// root instead so it uses the cell's viewport coordinates.
const tableTooltipOptions = {
  appendTo: "body",
  placement: "top",
} as const;

const emitBusy = () => {
  emit(
    "busy-change",
    restoring.value || deleting.value || Boolean(exportingId.value),
  );
};

const open = () => {
  if (dialogRef.value) dialogRef.value.dialogVisible = true;
  void fetchVersions(true);
};

const close = () => {
  if (restoring.value || deleting.value) return;
  if (dialogRef.value) dialogRef.value.dialogVisible = false;
};

const handleDialogBeforeClose = (done: () => void) => {
  if (restoring.value || deleting.value) return;
  done();
};

const handleExport = async (row: ConfigVersionListItem) => {
  if (!row.id || busy.value) return;
  exportingId.value = row.id;
  emitBusy();
  try {
    await downloadConfigVersionExport(
      row.id,
      buildConfigExportFilename(row.version),
    );
  } catch (error) {
    ElMessage.error(getConfigErrorMessage(error, "Failed to export restore point"));
  } finally {
    exportingId.value = "";
    emitBusy();
  }
};

const handleRestore = async (row: ConfigVersionListItem) => {
  if (!row.id || row.status === "current" || busy.value) return;

  let description = "";
  try {
    const prompt = await ElMessageBox.prompt(
      "",
      `Restore ${formatRestorePointLabel(row.version)}`,
      {
        confirmButtonText: "Restore",
        cancelButtonText: "Cancel",
        center: true,
        inputPlaceholder: "Description (optional)",
        inputValidator: (value: string) => {
          const error = validateConfigDescription(value || "");
          return error || true;
        },
      },
    );
    description = String(prompt.value || "");
  } catch {
    return;
  }

  restoring.value = true;
  restoringId.value = row.id;
  emitBusy();
  try {
    const res = await restoreConfigVersion(
      row.id,
      buildConfigDescriptionPayload(description),
    );
    if (!res.success) {
      ElMessage.error("Failed to restore configuration");
      return;
    }
    void fetchVersions();
  } catch (error) {
    if (error instanceof ConfigOperationError) {
      if (error.result.status === 'recovered') void fetchVersions();
    } else {
      ElMessage.error(getConfigErrorMessage(error, "Failed to restore configuration"));
    }
  } finally {
    restoring.value = false;
    restoringId.value = "";
    emitBusy();
  }
};

const handleDelete = async (row: ConfigVersionListItem) => {
  if (!row.id || row.status === "current" || busy.value) return;

  try {
    await ElMessageBox.confirm(
      "This permanently removes the restore point archive. This action cannot be undone.",
      `Delete Restore Point ${formatRestorePointLabel(row.version)}`,
      {
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        type: "warning",
        center: true,
      },
    );
  } catch {
    return;
  }

  deleting.value = true;
  deletingId.value = row.id;
  emitBusy();
  try {
    const res = await deleteConfigVersion(row.id);
    if (!res.success) {
      ElMessage.error("Failed to delete restore point");
      return;
    }
    ElMessage.success(
      `Restore point ${formatRestorePointLabel(row.version)} deleted`,
    );
    await fetchVersions();
  } catch (error) {
    ElMessage.error(
      getConfigErrorMessage(error, "Failed to delete restore point"),
    );
  } finally {
    deleting.value = false;
    deletingId.value = "";
    emitBusy();
  }
};

defineExpose({
  open,
  close,
});
</script>

<style scoped lang="scss">
:global(.config-history-dialog-wrapper.el-dialog) {
  box-sizing: border-box;
  overflow: hidden;
}

:global(.config-history-dialog-wrapper .el-dialog__body) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.config-history-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.config-history-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.config-history-dialog__storage {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  flex: 0 0 auto;
  margin-bottom: $spacing-md;
  padding: $spacing-md;
  border: 1px solid $border-color-base;
  border-radius: $border-radius-base;
  background: $bg-color-overlay;
}

.config-history-dialog__storage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
}

.config-history-dialog__storage-label {
  flex-shrink: 0;
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.config-history-dialog__storage-value {
  font-size: $font-size-small;
  color: $text-color-secondary;
  text-align: right;
}

.config-history-dialog__storage-bar {
  width: 100%;
}

.config-history-dialog__table {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.config-history-dialog__status {
  font-size: $font-size-base;
  line-height: var(--vt-table-cell-inner-height);
}

.config-history-dialog__status.is-current {
  color: $success-color;
}

.config-history-dialog__status.is-history {
  color: $text-color-secondary;
}

.config-history-dialog__operation {
  display: flex;
  align-items: center;
  gap: 20px;
  white-space: nowrap;
}

.config-history-dialog__operation-item {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.config-history-dialog__inline-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
  object-fit: contain;
}

.config-history-dialog__operation-text {
  font-size: $font-size-base;
  color: $text-color-primary;
  line-height: var(--vt-table-cell-inner-height);
}

.config-history-dialog__operation-item:hover:not(.is-disabled):not(.is-loading)
  .config-history-dialog__operation-text {
  color: $primary-color;
}

.config-history-dialog__operation-item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.config-history-dialog__operation-item.is-loading {
  opacity: 0.65;
  cursor: wait;
  pointer-events: none;
}

.config-history-dialog__pagination {
  display: flex;
  flex: 0 0 72px;
  align-items: center;
  justify-content: flex-end;
  height: 72px;
}
</style>

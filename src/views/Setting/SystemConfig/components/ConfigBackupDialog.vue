<template>
  <FormDialog
    ref="dialogRef"
    title="Create Restore Point"
    width="480px"
    :before-close="handleDialogBeforeClose"
  >
    <template #dialog-body>
      <el-form class="config-backup-dialog" @submit.prevent>
        <el-form-item label="Description (optional):">
          <el-input
            v-model="description"
            :maxlength="CONFIG_DESCRIPTION_MAX_CHARS"
            :count-graphemes="countUnicodeChars"
            show-word-limit
            :disabled="saving"
            placeholder="e.g. Before site commissioning"
          />
        </el-form-item>
        <p class="config-backup-dialog__hint">
          This restore point stays on the current site for quick recovery. If
          the configuration has not changed, a duplicate restore point will not
          be created.
        </p>
      </el-form>
    </template>
    <template #dialog-footer>
      <el-button :disabled="saving" @click="close">Cancel</el-button>
      <el-button type="primary" :loading="saving" @click="handleBackup"
        >Create Restore Point</el-button
      >
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import FormDialog from "@/components/dialog/FormDialog.vue";
import { createConfigBackup } from "@/api/systemConfig";
import {
  CONFIG_DESCRIPTION_MAX_CHARS,
  buildConfigDescriptionPayload,
  countUnicodeChars,
  getConfigErrorMessage,
  validateConfigDescription,
} from "@/utils/configVersion";

const emit = defineEmits<{
  (e: "busy-change", busy: boolean): void;
  (e: "created"): void;
}>();

const dialogRef = ref<InstanceType<typeof FormDialog> | null>(null);
const description = ref("");
const saving = ref(false);

const setBusy = (busy: boolean) => {
  saving.value = busy;
  emit("busy-change", busy);
};

const reset = () => {
  description.value = "";
};

const open = () => {
  reset();
  if (dialogRef.value) dialogRef.value.dialogVisible = true;
};

const close = () => {
  if (saving.value) return;
  if (dialogRef.value) dialogRef.value.dialogVisible = false;
};

const handleDialogBeforeClose = (done: () => void) => {
  if (saving.value) return;
  done();
};

const handleBackup = async () => {
  const descriptionError = validateConfigDescription(description.value);
  if (descriptionError) {
    ElMessage.warning(descriptionError);
    return;
  }

  setBusy(true);
  try {
    const res = await createConfigBackup(
      buildConfigDescriptionPayload(description.value),
    );
    if (!res.success) {
      ElMessage.error("Failed to create restore point");
      return;
    }
    if (res.data?.created) {
      ElMessage.success("Restore point created");
      emit("created");
      if (dialogRef.value) dialogRef.value.dialogVisible = false;
      return;
    }
    if (res.data?.reason === "configuration_unchanged") {
      ElMessage.info(
        "Configuration unchanged; the latest restore point is already up to date",
      );
      if (dialogRef.value) dialogRef.value.dialogVisible = false;
      return;
    }
    ElMessage.info("No new restore point was created");
    if (dialogRef.value) dialogRef.value.dialogVisible = false;
  } catch (error) {
    ElMessage.error(
      getConfigErrorMessage(error, "Failed to create restore point"),
    );
  } finally {
    setBusy(false);
  }
};

defineExpose({
  open,
  close,
});
</script>

<style scoped lang="scss">
.config-backup-dialog {
  padding-top: $spacing-xs;
}

.config-backup-dialog__hint {
  margin: $spacing-sm 0 0;
  font-size: $font-size-small;
  line-height: 1.6;
  color: $text-color-secondary;
}
</style>

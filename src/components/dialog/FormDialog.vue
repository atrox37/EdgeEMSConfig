<template>
  <el-dialog
    v-model="dialogVisible"
    title=""
    :width="dialogWidth"
    :class="[dialogClass, dialogSizeClass]"
    :style="dialogStyle"
    :modal="true"
    :close-on-click-modal="false"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :before-close="handleBeforeClose"
    :append-to-body="appendToBody"
    @close="handleClose"
  >
    <!-- dialog-head 插槽，默认显示标题区 -->
    <template #header>
      <slot name="dialog-head">
        <div class="dialog-head">
          <img
            class="dialog-head-icon"
            src="../../assets/icons/card-icon.svg"
          />
          <span class="dialog-head-title">{{ props.title }}</span>
        </div>
      </slot>
    </template>

    <!-- dialog-body 插槽，默认显示主体内容 -->
    <template #default>
      <slot name="dialog-body"> </slot>
    </template>

    <!-- dialog-footer插槽，默认显示底部按钮 -->
    <template v-if="hasFooter" #footer>
      <slot name="dialog-footer"> </slot>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    width: number | string;
    size?: "fixed" | "wide" | "workspace";
    appendToBody?: boolean;
    dialogClass?: string;
    closeOnPressEscape?: boolean;
    showClose?: boolean;
    beforeClose?: (done: () => void) => void;
  }>(),
  {
    size: "fixed",
    appendToBody: false,
    dialogClass: "",
    closeOnPressEscape: true,
    showClose: true,
  },
);

const slots = useSlots();
const hasFooter = computed(() => Boolean(slots["dialog-footer"]?.().length));
const dialogWidth = computed(() => {
  if (props.size === "wide") return "clamp(960px, 75vw, 1280px)";
  if (props.size === "workspace") return "clamp(960px, 85vw, 1440px)";
  return props.width;
});
const dialogSizeClass = computed(() => `form-dialog--${props.size}`);
const dialogStyle = computed(() => {
  if (props.size === "wide") {
    return {
      height: "clamp(560px, 74vh, 760px)",
      maxHeight: "calc(100vh - 48px)",
    };
  }
  if (props.size === "workspace") {
    return {
      height: "clamp(600px, 84vh, 900px)",
      maxHeight: "calc(100vh - 32px)",
    };
  }
  return undefined;
});

const emit = defineEmits<{
  (e: "close"): void;
}>();

const dialogVisible = ref(false);

// 关闭弹窗
const handleClose = () => {
  emit("close");
};

// Element Plus only closes a dialog from the header close button when the
// before-close callback invokes `done`. Keep the forwarding explicit so the
// callback remains callable through this wrapper component.
const handleBeforeClose = (done: () => void) => {
  if (props.beforeClose) {
    props.beforeClose(done);
    return;
  }
  done();
};

// 暴露弹窗
defineExpose({
  dialogVisible,
});
</script>

<style lang="scss" scoped>
.dialog-head {
  display: flex;
  align-items: center;

  .dialog-head-icon {
    width: 20px;
    height: 20px;
    margin-right: 3px;
  }

  .dialog-head-title {
    font-weight: var(--vt-font-weight-bold);
    font-size: var(--vt-font-size-lg);
    line-height: 20px;
    letter-spacing: 0%;
    color: var(--vt-text-primary);
  }
}

:deep(.el-dialog) {
  position: absolute !important;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

:deep(.el-overlay) {
  position: absolute !important;
  top: -20px;
  left: -20px;
}

:global(.el-dialog.form-dialog--wide),
:global(.el-dialog.form-dialog--workspace) {
  display: flex;
  flex-direction: column;
}

:global(.el-dialog.form-dialog--wide .el-dialog__body),
:global(.el-dialog.form-dialog--workspace .el-dialog__body) {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

:global(.el-dialog.form-dialog--wide .el-dialog__body > *),
:global(.el-dialog.form-dialog--workspace .el-dialog__body > *) {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}
</style>

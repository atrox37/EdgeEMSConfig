<template>
  <el-dialog
    v-model="dialogVisible"
    title=""
    :width="width"
    :modal="true"
    :close-on-click-modal="false"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :before-close="beforeClose"
    :append-to-body="appendToBody"
    :class="dialogClass"
    @close="handleClose"
  >
    <!-- dialog-head��ۣ�Ĭ����ʾ���� -->
    <template #header>
      <slot name="dialog-head">
        <div class="dialog-head">
          <img class="dialog-head-icon" src="../../assets/icons/card-icon.svg" />
          <span class="dialog-head-title">{{ props.title }}</span>
        </div>
      </slot>
    </template>

    <!-- dialog-body��ۣ�Ĭ����ʾ�������� -->
    <template #default>
      <slot name="dialog-body"> </slot>
    </template>

    <!-- dialog-footer插槽，默认显示底部按钮 -->
    <template #footer>
      <slot name="dialog-footer"> </slot>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">

const props = withDefaults(defineProps<{
  title: string
  width: number | string
  appendToBody?: boolean
  dialogClass?: string
  closeOnPressEscape?: boolean
  showClose?: boolean
  beforeClose?: (done: () => void) => void
}>(), {
  appendToBody: false,
  dialogClass: '',
  closeOnPressEscape: true,
  showClose: true,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const dialogVisible = ref(false)

// 关闭弹窗
const handleClose = () => {
  emit('close')
}

// 暴露弹窗
defineExpose({
  dialogVisible,
})
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
    font-weight: $font-weight-bold;
    font-size: $font-size-large;
    line-height: 20px;
    letter-spacing: 0%;
    color: $text-color-primary;
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
</style>


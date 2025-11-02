<template>
  <el-dialog
    v-model="dialogVisible"
    :title="null"
    :modal="true"
    :close-on-click-modal="false"
    :append-to-body="true"
    :modal-append-to-body="true"
    fullscreen
  >
    <!-- dialog-head插槽，默认显示标题 -->
    <template #header>
      <slot name="dialog-head">
        <span>{{ props.title }}</span>
      </slot>
    </template>

    <!-- dialog-body插槽，默认显示表单内容 -->
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
const props = defineProps<{
  title: string
}>()
const dialogVisible = ref(false)
// 暴露方法和属性
defineExpose({
  dialogVisible,
})
</script>

<style scoped lang="scss"></style>

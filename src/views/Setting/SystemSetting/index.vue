<template>
  <div class="voltage-class system-setting">
    <div class="system-setting-left">
      <TimeSetting />
    </div>
    <div class="system-setting-right">
      <DataUpdataSetting />
    </div>
  </div>
</template>

<script setup lang="ts">
import TimeSetting from './TimeSetting.vue'
import DataUpdataSetting from './DataUpdataSetting.vue'
</script>

<style scoped lang="scss">
.system-setting {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;

  .system-setting-left,
  .system-setting-right {
    width: calc((50% - 10px));
    height: 312px;
  }
}
</style>

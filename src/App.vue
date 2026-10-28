<script setup lang="ts">
import en from 'element-plus/es/locale/lang/en'
import UpdateChecker from '@/components/UpdateChecker.vue'
import TitleBar from '@/layout/TitleBar.vue'
import ConfigOperationDialog from '@/components/dialog/ConfigOperationDialog.vue'
import { useConfigOperationStore } from '@/stores/configOperation'

const configOperation = useConfigOperationStore()

const locale = {
  ...en,
  el: {
    ...en.el,
    pagination: {
      ...en.el.pagination,
      total: 'A total of {total} items',
    },
  },
}
</script>

<template>
  <el-config-provider :locale="locale">
    <div class="app-shell" :inert="configOperation.busy || undefined">
      <TitleBar />
      <div class="app-shell__body">
        <router-view />
      </div>
    </div>
    <UpdateChecker />
    <ConfigOperationDialog />
  </el-config-provider>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}

#app {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: relative;
}

.app-shell {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-shell__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

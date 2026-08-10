<template>
  <div class="system-config-shell">
    <div class="system-config-shell__header">
      <PageTitle title="System Config" />
    </div>

    <el-tabs v-model="activeTab" class="system-config-shell__tabs" @tab-change="handleTabChange">
      <el-tab-pane name="network">
        <template #label>
          <span class="system-config-shell__tab-label">
            <AppIcon name="i-tabler-network" className="system-config-shell__tab-icon" />
            <span>Network</span>
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="storage">
        <template #label>
          <span class="system-config-shell__tab-label">
            <AppIcon name="i-tabler-database" className="system-config-shell__tab-icon" />
            <span>Storage</span>
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="mqtt">
        <template #label>
          <span class="system-config-shell__tab-label">
            <AppIcon name="i-tabler-wifi" className="system-config-shell__tab-icon" />
            <span>MQTT</span>
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="tools">
        <template #label>
          <span class="system-config-shell__tab-label">
            <AppIcon name="i-tabler-tool" className="system-config-shell__tab-icon" />
            <span>Config Files & Upgrade</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <div class="system-config-shell__content" :class="{ 'is-tools': activeTab === 'tools' }">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PageTitle from '@/components/common/PageTitle.vue'

type SystemConfigTab = 'network' | 'storage' | 'mqtt' | 'tools'

const route = useRoute()
const router = useRouter()

const tabPathMap: Record<SystemConfigTab, string> = {
  network: '/systemConfig/network',
  storage: '/systemConfig/storage',
  mqtt: '/systemConfig/mqtt',
  tools: '/systemConfig/tools',
}

const isSystemConfigTab = (value: string): value is SystemConfigTab =>
  ['network', 'storage', 'mqtt', 'tools'].includes(value)

const activeTab = computed<SystemConfigTab>({
  get() {
    const maybeTab = String(route.path.split('/').pop() || '').toLowerCase()
    return isSystemConfigTab(maybeTab) ? maybeTab : 'network'
  },
  set(tab) {
    const targetPath = tabPathMap[tab]
    if (targetPath && route.path !== targetPath) {
      router.push(targetPath)
    }
  },
})

const handleTabChange = (name: string | number) => {
  const tabName = String(name).toLowerCase()
  if (!isSystemConfigTab(tabName)) return
  activeTab.value = tabName
}
</script>

<style scoped lang="scss">
.system-config-shell {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;

}

.system-config-shell__header {
  height: 64px;
  display: flex;
  align-items: center;
}

.system-config-shell__tabs {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.system-config-shell__content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

.system-config-shell__content.is-tools {
  width: 100%;
}

.system-config-shell__content.is-tools :deep(.system-tools) {
  width: 100%;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__header) {
  margin: 0;
  // height: 46px !important;
  // min-height: 46px;
  box-sizing: border-box;
  // padding: 4px;
  // border: 1px solid var(--vt-border-color);
  border-radius: var(--vt-radius-sm);
  background: var(--vt-bg-elevated);
  box-shadow: 0 2px 6px rgba(53, 76, 123, 0.08);
  overflow: hidden;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav-wrap),
.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav-scroll) {
  height: 36px;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scrollbar-width: none;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav-wrap::-webkit-scrollbar),
.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav-scroll::-webkit-scrollbar) {
  display: none;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav) {
  border: none !important;
  display: flex;
  gap: var(--vt-space-3);
  height: 36px;
  line-height: 36px;
  min-width: max-content;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item) {
  position: relative;
  height: 36px;
  line-height: 36px;
  padding: 0 18px;
  margin: 0;
  border: 1px solid transparent;
  border-radius: var(--vt-radius-sm);
  color: var(--vt-text-primary) !important;
  background: transparent;
  font-weight: var(--vt-font-weight-medium);
  white-space: nowrap;
  transition: color var(--vt-transition-fast), background-color var(--vt-transition-fast),
    border-color var(--vt-transition-fast), box-shadow var(--vt-transition-fast);
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item:hover) {
  color: var(--vt-color-primary) !important;
  background: #fff;
  border-color: var(--vt-border-color-soft);
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item:last-child) {
  margin-right: 0;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item.is-active) {
  color: #fff !important;
  border-color: var(--vt-color-primary);
  background: var(--vt-color-primary);
  box-shadow: 0 3px 8px rgba(255, 105, 0, 0.24);
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item:focus-visible) {
  outline: 2px solid color-mix(in srgb, var(--vt-color-primary) 45%, transparent);
  outline-offset: -2px;
}

.system-config-shell__tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.system-config-shell__tab-icon {
  font-size: 16px;
  color: inherit;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__content) {
  display: none;
}
</style>

<template>
  <div class="system-config-shell">
    <div class="system-config-shell__header">
      <h2 class="system-config-shell__title">System Config</h2>
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
  margin-bottom: 12px;
}

.system-config-shell__title {
  margin: 0;
  font-size: $font-size-large;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.system-config-shell__tabs {
  flex-shrink: 0;
  margin-bottom: 12px;
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
  border: none;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}
.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav-wrap),
.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav-scroll) {
  overflow: visible !important;
}
.system-config-shell .system-config-shell__tabs :deep(.el-tabs__nav) {
  border: none !important;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item) {
  height: 30px;
  line-height: 30px;
  padding: 0 16px;
  margin-right: 8px;
  border: 1px solid $border-color-base;
  border-radius: 6px;
  color: $text-color-primary;
  background: #fff;
  font-weight: $font-weight-medium;
  white-space: nowrap;
  // Keep a visible right/bottom "edge" for 3D block feeling.
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    2px 2px 0 rgba(15, 23, 42, 0.18),
    3px 3px 8px rgba(15, 23, 42, 0.12);
  transform: translateY(0);
  transition: box-shadow 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item:hover) {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    3px 3px 0 rgba(15, 23, 42, 0.2),
    4px 4px 10px rgba(15, 23, 42, 0.16);
  transform: translateY(-1px);
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item:last-child) {
  margin-right: 0;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__item.is-active) {
  color: #fff;
  border-color: $primary-color;
  background: $primary-color;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    2px 2px 0 rgba($primary-color, 0.7),
    4px 4px 12px rgba($primary-color, 0.32);
  transform: translateY(0);
}

.system-config-shell__tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.system-config-shell__tab-icon {
  font-size: 14px;
  color: inherit;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.system-config-shell .system-config-shell__tabs :deep(.el-tabs__content) {
  display: none;
}
</style>

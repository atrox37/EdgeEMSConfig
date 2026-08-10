<template>
  <div class="voltage-class sidebar" :class="{ collapse: globalStore.isCollapse }">
    <div class="sidebar__header" :class="{ collapse: globalStore.isCollapse }">

      <img :src="sidebarLogo" alt="sidebar-logo" class="sidebar__header-img"
        :class="{ collapse: globalStore.isCollapse }" />

    </div>

    <nav class="sidebar__nav">
      <el-menu :collapse="globalStore.isCollapse" class="sidebar__menu" :default-active="activeMenuPath" router
        background-color="transparent" text-color="#ffffff" active-text-color="#ffffff" :unique-opened="true">
        <template v-for="item in filterRoutesList" :key="item.path">
          <el-sub-menu v-if="item.meta?.isSubMenu" :index="(item.meta?.activeNav as string) || item.path"
            class="sidebar__subMenu">
            <template #title>
              <component v-if="item.meta?.icon" :is="item.meta.icon" class="sidebar__subMenu-img"
                :class="{ collapse: globalStore.isCollapse }" />
              <span v-show="!globalStore.isCollapse" class="sidebar__subMenu-title">{{ item.meta?.title || '' }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.path"
              :index="(child.meta?.activeNav as string) || child.path">
              <span>{{ child.meta?.title || '' }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="(item.meta?.activeNav as string) || item.path" class="sidebar__menu-item">
            <component v-if="item.meta?.icon" :is="item.meta.icon" class="sidebar__subMenu-img"
              :class="{ collapse: globalStore.isCollapse }" />
            <span v-show="!globalStore.isCollapse" class="sidebar__menu-text">{{ item.meta?.title || '' }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useGlobalStore } from '@/stores/global'
import { useRoute, useRouter } from 'vue-router'
import sidebarLogo from '@/assets/icons/sidebar-logo.svg'

const globalStore = useGlobalStore()

const route = useRoute()
const router = useRouter()

// 从静态路由中获取有效的路由列表

const filterRoutesList = computed(() => {
  const mainRoute = router.getRoutes().find((r) => r.name === 'main')
  return (mainRoute?.children || []).filter((route) => !route.meta?.hidden)
})

const activeMenuPath = ref<string>('/channelConfiguration')

// 路由变化时，更新激活菜单路径

watch(
  route,
  (newPath) => {
    // console.log(newPath)
    activeMenuPath.value = newPath.meta.activeNav as string
  },
  { immediate: true },
)

</script>

<style lang="scss" scoped>
.voltage-class.sidebar {
  position: relative;
  height: 100%;
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  width: 220px;
  min-width: 220px;
  flex-shrink: 0;
  transition: width var(--vt-transition-base);
  background: var(--vt-color-secondary);

  // Monarch Logo
  .sidebar__header {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    // padding: var(--vt-space-4) var(--vt-space-2);
    margin-bottom: 30px;

    .sidebar__header-img {
      width: 100px;
      height: 68px;
      object-fit: contain;
      transition: opacity var(--vt-transition-base);

      &.collapse {
        width: 50px;
        height: 34px;
      }
    }


  }

  .sidebar__logo-container.collapse {
    padding: var(--vt-space-2);

    .sidebar__monarch-logo {
      max-width: 32px;
    }
  }

  .sidebar__logo {
    display: flex;
    align-items: center;
    gap: var(--vt-space-4);

    .sidebar__logo-text {
      font-size: var(--vt-font-size-lg);
      font-weight: var(--vt-font-weight-semibold);
      color: #ffffff;
      font-family: var(--vt-font-family-heading);
    }
  }

  .sidebar__nav {
    flex: 1;
    padding: 20px; // 顶部偏移一点
    overflow-y: auto;

    .sidebar__subMenu-img {
      width: 20px;
      height: 20px;
      
    }

    .sidebar__menu-text {
      margin-left: 10px;
      font-weight: var(--vt-font-weight-semibold); // 字体加粗
      font-size: var(--vt-font-size-sm); // 字体大小
    }
  }
  .sidebar__subMenu-title {
    font-family: var(--vt-font-family-base);
    font-weight: var(--vt-font-weight-bold); // 字体加粗
    font-style: normal;
    font-size: var(--vt-font-size-sm); // 字体大小
    letter-spacing: 0%;
    color: #ffffff;
  }
}

.voltage-class.sidebar.collapse {
  width: 85px;
  min-width: 85px;

  .sidebar__nav {
    // padding: 2px 2px 0 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    // justify-content: center;
  }
}
</style>

<template>
  <div class="voltage-class sidebar" :class="{ collapse: globalStore.isCollapse }">
    <!-- Monarch Logo -->
    <div class="sidebar__logo-container" :class="{ collapse: globalStore.isCollapse }">
      <img src="@/assets/icons/menu-logo.svg" alt="Monarch Logo" class="sidebar__monarch-logo" />
    </div>

    <nav class="sidebar__nav">
      <el-menu :collapse="globalStore.isCollapse" class="sidebar__menu" :default-active="activeMenuPath" router
        background-color="transparent" text-color="#033b6c" active-text-color="#ffffff" :unique-opened="true">
        <template v-for="item in filterRoutesList" :key="item.path">
          <el-sub-menu
            v-if="item.meta?.isSubMenu"
            :index="(item.meta?.activeNav as string) || item.path"
            class="sidebar__subMenu"
          >
            <template #title>
              <component
                v-if="item.meta?.icon"
                :is="item.meta.icon"
                class="sidebar__icon"
                :class="{ collapse: globalStore.isCollapse }"
              />
              <span class="sidebar__subMenu-title">{{ item.meta?.title || '' }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.path" :index="(child.meta?.activeNav as string) || child.path">
              <span>{{ child.meta?.title || '' }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item
            v-else
            :index="(item.meta?.activeNav as string) || item.path"
            class="sidebar__menu-item"
          >
            <component
              v-if="item.meta?.icon"
              :is="item.meta.icon"
              class="sidebar__icon"
              :class="{ collapse: globalStore.isCollapse }"
            />
            <span class="sidebar__menu-text">{{ item.meta?.title || '' }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useGlobalStore } from '@/stores/global'
import { useRoute, useRouter } from 'vue-router'

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
  padding: 0;
  // background: $bg-color-dark-12;
  // border-right: $border-width-base solid $border-color-base;
  // border-image-source: linear-gradient(147.24deg,
  //     rgba(148, 166, 197, 0.72) 39.16%,
  //     rgba(148, 166, 197, 0.36) 66.27%,
  //     rgba(148, 166, 197, 0.72) 98.58%);
  // backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  width: 180px;
  min-width: 180px;
  flex-shrink: 0;
  transition: width $transition-base;

  // Monarch Logo
  .sidebar__logo-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: $spacing-md $spacing-sm;
    margin-bottom: $spacing-md;

    .sidebar__monarch-logo {
      max-width: 140px;
      height: auto;
      object-fit: contain;
      transition: opacity $transition-base;
    }

  }

  .sidebar__logo-container.collapse {
    padding: $spacing-sm;

    .sidebar__monarch-logo {
      max-width: 32px;
    }
  }

  .sidebar__logo {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    .sidebar__logo-text {
      font-size: $font-size-large;
      font-weight: $font-weight-semibold;
      color: $secondary-color;
      font-family: $font-family-montserrat;
    }
  }

  .sidebar__nav {
    flex: 1;
    padding: 30px 16px 0 16px; // 顶部偏移一点
    overflow-y: auto;
    :deep(.el-menu-item) {
      height: 36px;
      line-height: 36px;
      padding-left: $spacing-md;
      font-size: $font-size-small;
    }
    
    :deep(.el-sub-menu__title) {
      height: 36px;
      line-height: 36px;
      // padding-left: $spacing-md !important;
      font-size: $font-size-small;
    }
  }

  .sidebar__icon {
    width: 16px;
    height: 16px;
    min-width: 16px;
    min-height: 16px;
    margin-right: $spacing-xs;
    color: $secondary-color;
    display: inline-flex;
    flex-shrink: 0;
  }

  .sidebar__icon.collapse {
    margin-right: 0;
  }

  .sidebar__menu-text {
    font-weight: $font-weight-semibold; // 字体加粗
    font-size: $font-size-small; // 字体大小
  }

  .sidebar__subMenu-title {
    font-family: $font-family-base;
    font-weight: $font-weight-bold; // 字体加粗
    font-style: normal;
    font-size: $font-size-small; // 字体大小
    letter-spacing: 0%;
    color: $secondary-color;
  }



  :deep(.el-menu-item.is-active .sidebar__menu-text),
  :deep(.el-sub-menu.is-active > .el-sub-menu__title .sidebar__subMenu-title) {
    color: #ffffff;
    font-weight: $font-weight-bold;
  }

  :deep(.el-menu-item.is-active .sidebar__icon),
  :deep(.el-sub-menu.is-active > .el-sub-menu__title .sidebar__icon) {
    color: #ffffff;
  }
}

.voltage-class.sidebar.collapse {
  width: 48px;
  min-width: 48px;

  .sidebar__nav {
    padding: 2px 2px 0 2px;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    justify-content: center;
    padding-left: 0 !important;
  }

  :deep(.el-menu-item .sidebar__icon),
  :deep(.el-sub-menu__title .sidebar__icon) {
    margin-right: 0;
  }
}
</style>






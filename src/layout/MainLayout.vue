<template>
  <div class="voltage-class main-layout">
    <div class="main-layout__container">
      <div class="main-layout__left">
        <!-- 顶部菜单 -->
        <Sidebar />
      </div>
      <div
        class="main-layout__right"
        :class="{ collapse: globalStore.isCollapse }"
      >
        <!-- 头部 -->
        <!-- <Header /> -->
        <!-- 自动生成 -->
        <main
          class="main-layout__content"
          :class="{ collapse: globalStore.isCollapse }"
        >
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from "vue";
import Sidebar from "./Sidebar.vue";
import { useGlobalStore } from "@/stores/global";
import { useResponsive } from "@/composables/useResponsive";
import { useUserStore } from "@/stores/user";
import wsManager from "@/utils/websocket";

const globalStore = useGlobalStore();
const userStore = useUserStore();
const { isMobile } = useResponsive();

// 用户设置的折叠状态
const userPreferredCollapse = ref<boolean | null>(null);

// 移动端自动折叠/展开 Sidebar
watch(
  isMobile,
  (mobile) => {
    if (mobile) {
      globalStore.isCollapse = true;
    } else {
      if (userPreferredCollapse.value !== null) {
        globalStore.isCollapse = userPreferredCollapse.value;
      } else {
        globalStore.isCollapse = false;
      }
    }
  },
  { immediate: true }
);

// 登录后初始化 WebSocket（基于用户设置的地址）
watch(
  () => userStore.isLoggedIn,
  async (loggedIn) => {
    if (loggedIn) {
      try {
        await wsManager.initFromApiConfig();
        if (!wsManager.isConnected.value && !wsManager.isConnecting.value) {
          await wsManager.connect();
        }
      } catch (error) {
        console.warn("[WebSocket] Initialize failed:", error);
      }
    }
  },
  { immediate: true }
);

watch(
  () => globalStore.isCollapse,
  (newVal) => {
    if (!isMobile.value) {
      userPreferredCollapse.value = newVal;
    }
  }
);
</script>

<style lang="scss" scoped>

.voltage-class.main-layout {
  height: 100vh;
  width: 100vw;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: $bg-gradient-page; // 使用渐变背景，从浅蓝色到深蓝色
  overflow: hidden;

  // 主布局容器(主内容区域)
  .main-layout__container {
    flex: 1;
    display: flex;
    padding-top: 32px; // 顶部高度
    height: calc(100vh - 32px);
  }

  .main-layout__left {
    flex-shrink: 0;
    z-index: 99;
  }

  .main-layout__right {
    position: relative;
    transition: width $transition-base;
    width: calc(100% - 180px);
    height: 100%;
  }

  .main-layout__right.collapse {
    width: calc(100% - 48px);
  }

  .main-layout__content {
    height: calc(100% - 10px);
    width: calc(100% - 10px);
    margin: 5px;
    border-radius: 10px;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
    overflow-y: auto;
    padding: 10px;
    background: rgba(255, 255, 255, 0.8);
  }
}

/* 移除未登录模式下的主内容区域，重定向到 /login */
</style>

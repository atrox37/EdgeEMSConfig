<template>
  <div class="voltage-class main-layout">
    <!-- 自动生成 -->
    <TitleBar />

    <!-- 自动生成 -->
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
import TitleBar from "@/layout/TitleBar.vue";
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
      // 移动端模式自动折叠
      globalStore.isCollapse = true;
    } else {
      // 退出移动端模式，如果用户没有设置折叠状态，则默认展开
      if (userPreferredCollapse.value !== null) {
        globalStore.isCollapse = userPreferredCollapse.value;
      } else {
        // 用户没有设置折叠状态，默认展开
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

// 用户设置的折叠状态控制 Sidebar 折叠按钮
// 需要通过 watch globalStore.isCollapse 来控制 Sidebar.vue 中的折叠状态
// 需要一个标志来记录是否已经处理过折叠状态的变化
watch(
  () => globalStore.isCollapse,
  (newVal) => {
    // 只在移动端模式下，如果用户没有设置折叠状态，则默认展开
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
    // width: 180px;
    z-index: 99;
  }

  .main-layout__right {
    position: relative;
    transition: width $transition-base;
    width: calc(100% - 180px);
    height: 100%;
    &.collapse {
      width: calc(100% - 48px);
    }

    .main-layout__content {
      height: calc(100% - 10px);
      width: calc(100% - 10px);
      margin:5px;
      border-radius: 10px;
      box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
      border: 1px solid $border-color-base;
      overflow-y: auto;
      padding: 10px;
      background: rgba(255, 255, 255, 0.8); // 确保内容区域使用半透明的白色背景
    }
  }
}

/* 移除未登录模式下的主内容区域，重定向到 /login */
</style>

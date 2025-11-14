<template>
  <div class="voltage-class main-layout">
    <!-- 自定义标题栏 -->
    <TitleBar />

    <!-- 主体内容区域 -->
    <div class="main-layout__container">
      <div class="main-layout__left">
        <!-- 侧边导航栏 -->
        <Sidebar />
      </div>
      <div
        class="main-layout__right"
        :class="{ collapse: globalStore.isCollapse }"
      >
        <!-- 头部 -->
        <!-- <Header /> -->
        <!-- 主内容区域 -->
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
import { computed, watch, ref, type Ref } from "vue";
import { useRoute } from "vue-router";
import Sidebar from "./Sidebar.vue";
import TitleBar from "@/layout/TitleBar.vue";
import { useGlobalStore } from "@/stores/global";
import { useResponsive } from "@/composables/useResponsive";
import { useUserStore } from "@/stores/user";

const globalStore = useGlobalStore();
const userStore = useUserStore();
const { isMobile } = useResponsive();

// 保存用户手动设置的折叠状态
const userPreferredCollapse = ref<boolean | null>(null);

// 监听移动端断点变化，自动折叠/展开 Sidebar
watch(
  isMobile,
  (mobile) => {
    if (mobile) {
      // 进入移动端模式，自动折叠
      globalStore.isCollapse = true;
    } else {
      // 退出移动端模式，恢复用户偏好设置
      if (userPreferredCollapse.value !== null) {
        globalStore.isCollapse = userPreferredCollapse.value;
      } else {
        // 如果没有用户偏好，默认展开
        globalStore.isCollapse = false;
      }
    }
  },
  { immediate: true }
);

// 监听用户手动操作 Sidebar 折叠按钮
// 这需要在 Sidebar.vue 中触发事件，或者我们可以通过 watch globalStore.isCollapse 来检测
// 但要区分是自动折叠还是用户手动折叠，我们需要一个标志
watch(
  () => globalStore.isCollapse,
  (newVal) => {
    // 只在非移动端模式下保存用户偏好
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
  min-width: 920px;
  min-height: 630px;
  display: flex;
  flex-direction: column;
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  background-image: url("../assets/images/simple-bg.png");
  overflow: hidden;

  // 主体内容容器(标题栏下方)
  .main-layout__container {
    flex: 1;
    display: flex;
    padding-top: 40px; // 标题栏高度
    height: calc(100vh - 40px);
  }

  .main-layout__left {
    z-index: 99;
  }

  .main-layout__right {
    position: relative;
    transition: width 0.3s ease-in-out;
    width: calc(100% - 220px);
    height: 100%;
    &.collapse {
      width: calc(100% - 85px);
    }

    .main-layout__content {
      padding: 20px;
      height: 100%;
      width: 100%;
      overflow-y: auto;
    }
  }
}

/* 移除未登录模糊锁定，由路由守卫控制跳转到 /login */
</style>

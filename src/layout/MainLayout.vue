<template>
  <div class="voltage-class main-layout">
    <!-- �Զ�������� -->
    <TitleBar />

    <!-- ������������ -->
    <div class="main-layout__container">
      <div class="main-layout__left">
        <!-- ��ߵ����� -->
        <Sidebar />
      </div>
      <div
        class="main-layout__right"
        :class="{ collapse: globalStore.isCollapse }"
      >
        <!-- ͷ�� -->
        <!-- <Header /> -->
        <!-- ���������� -->
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

// �����û��ֶ����õ��۵�״̬
const userPreferredCollapse = ref<boolean | null>(null);

// �����ƶ��˶ϵ�仯���Զ��۵�/չ�� Sidebar
watch(
  isMobile,
  (mobile) => {
    if (mobile) {
      // �����ƶ���ģʽ���Զ��۵�
      globalStore.isCollapse = true;
    } else {
      // �˳��ƶ���ģʽ���ָ��û�ƫ������
      if (userPreferredCollapse.value !== null) {
        globalStore.isCollapse = userPreferredCollapse.value;
      } else {
        // ���û���û�ƫ�ã�Ĭ��չ��
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
        console.warn("[WebSocket] 初始化失败:", error);
      }
    }
  },
  { immediate: true }
);

// �����û��ֶ����� Sidebar �۵���ť
// ����Ҫ�� Sidebar.vue �д����¼����������ǿ���ͨ�� watch globalStore.isCollapse �����
// ��Ҫ�������Զ��۵������û��ֶ��۵���������Ҫһ����־
watch(
  () => globalStore.isCollapse,
  (newVal) => {
    // ֻ�ڷ��ƶ���ģʽ�±����û�ƫ��
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
  background: $bg-gradient-page; // ʹ�ý��䱳�����Ӹ�����ɫ����ɫ�����ϵ����£���ɫ�Ӷ�
  overflow: hidden;

  // ������������(�������·�)
  .main-layout__container {
    flex: 1;
    display: flex;
    padding-top: 32px; // �������߶�
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
      background: rgba(255, 255, 255, 0.8); // ȷ������͸�����ø����Ľ��䱳����ʾ����
    }
  }
}

/* �Ƴ�δ��¼ģ����������·������������ת�� /login */
</style>

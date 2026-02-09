<template>
  <div class="voltage-class loginPage">
    <TitleBar />
    <div class="loginPage__init-button">
      <el-button type="primary" @click="openInitDialog">初始化项目</el-button>
    </div>
    <div ref="loginFormContainer" class="loginPage__form">
      <ModuleCard title="Monarch">
        <div class="loginPage__form-content">
          <el-form @keyup.enter="handleLogin(formRef)" :model="form" label-position="top" ref="formRef" :rules="formRules">
            <el-form-item label="Username" prop="username">
              <el-input v-model="form.username" />
            </el-form-item>
            <el-form-item label="Password" prop="password">
              <el-input v-model="form.password" type="password" />
            </el-form-item>
            <el-button type="primary" @click="handleLogin(formRef)" :loading="isLoading"
              >Log in</el-button
            >
          </el-form>
        </div>
      </ModuleCard>
    </div>
    <InitProjectDialog ref="initDialogRef" />
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { LoginParams } from '@/types/user'
import { useRouter } from 'vue-router'
import TitleBar from '@/layout/TitleBar.vue'
import InitProjectDialog from './components/InitProjectDialog.vue'
// import wsManager from '@/utils/websocket'

const router = useRouter()
const formRef = ref<FormInstance>()
const loginFormContainer = ref()
const initDialogRef = ref<InstanceType<typeof InitProjectDialog>>()
const form = reactive<LoginParams>({
  username: '',
  password: '',
})
const isLoading = ref(false)

const openInitDialog = () => {
  initDialogRef.value?.open()
}
const formRules = reactive<FormRules<LoginParams>>({
  username: [{ required: true, message: 'Please enter your username', trigger: 'blur' }],
  password: [
    { required: true, message: 'Please enter your password', trigger: 'blur' },
    // {
    //   pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,12}$/,
    //   message: 'Password must be 6-12 characters and include both letters and numbers',
    //   trigger: 'blur',
    // },
  ],
})
const userStore = useUserStore()

const handleLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formEl.validate(async (valid: boolean) => {
    try {
      if (valid) {
        isLoading.value = true
        const res = await userStore.login(form)
        if (res.success) {
          
          const userInfo = await userStore.getUserInfo()
          if (userInfo.success) {
            // wsManager.connect()
            
            const redirect = router.currentRoute.value.query.redirect as string
            
            if (redirect) router.replace({ path: redirect })
            else router.replace({ path: '/' })
          }
        }
        // ����������ӵ�¼�����߼�
      } else {
        console.log('����У��δͨ��')
      }
    } catch (error) {
      console.error('��¼ʧ��:', error)
    } finally {
      isLoading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>

.voltage-class.loginPage {
  width: 100%;
  height: 100%;
  background: $bg-color-page;
  position: relative;
  overflow: hidden;
  background-image: url('../../assets/images/login-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: $border-width-base solid;

  border-image-source: $border-gradient-base;

  // ����������
  .loginPage__header {
    width: 100%;
    display: flex;
    align-items: center;
    background: $bg-color-input;
    border-bottom: $border-width-base solid $border-color-base;

    .loginPage__head-title {
      height: 100%;
      display: flex;
      align-items: center;
      margin-left: 30px;

      .loginpage__head-icon {
        width: $size-lg;
        height: $size-lg;
        background-image: url('../../assets/images/login-logo.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }

      .loginPage__head-text {
        font-family: $font-family-montserrat;
        font-weight: $font-weight-semibold;
        font-size: 30px;
        line-height: 1.5em;
        color: $text-color-primary;
      }
    }

    .loginPage__form-button {
      margin-top: 20px;
    }
  }

  // 初始化项目按钮
  .loginPage__init-button {
    position: absolute;
    top: 50px;
    right: 30px;
    z-index: 10;
  }

  // ��¼��������
  .loginPage__form {
    position: absolute;
    top: 50%;
    right: 30px;
    width: 324px;
    transform: translateY(-50%);
    .loginPage__form-content {
      padding: 40px 21px;
    }
  }
}

:deep(.el-button.el-button--primary) {
  height: $height-base;
  width: $width-input-base;
  margin-top: 20px;
}

:deep(.el-form-item__label::before) {
  display: none !important;
}

:deep(.el-form-item .el-form-item__label) {
  height: 22px !important;
}
</style>



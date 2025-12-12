<template>
  <div class="voltage-class loginPage">
    <TitleBar />
    <div ref="loginFormContainer" class="loginPage__form">
      <ModuleCard title="Monarch">
        <div class="loginPage__form-content">
          <el-form :model="form" label-position="top" ref="formRef" :rules="formRules">
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
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { LoginParams } from '@/types/user'
import { useRouter } from 'vue-router'
import TitleBar from '@/layout/TitleBar.vue'
// import wsManager from '@/utils/websocket'

const router = useRouter()
const formRef = ref<FormInstance>()
const loginFormContainer = ref()
const form = reactive<LoginParams>({
  username: '',
  password: '',
})
const isLoading = ref(false)
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
        // 这里可以添加登录请求逻辑
      } else {
        console.log('表单校验未通过')
      }
    } catch (error) {
      console.error('登录失败:', error)
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
  background: #02081a;
  position: relative;
  overflow: hidden;
  background-image: url('../../assets/images/login-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid;

  border-image-source: linear-gradient(
    117.31deg,
    rgba(148, 166, 197, 0.3) 2.77%,
    rgba(148, 166, 197, 0) 32.18%,
    rgba(148, 166, 197, 0.103266) 72.63%,
    rgba(148, 166, 197, 0.3) 99.05%
  );

  // 顶部标题栏
  .loginPage__header {
    width: 100%;
    height: 84px;
    display: flex;
    align-items: center;
    background: rgba(84, 98, 140, 0.3);
    border-bottom: 1px solid rgba(148, 166, 197, 0.3);

    .loginPage__head-title {
      height: 100%;
      display: flex;
      align-items: center;
      margin-left: 30px;

      .loginpage__head-icon {
        width: 24px;
        height: 24px;
        background-image: url('../../assets/images/login-logo.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }

      .loginPage__head-text {
        // margin-left: 0.2rem;
        font-family: 'Montserrat', sans-serif;
        font-weight: 600;
        font-size: 30px;
        line-height: 1.5em;
        color: #ffffff;
      }
    }

    .loginPage__form-button {
      margin-top: 20px;
    }
  }

  // 登录表单区域
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
  height: 32px;
  width: 240px;
  margin-top: 20px;
}

:deep(.el-form-item__label::before) {
  display: none !important;
}

// :deep(.el-select__popper.el-popper) {
//   top: 1.66rem !important;
// }

:deep(.el-form-item .el-form-item__label) {
  height: 22px !important;
}
</style>

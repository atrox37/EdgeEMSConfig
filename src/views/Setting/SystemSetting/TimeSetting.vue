<template>
  <div class="voltage-class time-setting">
    <ModuleCard title="Time Setting:" :isShowFooter="true">
      <el-form
        ref="formRef"
        :model="formData"
        class="time-setting-form"
        label-width="135px"
        label-position="right"
        :rules="rules"
      >
        <el-form-item label="Time Zone:" prop="timeZone">
          <div class="time-setting-form-item" ref="timeSettingFormItemRef">
            <el-select
              v-model="formData.timeZone"
              placeholder="Please select"
            >
              <el-option label="GMT+8" value="GMT+8" />
              <el-option label="UTC-0" value="UTC-0" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="Synchronization:" prop="Synchronization">
          <el-radio-group v-model="formData.synchronization">
            <el-radio label="auto">auto</el-radio>
            <el-radio label="manual">Manual</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="card__content-footer">
          <!-- <el-button type="primary">Detail</el-button> -->
          <!-- <IconButton
            type="primary"
            :icon="submitIcon"
            text="Submit"
            custom-class="card__content-footer-button"
          /> -->
          <el-button type="primary">Submit</el-button>
        </div>
      </template>
    </ModuleCard>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import submitIcon from '@/assets/icons/btn-submit.svg'
const formRef = ref<FormInstance>()
const formData = ref({
  timeZone: 'GMT+8',
  synchronization: 'auto',
})
const timeSettingFormItemRef = ref<HTMLElement | null>(null)
const rules = ref({
  timeZone: [{ required: true, message: 'Please select time zone', trigger: 'change' }],
  synchronization: [
    { required: true, message: 'Please select synchronization', trigger: 'change' },
  ],
})
</script>

<style scoped lang="scss">
.time-setting {
  width: 100%;
  height: 100%;

  .time-setting-form {
    width: 100%;
    height: 100%;
    padding: 20px 0;

    .time-setting-form-item {
      width: 100%;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :deep(.el-select) {
      width: 100% !important;
    }

    // :deep(.el-select__popper.el-popper) {
    //   top: 44px !important;
    // }
  }
  .data-update-form {
    width: 100%;
    height: 100%;
    margin: 20px 0;
    overflow-y: auto;

    // 折叠面板样式
    .config-collapse {
      border: none;
      background: transparent;

      & > div {
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 0;
        }
      }

      // :deep(.el-collapse-item) {
      //   margin-bottom: 20px;
      //   border: 1px solid rgba(255, 255, 255, 0.1);
      //   border-radius: 8px;
      //   overflow: hidden;
      //   background: rgba(44, 66, 106, 0.1);

      //   .el-collapse-item__header {
      //     background: linear-gradient(90deg, rgba(44, 66, 106, 0.8) 0%, rgba(44, 66, 106, 0.4) 100%);
      //     color: #ffffff;
      //     font-size: 16px;
      //     font-weight: 600;
      //     padding: 12px 20px;
      //     border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      //     height: auto;
      //     line-height: 1.5;

      //     .el-collapse-item__arrow {
      //       color: #ffffff;
      //       font-size: 14px;
      //       margin-right: 10px;
      //     }

      //     &:hover {
      //       background: linear-gradient(90deg, rgba(44, 66, 106, 0.9) 0%, rgba(44, 66, 106, 0.5) 100%);
      //     }
      //   }

      //   .el-collapse-item__wrap {
      //     border: none;
      //     background: transparent;

      //     .el-collapse-item__content {
      //       padding: 0;
      //       background: rgba(44, 66, 106, 0.1);
      //     }
      //   }
      // }
    }

    // 折叠面板标题样式
    .collapse-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding-right: 10px;

      .collapse-title__text {
        flex: 1;
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
      }
    }

    // 折叠面板内容样式
    .collapse-content {
      padding: 20px;

      .el-form-item {
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }

    // 输入框样式优化
    :deep(.el-input) {
      width: 100% !important;
    }
  }
  .card__content-footer {
    display: flex;
    padding: 30px 0 10px 0;
    width: 100%;
    justify-content: flex-end;
    align-items: center;
    // gap: 10px;
  }
}

:deep(.el-popper.is-light) {
  background-color: rgba(41, 60, 100, 0.9) !important;
}
</style>

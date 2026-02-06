<template>
  <FormDialog title="Device Instance Detail" width="800px" ref="dialogRef" @close="handleClose" style="height: 80%;">
    <template #dialog-body>
      <div class="voltage-class instance-detail-dialog">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="instance-detail__form">
          <LightCollapseCard
            v-model="isBasicOpen"
            title="Basic Information"
            :collapsible="false"
            class="instance-detail__card"
          >
            <div class="instance-detail__section">
              <el-form-item v-if="!isCreateMode" label="Instance ID:" prop="instance_id">
                <span class="instance-detail__readonly-text">{{ form.instance_id }}</span>
              </el-form-item>
              <el-form-item label="Instance Name:" prop="instance_name">
                <el-input v-if="isEditing" v-model="form.instance_name" placeholder="Please enter instance name" />
                <span v-else class="instance-detail__readonly-text">{{ form.instance_name }}</span>
              </el-form-item>

              <el-form-item label="Product Name:" prop="product_name">
                <!-- 新增时可选，修改时只读 -->
                <el-select v-if="isCreateMode" v-model="form.product_name" placeholder="Please select product"
                  filterable>
                  <el-option v-for="product in props.productOptions" :key="product.value" :label="product.label"
                    :value="product.value" />
                </el-select>
                <span v-else class="instance-detail__readonly-text">{{ form.product_name }}</span>
              </el-form-item>
            </div>
          </LightCollapseCard>

          <LightCollapseCard
            v-model="isPropertiesOpen"
            title="Properties"
            auto-height
            :collapsible="false"
            class="instance-detail__card instance-detail__card--grow"
          >
            <template #actions>
              <el-button
                v-if="isEditing"
                type="primary"
                size="small"
                @click.stop="addPropertyAtTop"
                circle
              >
                <el-icon>
                  <Plus />
                </el-icon>
              </el-button>
            </template>
            <div class="instance-detail__section instance-detail__section--full">
              <div class="instance-detail__properties">
                <div class="instance-detail__properties-grid">
                  <!-- 编辑态：基于数组 editProperties 渲染，可编辑 key 与 value -->
                  <template v-if="isEditing">
                    <div v-if="!hasEditProperties" class="instance-detail__properties-empty">
                      No properties yet. Click the plus button to add one.
                    </div>
                    <div v-for="(prop, index) in editProperties" :key="`property-edit-${index}`"
                      class="instance-detail__property-item">
                      <div class="instance-detail__property-content">
                        <div class="instance-detail__property-key-container">
                          <el-input v-model="prop.key" placeholder="Key" class="instance-detail__property-key-input">
                          </el-input>
                        </div>
                        <span class="instance-detail__property-separator">:</span>
                        <div class="instance-detail__property-value-container instance-detail__property-value-box">
                          <el-input v-model="prop.value" placeholder="Value"
                            class="instance-detail__property-value-input">
                            <template #suffix>
                              <el-button type="warning" @click="removePropertyByIndex(index)" circle>
                                <el-icon>
                                  <Delete />
                                </el-icon>
                              </el-button>
                            </template>
                          </el-input>
                        </div>
                      </div>
                    </div>
                  </template>
                  <!-- 只读态：基于对象 entries 渲染显示 key 与 value -->
                  <template v-else>
                    <div v-if="!hasProperties" class="instance-detail__properties-empty">
                      No properties available.
                    </div>
                    <div v-for="(value, key) in form.properties" :key="`property-${key}`"
                      class="instance-detail__property-item">
                      <div class="instance-detail__property-content">
                        <div class="instance-detail__property-key-container">
                          <span class="instance-detail__property-key">{{ key }}</span>
                        </div>
                        <span class="instance-detail__property-separator">:</span>
                        <div class="instance-detail__property-value-container">
                          <span class="instance-detail__property-value instance-detail__property-value-box">{{
                            value
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </LightCollapseCard>
        </el-form>
      </div>
    </template>

    <template #dialog-footer>
      <el-button type="warning" @click="handleCancel">{{
        isCreateMode ? 'Cancel' : isEditing ? 'Cancel Edit' : 'Cancel'
        }}</el-button>
      <el-button v-if="!isEditing" type="primary" @click="handleEdit"> Edit </el-button>
      <el-button v-else type="primary" @click="handleSubmit"> Submit </el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import { getInstanceDetail } from '@/api/devicesManagement'
import type { DeviceInstanceDetail, AddDeviceInstanceDetail } from '@/types/deviceConfiguration'
import { createInstance, updateInstance } from '@/api/devicesManagement'
import LightCollapseCard from '@/components/common/LightCollapseCard.vue'
const props = defineProps<{
  productOptions: { label: string; value: string }[]
}>()
const formRef = ref<FormInstance>()
const dialogRef = ref<any>()

// 响应式数据
const isEditing = ref(false)
const isBasicOpen = ref(true)
const isPropertiesOpen = ref(true)
const isCreateMode = computed(() => isEditing.value && form.value.instance_id === null)
const didUpdate = ref(false)

// 表单数据
const form = ref<DeviceInstanceDetail>({
  instance_id: 0,
  instance_name: '',
  product_name: '',
  properties: {},
})

// 编辑时的属性数据副本（数组形式，便于编辑 key 与 value）
const editProperties = ref<Array<{ key: string; value: string | number }>>([])

// 原始表单快照，用于取消编辑时恢复
const originalFormSnapshot = ref<DeviceInstanceDetail | null>(null)
const applyDetail = (detailData: DeviceInstanceDetail) => {
  form.value = {
    instance_id: detailData.instance_id,
    instance_name: detailData.instance_name,
    product_name: detailData.product_name,
    properties: detailData.properties,
  } as any
  originalFormSnapshot.value = JSON.parse(JSON.stringify(form.value))
}

const hasProperties = computed(() => Object.keys(form.value.properties || {}).length > 0)
const hasEditProperties = computed(() => editProperties.value.length > 0)

// 表单验证规则
const rules = {
  instance_name: [
    { required: true, message: 'Please enter instance name', trigger: 'blur' },
    { min: 2, max: 32, message: 'Instance name length is 2-32 characters', trigger: 'blur' },
  ],
  // 产品不可编辑，校验保持必填但由初始数据提供
  product_name: [{ required: true, message: 'Please select product', trigger: 'change' }],
}

const addPropertyAtTop = () => {
  if (!isEditing.value) return
  editProperties.value.unshift({ key: '', value: '' })
}

// 删除属性
const removePropertyByIndex = (index: number) => {
  if (!isEditing.value) return
  editProperties.value.splice(index, 1)
}

// 打开对话框
const open = async (instanceIdOrNull: number | null) => {
  // 新建：传入空字符串时，清空表单并进入编辑状态
  try {
    if (!instanceIdOrNull) {
      isEditing.value = true
      isBasicOpen.value = true
      isPropertiesOpen.value = true
      didUpdate.value = false
      form.value = {
        instance_id: null,
        instance_name: '',
        product_name: '',
        properties: {},
      } as any
      editProperties.value = []
      originalFormSnapshot.value = JSON.parse(JSON.stringify(form.value))
    } else {
      isEditing.value = false
      isBasicOpen.value = true
      isPropertiesOpen.value = true
      didUpdate.value = false
      const detailData = await getInstanceDetail(instanceIdOrNull)
      applyDetail(detailData.data.instance)
    }

    nextTick(() => {
      if (dialogRef.value) {
        dialogRef.value.dialogVisible = true
        formRef.value?.clearValidate()
      }
    })
  } catch (error) {
    console.log(error)
  }
}

// 关闭对话框
const close = () => {
  if (dialogRef.value) {
    dialogRef.value.dialogVisible = false
  }
}

// 取消
const handleCancel = () => {
  // 重置编辑状态
  if (isEditing.value && !isCreateMode.value) {
    isEditing.value = false
    // 恢复原始表单
    if (originalFormSnapshot.value) {
      form.value = JSON.parse(JSON.stringify(originalFormSnapshot.value))
    }
    editProperties.value = []
  } else {
    if (didUpdate.value) {
      emit('submit')
      didUpdate.value = false
    }
    close()
  }
}

// 编辑
const handleEdit = () => {
  // 创建编辑数据副本
  editProperties.value = Object.entries(form.value.properties).map(([k, v]) => ({
    key: k,
    value: v as string | number,
  }))
  // 生成原始快照（若尚未生成）
  if (!originalFormSnapshot.value) {
    originalFormSnapshot.value = JSON.parse(JSON.stringify(form.value))
  }
  isEditing.value = true
}

// 提交
const handleSubmit = () => {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      // 将编辑数据同步到表单数据（数组转对象，忽略空 key）
      const newProps: Record<string, string | number> = {}
      for (const item of editProperties.value) {
        if (item.key !== '') newProps[item.key] = item.value
      }
      form.value.properties = newProps
      if (isCreateMode.value) {
        const data: AddDeviceInstanceDetail = {
          instance_name: form.value.instance_name,
          product_name: form.value.product_name,
          properties: form.value.properties,
        }
        const res = await createInstance(data)
        if (res.success) {
          ElMessage.success('Device instance created successfully')
          isEditing.value = false
          emit('submit')
          close()
        }
      } else {
        const res = await updateInstance(form.value)
        if (res.success) {
          ElMessage.success('Device instance updated successfully')
          isEditing.value = false
          didUpdate.value = true
          const detailData = await getInstanceDetail(form.value.instance_id as number)
          applyDetail(detailData.data.instance)
          editProperties.value = []
        }
      }

      // ElMessage.success('Device instance updated successfully')
      // // 更新原始快照
      // originalFormSnapshot.value = JSON.parse(JSON.stringify(form.value))
      // close()
    }
  })
}

// 关闭事件
const handleClose = () => {
  // 重置编辑状态
  if (isEditing.value) {
    isEditing.value = false
    editProperties.value = []
  }
  if (didUpdate.value) {
    emit('submit')
    didUpdate.value = false
  }
  close()
}

// 定义事件
const emit = defineEmits<{
  (e: 'submit'): void
}>()

// 暴露方法
defineExpose({ open, close })
</script>

<style scoped lang="scss">
@use '@/assets/styles/_variables.scss' as *;

.voltage-class .instance-detail-dialog {
  height: 100%;
  overflow-y: auto;

  .instance-detail__form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 100%;
  }

  .instance-detail__section {
    display: flex;
    flex-wrap: wrap;
    column-gap: 12px;
    row-gap: 10px;
  }

  .instance-detail__section--full {
    flex-direction: column;
    gap: 10px;
    flex: 1;
    min-height: 0;
  }

  .instance-detail__form-item {
    width: calc(50% - 6px);
    margin-right: 0;
  }

  :deep(.el-form-item) {
    width: calc(50% - 6px);
    margin-right: 0;
    margin-bottom: 0;
  }

  :deep(.el-input),
  :deep(.el-input-number),
  :deep(.el-select) {
    width: 100% !important;
  }

  .instance-detail__readonly-text {
    color: $text-color-primary;
    font-size: 14px;
  }

  :deep(.el-form-item__content) {
    align-items: flex-start !important;
  }

  .instance-detail__properties {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: visible;
    background-color: $white-alpha-05;
    position: relative;
    border: 1px solid $white-alpha-10;
    border-radius: $border-radius-medium;
    padding: 8px;

    .instance-detail__properties-grid {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .instance-detail__property-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      background-color: transparent;
      min-height: 32px;
      position: relative;
      // padding: 6px 8px;
      border-bottom: 1px dashed $white-alpha-10;

      &:last-child {
        border-bottom: none;
      }
    }

    .instance-detail__property-content {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
    }

    .instance-detail__property-key-container {
      width: 180px;
      flex: 0 0 180px;
    }

    .instance-detail__property-value-container {
      flex: 1;
      min-width: 0;
    }

    .instance-detail__property-key-input {
      width: 100%;
    }

    .instance-detail__property-value-input {
      width: 100%;
    }

    .instance-detail__property-key,
    .instance-detail__property-value {
      font-size: 14px;
      color: $text-color-primary;
      word-break: break-all;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }

    .instance-detail__property-key {
      text-align: right;
    }

    .instance-detail__property-separator {
      color: $text-color-secondary;
      font-weight: 600;
      margin: 0 2px;
      flex-shrink: 0;
      font-size: 14px;
    }

    .instance-detail__property-value-box {
      display: block;
      padding: 4px 8px;
      background: $white-alpha-05;
      border: 1px solid $white-alpha-15;
      border-radius: $border-radius-small;
      color: $text-color-primary;
    }

    .instance-detail__properties-empty {
      padding: 10px 8px;
      font-size: 13px;
      color: $text-color-secondary;
    }
  }

  .instance-detail__card {
    display: block;
  }

  .instance-detail__card--grow {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;

    :deep(.light-collapse-card) {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    :deep(.light-collapse-card__body) {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    :deep(.light-collapse-card__body-inner) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
  }

}
</style>
<template>
  <div class="voltage-class channel-templates-page">
    <el-page-header @back="handleBack" class="channel-templates-page__header">
      <template #content>
        <span class="channel-templates-page__title">Template Management</span>
      </template>
    </el-page-header>

    <div class="channel-templates-page__toolbar">
      <el-form :inline="true">
        <el-form-item label="Protocol:">
          <el-select
            v-model="protocolFilter"
            :fit-input-width="true"
            clearable
            placeholder="Select protocol"
            @change="loadTemplates"
          >
            <el-option
              v-for="option in PROTOCOL_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="channel-templates-page__toolbar-actions">
        <div class="rule-management__reload-icon" @click="loadTemplates">
          <AppIcon name="i-tabler-refresh" className="rule-management__inline-icon" />
        </div>
      </div>
    </div>

    <div class="rule-management__search-form-second-row">
      <IconButton
        type="primary"
        :icon="userAddIcon"
        text="New"
        custom-class="rule-management__btn"
        @click="openCreateDialog"
      />
    </div>

    <div class="channel-templates-page__table">
      <el-table
        v-loading="loading"
        :data="pagedTemplateList"
        row-key="template_id"
        class="channel-templates-page__table-content"
      >
        <el-table-column prop="template_id" label="ID" width="80" />
        <el-table-column prop="name" label="Name" min-width="180" show-overflow-tooltip />
        <el-table-column prop="description" label="Description" min-width="220" show-overflow-tooltip />
        <el-table-column prop="protocol" label="Protocol" width="130" />
        <el-table-column prop="created_at" label="Created At" min-width="180" />
        <el-table-column label="Action" width="390" fixed="right">
          <template #default="{ row }">
            <div class="rule-management__operation">
              <div class="rule-management__operation-item" @click="openEditDialog(row)">
                <AppIcon name="i-tabler-edit" className="rule-management__inline-icon" />
                <span class="rule-management__operation-text">Edit</span>
              </div>
              <div class="rule-management__operation-item" @click="handleView(row)">
                <AppIcon name="i-tabler-transform-point" className="rule-management__inline-icon" />
                <span class="rule-management__operation-text">Points/Mappings</span>
              </div>
              <div class="rule-management__operation-item" @click="openApplyDialog(row)">
                <AppIcon name="i-tabler-send" className="rule-management__inline-icon" />
                <span class="rule-management__operation-text">Apply</span>
              </div>
              <div class="rule-management__operation-item" @click="handleDelete(row)">
                <AppIcon name="i-tabler-trash" className="rule-management__inline-icon" />
                <span class="rule-management__operation-text">Delete</span>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="channel-templates-page__pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          :teleported="false"
          layout="total, prev, pager, next, sizes"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <TemplateEditDialog ref="editDialogRef" @submit="submitEdit" />
    <TemplateApplyDialog
      ref="applyDialogRef"
      :template-list="templateList"
      :channel-options="channelOptions"
      @submit="submitApply"
    />
    <TemplateCreateDialog
      ref="createDialogRef"
      :protocol-options="[...PROTOCOL_OPTIONS]"
      :channel-options="channelOptions"
      :default-protocol="protocolFilter || 'modbus_tcp'"
      @submit="submitCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { PROTOCOL_OPTIONS } from '@/types/channelConfiguration'
import type { ChannelTemplateListItem } from '@/types/channelTemplates'
import {
  applyTemplateToChannel,
  createTemplate,
  createTemplateFromChannel,
  deleteTemplate,
  getTemplates,
  updateTemplate,
} from '@/api/channelTemplates'
import { getAllChannels } from '@/api/channelsManagement'
import TemplateEditDialog from '@/views/Setting/Configuration/ChannelConfiguration/Templates/components/TemplateEditDialog.vue'
import TemplateApplyDialog from '@/views/Setting/Configuration/ChannelConfiguration/Templates/components/TemplateApplyDialog.vue'
import TemplateCreateDialog from '@/views/Setting/Configuration/ChannelConfiguration/Templates/components/TemplateCreateDialog.vue'

const userAddIcon = 'i-tabler-plus'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const protocolFilter = ref<string>('')
const templateList = ref<ChannelTemplateListItem[]>([])
const channelOptions = ref<Array<{ id: number; name: string; protocol: string }>>([])
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

const editDialogRef = ref<InstanceType<typeof TemplateEditDialog> | null>(null)
const applyDialogRef = ref<InstanceType<typeof TemplateApplyDialog> | null>(null)
const createDialogRef = ref<InstanceType<typeof TemplateCreateDialog> | null>(null)

const handleBack = () => {
  router.push('/channelConfiguration')
}

const loadTemplates = async () => {
  loading.value = true
  try {
    const res = await getTemplates(protocolFilter.value ? (protocolFilter.value as any) : undefined)
    if (res.success) {
      templateList.value = Array.isArray(res.data) ? res.data : []
      pagination.value.total = templateList.value.length
      if ((pagination.value.page - 1) * pagination.value.pageSize >= pagination.value.total) {
        pagination.value.page = 1
      }
    }
  } finally {
    loading.value = false
  }
}

const pagedTemplateList = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return templateList.value.slice(start, end)
})

const handlePageSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
}

const handlePageChange = (page: number) => {
  pagination.value.page = page
}

const loadChannels = async () => {
  const res = await getAllChannels()
  if (res.success) {
    const list = Array.isArray((res as any).data?.list) ? (res as any).data.list : []
    channelOptions.value = list.map((item: any) => ({
      id: Number(item.id),
      name: String(item.name || item.channel_name || item.id),
      protocol: String(item.protocol || ''),
    }))
  }
}

const handleView = (row: ChannelTemplateListItem) => {
  router.push({
    path: '/channelConfiguration/templates/detail',
    query: { template_id: String(row.template_id) },
  })
}

const openEditDialog = (row: ChannelTemplateListItem) => {
  editDialogRef.value?.open(row)
}

const submitEdit = async (payload: { template_id: number; name: string; description: string }) => {
  const res = await updateTemplate(payload.template_id, {
    name: payload.name,
    description: payload.description,
  })
  if (res.success) {
    ElMessage.success('Template updated successfully')
    editDialogRef.value?.close()
    await loadTemplates()
  }
}

const handleDelete = async (row: ChannelTemplateListItem) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete template ${row.name}?`,
      'Confirm Delete',
      {
        type: 'warning',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        center: true,
        showClose: false,
        cancelButtonType: 'text',
        confirmButtonType: 'danger',
      },
    )
  } catch {
    return
  }
  const res = await deleteTemplate(row.template_id)
  if (res.success) {
    ElMessage.success('Template deleted successfully')
    await loadTemplates()
  }
}

const openApplyDialog = (row: ChannelTemplateListItem) => {
  applyDialogRef.value?.open(row.template_id, null)
}

const submitApply = async (payload: { template_id: number; channel_id: number }) => {
  const templateName =
    templateList.value.find(item => item.template_id === payload.template_id)?.name ||
    `#${payload.template_id}`
  try {
    await ElMessageBox.confirm(
      `Apply template ${templateName} to channel #${payload.channel_id}?`,
      'Confirm Apply',
      {
        type: 'warning',
        confirmButtonText: 'Apply',
        cancelButtonText: 'Cancel',
        center: true,
        showClose: false,
      },
    )
  } catch {
    return
  }
  const res = await applyTemplateToChannel(payload.template_id, payload.channel_id, {
    clear_existing: true,
    slave_id_override: null,
  })
  if (res.success) {
    ElMessage.success((res as any).data?.message || 'Template applied successfully')
    applyDialogRef.value?.close()
  }
}

const openCreateDialog = () => {
  createDialogRef.value?.open({
    protocol: protocolFilter.value || 'modbus_tcp',
    channel_id: route.query.channel_id ? Number(route.query.channel_id) : null,
    mode: 'json',
  })
}

const submitCreate = async (
  payload:
    | { mode: 'json'; json_text: string }
    | { mode: 'channel'; name: string; description: string; protocol: string; channel_id: number },
) => {
  if (payload.mode === 'json') {
    let parsed: Record<string, any> = {}
    try {
      parsed = JSON.parse(payload.json_text)
    } catch {
      ElMessage.error('JSON format is invalid')
      return
    }
    const res = await createTemplate({
      name: parsed.name,
      description: parsed.description || '',
      protocol: parsed.protocol as any,
      points_snapshot: parsed.points_snapshot || {},
      mappings_snapshot: parsed.mappings_snapshot || {},
    })
    if (res.success) {
      ElMessage.success('Template created successfully')
      createDialogRef.value?.close()
      await loadTemplates()
    }
    return
  }

  const res = await createTemplateFromChannel(payload.channel_id, {
    name: payload.name,
    description: payload.description || undefined,
  })
  if (res.success) {
    ElMessage.success('Snapshot saved as template successfully')
    createDialogRef.value?.close()
    await loadTemplates()
  }
}

const processQueryAction = () => {
  const action = typeof route.query.action === 'string' ? route.query.action : ''
  const channelId =
    typeof route.query.channel_id === 'string' ? Number(route.query.channel_id) : null

  if (action === 'create_from_channel') {
    createDialogRef.value?.open({
      protocol: protocolFilter.value || 'modbus_tcp',
      channel_id: channelId,
      mode: 'channel',
    })
    return
  }

  if (action === 'apply_template') {
    applyDialogRef.value?.open(null, channelId)
  }
}

onMounted(async () => {
  if (typeof route.query.protocol === 'string') {
    protocolFilter.value = route.query.protocol
  }
  await Promise.all([loadTemplates(), loadChannels()])
  processQueryAction()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.voltage-class.channel-templates-page {
  height: 100%;
  display: flex;
  flex-direction: column;

  .channel-templates-page__header {
    height: 64px;
    display: flex;
    align-items: center;
  }

  .channel-templates-page__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #dcdfe6;
    :deep(.el-form-item) {
      margin-bottom: 0;
    }
  }

  .channel-templates-page__toolbar-actions {
    display: flex;
    gap: 8px;
  }

  .rule-management__search-form-second-row {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-bottom: 12px;
  }

  .channel-templates-page__table {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .channel-templates-page__table-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .channel-templates-page__pagination {
    display: flex;
    justify-content: flex-end;
    // margin-top: 12px;
    // padding-top: 12px;
    // border-top: 1px solid #dcdfe6;
  }

  .rule-management__operation {
    display: flex;
    align-items: center;
    gap: 20px;

    .rule-management__operation-item {
      display: flex;
      align-items: center;
      cursor: pointer;

      .rule-management__inline-icon,
      img {
        width: 14px;
        height: 14px;
        margin-right: 4px;
        object-fit: contain;
      }

      .rule-management__operation-text {
        font-size: 14px;
        color: #000000;
      }

    }
  }

  .rule-management__reload-icon {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    transition: opacity 0.2s;

    .rule-management__reload-icon:hover {
      opacity: 0.7;
    }

    .rule-management__inline-icon,
    img {
      width: 32px;
      height: 32px;
      filter: brightness(0) saturate(100%) invert(48%) sepia(100%) saturate(7498%) hue-rotate(1deg)
        brightness(102%) contrast(101%);
    }
  }

  .counts-text {
    font-size: 13px;
    color: #000;
  }
}
</style>

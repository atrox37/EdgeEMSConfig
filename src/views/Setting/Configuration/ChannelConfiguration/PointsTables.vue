<template>
    <div class="voltage-class points-tables-page">
        <!-- Page Header -->
        <el-page-header @back="handleBack" class="points-tables-page__header">
            <template #content>
                <div class="points-tables-page__header-content">
                    <!-- 右侧通道名称（字体小于标题） -->
                    <span v-if="channelName" class="points-tables-page__channel-name">
                        {{ channelName }} -&nbsp;
                    </span>
                    <!-- 模式切换下拉菜单：首次打开默认为 Points Table -->
                    <el-dropdown v-if="!isEditing" trigger="click" class="points-tables-page__view-mode-dropdown"
                        @command="handleDropdownCommand">
                        <span class="points-tables-page__dropdown-trigger">
                            {{ viewMode === 'points' ? 'Points Table' : 'Mappings Table' }}
                            <AppIcon name="i-tabler-chevron-down" className="el-icon--right" />
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="points">Points Table</el-dropdown-item>
                                <el-dropdown-item command="mappings">Mappings Table</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                    <span v-else class="points-tables-page__header-title">{{ viewMode === 'points' ? 'Points Table' :
                        'Mappings Table'
                    }}</span>

                </div>
            </template>
        </el-page-header>

        <div class="points-tables-page__content">
            <div class="voltage-class rule-management__expand-content">
                <div class="config-section__tabs-wrapper">
                    <el-tabs v-model="activeTab" :before-leave="handleBeforeLeave"
                        @tab-change="handleTabChange" class="config-section__tabs">
                        <el-tab-pane label="Telemetry" name="telemetry" v-if="channelProtocol !== 'di_do'">
                            <template v-if="viewMode === 'points'">
                                <PointTablePoints ref="telemetryTableRef" pointType="T" :points="pointsData.telemetry"
                                    :original-points="originalPointsData.telemetry" :view-mode="viewMode"
                                    :edit-filters="editFilters" :is-editing="isEditing" :loading="globalStore.loading"
                                    :publish-mode="isPublish && activeTab === 'telemetry'"
                                    :channelProtocol="channelProtocol" @toggle-publish="togglePublishMode"
                                    @enter-edit-mode="handleEdit" @publish-change="
                                        (dirty: boolean) => {
                                            publishDirty = dirty
                                        }
                                    " />
                            </template>
                            <template v-else>
                                <PointTableMappings ref="telemetryTableRef" pointType="T" :points="pointsData.telemetry"
                                    :original-points="originalPointsData.telemetry" :view-mode="viewMode"
                                    :edit-filters="editFilters" :is-editing="isEditing" :loading="globalStore.loading"
                                    :channelProtocol="channelProtocol" />
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="Signal" name="signal">
                            <template v-if="viewMode === 'points'">
                                <PointTablePoints ref="signalTableRef" pointType="S" :points="pointsData.signal"
                                    :original-points="originalPointsData.signal" :view-mode="viewMode"
                                    :edit-filters="editFilters" :is-editing="isEditing" :loading="globalStore.loading"
                                    :publish-mode="isPublish && activeTab === 'signal'"
                                    :channelProtocol="channelProtocol" @toggle-publish="togglePublishMode"
                                    @enter-edit-mode="handleEdit" @publish-change="
                                        (dirty: boolean) => {
                                            publishDirty = dirty
                                        }
                                    " />
                            </template>
                            <template v-else>
                                <PointTableMappings ref="signalTableRef" pointType="S" :points="pointsData.signal"
                                    :original-points="originalPointsData.signal" :view-mode="viewMode"
                                    :edit-filters="editFilters" :is-editing="isEditing" :loading="globalStore.loading"
                                    :channelProtocol="channelProtocol" />
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="Control" name="control">
                            <template v-if="viewMode === 'points'">
                                <PointTablePoints ref="controlTableRef" pointType="C" :points="pointsData.control"
                                    :original-points="originalPointsData.control" :view-mode="viewMode"
                                    :edit-filters="editFilters" :is-editing="isEditing" :loading="globalStore.loading"
                                    :publish-mode="isPublish && activeTab === 'control'"
                                    :channelProtocol="channelProtocol" @toggle-publish="togglePublishMode"
                                    @enter-edit-mode="handleEdit" @publish-change="
                                        (dirty: boolean) => {
                                            publishDirty = dirty
                                        }
                                    " />
                            </template>
                            <template v-else>
                                <PointTableMappings ref="controlTableRef" pointType="C" :points="pointsData.control"
                                    :original-points="originalPointsData.control" :view-mode="viewMode"
                                    :edit-filters="editFilters" :is-editing="isEditing" :loading="globalStore.loading"
                                    :channelProtocol="channelProtocol" />
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="Adjustment" name="adjustment" v-if="channelProtocol !== 'di_do'">
                            <template v-if="viewMode === 'points'">
                                <PointTablePoints ref="adjustmentTableRef" pointType="A" :points="pointsData.adjustment"
                                    :original-points="originalPointsData.adjustment" :view-mode="viewMode"
                                    :edit-filters="editFilters" :is-editing="isEditing" :loading="globalStore.loading"
                                    :publish-mode="isPublish && activeTab === 'adjustment'"
                                    :channelProtocol="channelProtocol" @toggle-publish="togglePublishMode"
                                    @enter-edit-mode="handleEdit" @publish-change="
                                        (dirty: boolean) => {
                                            publishDirty = dirty
                                        }
                                    " />
                            </template>
                            <template v-else>
                                <PointTableMappings ref="adjustmentTableRef" pointType="A"
                                    :points="pointsData.adjustment" :original-points="originalPointsData.adjustment"
                                    :view-mode="viewMode" :edit-filters="editFilters" :is-editing="isEditing"
                                    :loading="globalStore.loading" :channelProtocol="channelProtocol" />
                            </template>
                        </el-tab-pane>
                    </el-tabs>

                    <!-- Status 筛选器：modified/added/deleted 多选框互斥，invalid 独立复选 -->
                    <div v-if="isEditing" class="config-section__status-filter">
                        <el-checkbox-group v-model="statusCheckboxValue" class="status-checkbox-group"
                            @change="handleStatusCheckboxChange">
                            <el-checkbox v-if="viewMode === 'points'" label="modified">modified</el-checkbox>
                            <el-checkbox v-if="viewMode === 'points'" label="added">added</el-checkbox>
                            <el-checkbox v-if="viewMode === 'points'" label="deleted">deleted</el-checkbox>
                            <el-checkbox v-if="viewMode === 'mappings'" label="modified">modified</el-checkbox>
                        </el-checkbox-group>
                        <el-checkbox v-model="invalidChecked" class="status-invalid-checkbox">invalid</el-checkbox>
                    </div>
                </div>


            </div>
        </div>

        <!-- Footer Actions -->
        <div class="points-tables-page__footer">
            <el-button v-if="isEditing && !isPublish" @click="handleCancelEdit">
                Cancel Edit
            </el-button>
            <el-button v-if="!isEditing && !isPublish" type="primary" @click="handleEdit">
                Edit
            </el-button>
            <IconButton v-if="isEditing && !isPublish" type="primary" :icon="submitIcon" text="Submit"
                @click="handleSubmit" />
            <IconButton v-if="!isEditing && isPublish" type="primary" :icon="submitIcon" text="Submit Publish"
                @click="handleSubmitPublish" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, watch, computed, onMounted, onUnmounted, ref, provide, readonly } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import PointTablePoints from './components/PointTablePoints.vue'
import PointTableMappings from './components/PointTableMappings.vue'
import IconButton from '@/components/common/IconButton.vue'
const submitIcon = 'i-tabler-check'
import type { PointInfoResponse } from '@/types/channelConfiguration'
import {
    getPointsTables,
    getChannelDetail,
    batchUpdateMappingPoint,
    publishPointValue,
    postPointsBatch,
} from '@/api/channelsManagement'
import type {
    BatchUpdateMappingPointRequest,
    BatchPointsChangeRequest,
} from '@/types/channelConfiguration'
import { ChannelIdKey, ChannelNameKey, ChannelProtocolKey, OriginalPointsKey } from '@/utils/key'
import wsManager from '@/utils/websocket'
import type { DataType } from '@/types/websocket'
import { useGlobalStore } from '@/stores/global'
const globalStore = useGlobalStore()
// lodash-es 替换
const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const uniqueArray = <T,>(arr: T[]): T[] => Array.from(new Set(arr))

const route = useRoute()
const router = useRouter()

// 响应式数据
const isEditing = ref(false)
const activeTab = ref('telemetry')
const channelId = ref(0)
const channelName = ref('')
const channelProtocol = ref<'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'>('modbus_tcp')
const viewModeSwitch = ref(false) // false = points, true = mappings
const viewMode = computed(() => (viewModeSwitch.value ? 'mappings' : 'points'))
const editFilters = ref<string[]>([])
// Status 筛选器：modified/added/deleted 多选框互斥（仅可选一或全不选），invalid 独立复选
const statusCheckboxValue = ref<string[]>([])
const invalidChecked = ref(false)
const handleStatusCheckboxChange = (val: string[]) => {
    if (val.length > 1) statusCheckboxValue.value = [val[val.length - 1]]
}
watch(
    [statusCheckboxValue, invalidChecked],
    () => {
        if (invalidChecked.value) {
            editFilters.value = ['invalid']
        } else if (statusCheckboxValue.value.length > 0) {
            editFilters.value = [statusCheckboxValue.value[0]]
        } else {
            editFilters.value = []
        }
    },
    { immediate: true, deep: true },
)
const isPublish = ref(false) // 批量发布模式
const publishDirty = ref(false) // 发布数据是否有修改
const mappingTypeToTabName: Record<string, 'T' | 'S' | 'C' | 'A'> = {
    telemetry: 'T',
    signal: 'S',
    control: 'C',
    adjustment: 'A',
}
// 反向映射：数据类型 -> 表索引
const dataTypeToRef: Record<DataType, any> = {
    T: null as any,
    S: null as any,
    C: null as any,
    A: null as any,
}
// 点位数据存储
const pointsData = ref<PointInfoResponse>({
    telemetry: [],
    signal: [],
    control: [],
    adjustment: [],
})

// 原始点位数据（用于对比变化）
const originalPointsData = ref<PointInfoResponse>({
    telemetry: [],
    signal: [],
    control: [],
    adjustment: [],
})

// Mappings 数据存储
type TabPaneName = string | number

// 编辑状态管理方法
const telemetryTableRef = ref()
const signalTableRef = ref()
const controlTableRef = ref()
const adjustmentTableRef = ref()
type TabName = 'telemetry' | 'signal' | 'control' | 'adjustment'
const tableRefsByTab: Record<TabName, any> = {
    telemetry: telemetryTableRef,
    signal: signalTableRef,
    control: controlTableRef,
    adjustment: adjustmentTableRef,
}
const getTableInstance = (tab: TabName) => tableRefsByTab[tab]?.value
const resetPublishForTab = (tab: TabName) => getTableInstance(tab)?.resetPublish?.()
const resetPublishAll = () => {
    ; (Object.keys(tableRefsByTab) as TabName[]).forEach((tab) => {
        resetPublishForTab(tab)
    })
}

// 页面订阅ID
const pageId = ref<string>('')

provide(ChannelIdKey, readonly(channelId))
provide(ChannelNameKey, readonly(channelName))
provide(ChannelProtocolKey, readonly(channelProtocol))

// 提供原始数据给子组件用于对比
provide(
    OriginalPointsKey,
    computed(() => {
        const category = activeTab.value as 'telemetry' | 'signal' | 'control' | 'adjustment'
        return originalPointsData.value[category]
    }),
)

// 模式切换处理
const handleViewModeChange = () => {
    // 模式切换时重置筛选
    editFilters.value = []
    statusCheckboxValue.value = []
    invalidChecked.value = false
}

// 下拉菜单选择
const handleDropdownCommand = (command: string) => {
    if (command === 'points') {
        viewModeSwitch.value = false
    } else if (command === 'mappings') {
        viewModeSwitch.value = true
    }
    handleViewModeChange()
}

const handleEdit = (payload?: { fromImport?: boolean } | MouseEvent) => {
    const fromImport =
        payload && typeof payload === 'object' && 'fromImport' in payload
            ? (payload as { fromImport?: boolean }).fromImport
            : false
    isEditing.value = true
    editFilters.value = []
    statusCheckboxValue.value = []
    invalidChecked.value = false
    // 用户主动进入编辑时，清除四个表中上一次的导入文件名；
    // 若由子表导入触发（fromImport），则保留当前导入文件名称
    if (!fromImport) {
        telemetryTableRef.value?.clearImportedFileName?.()
        signalTableRef.value?.clearImportedFileName?.()
        controlTableRef.value?.clearImportedFileName?.()
        adjustmentTableRef.value?.clearImportedFileName?.()
    }
}

// 统一刷新点位数据并设置对比基准
const refreshPointsBaseline = async () => {
    try {
        const res = await getPointsTables(channelId.value)
        if (res.success) {
            pointsData.value = res.data
            originalPointsData.value = deepClone(res.data)
        }
    } catch {
        console.error('Failed to refresh points baseline')
    }
}

const handleSubmit = async () => {
    // 编辑提交前：检查四个Tab是否存在 invalid
    const ensureInvalidHandled = (targetTab: 'telemetry' | 'signal' | 'control' | 'adjustment') => {
        // 勾选 invalid 筛选
        if (!invalidChecked.value) {
            invalidChecked.value = true
        }
        // 切换到有问题的 Tab
        activeTab.value = targetTab
    }

    if (viewMode.value === 'mappings') {
        const invalidTabs: Array<'telemetry' | 'signal' | 'control' | 'adjustment'> = []
        const refs = [
            { ref: telemetryTableRef, tab: 'telemetry' as const },
            { ref: signalTableRef, tab: 'signal' as const },
            { ref: controlTableRef, tab: 'control' as const },
            { ref: adjustmentTableRef, tab: 'adjustment' as const },
        ]
        refs.forEach(({ ref, tab }) => {
            if (ref.value?.hasInvalid?.()) invalidTabs.push(tab)
        })
        if (invalidTabs.length > 0) {
            refs.forEach(({ ref }) => {
                if (ref.value?.hasInvalid?.() && ref.value?.getInvalidDetails) {
                    ref.value.getInvalidDetails()
                }
            })
            ensureInvalidHandled(invalidTabs[0])
            return
        }

        const param: BatchUpdateMappingPointRequest = {
            mappings: [
                ...(telemetryTableRef.value?.getEditedData?.() || []),
                ...(signalTableRef.value?.getEditedData?.() || []),
                ...(controlTableRef.value?.getEditedData?.() || []),
                ...(adjustmentTableRef.value?.getEditedData?.() || []),
            ],
            mode: 'merge',
            reload_channel: false,
            validate_only: false,
        }

        if (!param.mappings.length) {
            ElMessage.info('No mapping changes to submit')
            return
        }

        const res = await batchUpdateMappingPoint(channelId.value, param)
        if (res.success) {
            ElMessage.success('Point mapping updated successfully')
            isEditing.value = false
            // 刷新 points 数据，作为新的原始对比基准
            await refreshPointsBaseline()
            // 提交完成后清空筛选并显示全部
            clearStatusFilters()
            statusCheckboxValue.value = []
            invalidChecked.value = false
        }
    } else {
        const invalidTabs: Array<'telemetry' | 'signal' | 'control' | 'adjustment'> = []
        const pointRefs = [
            { ref: telemetryTableRef, tab: 'telemetry' as const },
            { ref: signalTableRef, tab: 'signal' as const },
            { ref: controlTableRef, tab: 'control' as const },
            { ref: adjustmentTableRef, tab: 'adjustment' as const },
        ]
        pointRefs.forEach(({ ref, tab }) => {
            if (ref.value?.hasInvalid?.()) invalidTabs.push(tab)
        })
        if (invalidTabs.length > 0) {
            pointRefs.forEach(({ ref }) => {
                if (ref.value?.hasInvalid?.() && ref.value?.getInvalidDetails) {
                    ref.value.getInvalidDetails()
                }
            })
            ensureInvalidHandled(invalidTabs[0])
            return
        }

        // 组装批量增删改 payload
        const toArray = (x: any) => (Array.isArray(x) ? x : [])
        const tRows = toArray(telemetryTableRef.value?.getEditedData?.())
        const sRows = toArray(signalTableRef.value?.getEditedData?.())
        const cRows = toArray(controlTableRef.value?.getEditedData?.())
        const aRows = toArray(adjustmentTableRef.value?.getEditedData?.())

        const pickData = (row: any, fields: string[]) => {
            const out: any = {}
            fields.forEach((f) => {
                if (row[f] !== undefined) out[f] = row[f]
            })
            return out
        }
        const BASE_FIELDS = [
            'data_type',
            'description',
            'offset',
            'reverse',
            'scale',
            'signal_name',
            'unit',
        ]
        const buildCreate = (rows: any[], point_type: 'T' | 'S' | 'C' | 'A') =>
            rows
                .filter((r) => r && r.rowStatus === 'added' && r.point_id > 0)
                .map((r) => ({
                    point_id: r.point_id,
                    point_type,
                    data: pickData(r, BASE_FIELDS),
                    // 文件导入得到的新增行，强制覆盖
                    ...(r?.isImported ? { force: true } : {}),
                }))
        const buildDelete = (rows: any[], point_type: 'T' | 'S' | 'C' | 'A') =>
            rows
                .filter((r) => r && r.rowStatus === 'deleted' && r.point_id > 0)
                .map((r) => ({
                    point_id: r.point_id,
                    point_type,
                }))
        const buildUpdate = (rows: any[], point_type: 'T' | 'S' | 'C' | 'A') =>
            rows
                .filter((r) => r && r.rowStatus === 'modified' && r.point_id > 0)
                .map((r) => {
                    const fields = Array.isArray(r.modifiedFields) ? r.modifiedFields : []
                    const data = pickData(
                        r,
                        fields.filter((f: string) => f !== 'point_id'),
                    )
                    return { point_id: r.point_id, point_type, data }
                })

        const payload: BatchPointsChangeRequest = {
            create: [
                ...buildCreate(tRows, 'T'),
                ...buildCreate(sRows, 'S'),
                ...buildCreate(cRows, 'C'),
                ...buildCreate(aRows, 'A'),
            ],
            delete: [
                ...buildDelete(tRows, 'T'),
                ...buildDelete(sRows, 'S'),
                ...buildDelete(cRows, 'C'),
                ...buildDelete(aRows, 'A'),
            ],
            update: [
                ...buildUpdate(tRows, 'T'),
                ...buildUpdate(sRows, 'S'),
                ...buildUpdate(cRows, 'C'),
                ...buildUpdate(aRows, 'A'),
            ],
        }

        // 如果三类均为空，则提示无变化
        const totalCount =
            (payload.create?.length || 0) + (payload.delete?.length || 0) + (payload.update?.length || 0)
        if (totalCount === 0) {
            ElMessage.info('No point changes to submit')
            return
        }

        const res = await postPointsBatch(channelId.value, payload)
        if (res.success) {
            ElMessage.success('Points updated successfully')
            isEditing.value = false
            await refreshPointsBaseline()
            // 提交完成后清空筛选并显示全部
            clearStatusFilters()
            statusCheckboxValue.value = []
            invalidChecked.value = false
        }
    }
}

const handleTabChange = (name: TabPaneName) => {
    // Tab 切换时重置筛选
    // 切换完成后，根据新的表刷新 publishDirty（保持批量发布模式不变）
    if (isPublish.value) {
        publishDirty.value = !!getTableInstance(String(name) as TabName)?.hasPublishChanges?.()
    }
    // 切换 Tab 后滚动到顶
    nextTick(() => {
        const ref = getCurrentTableRef()
        ref?.value?.scrollToTop?.()
    })
}

// Tabs 切换拦截：批量发布中如有修改则提示；确认后切换并退出批量发布，取消则停留
const handleBeforeLeave = async (newName: TabPaneName, oldName: TabPaneName) => {
    void newName
    void oldName
    if (!isPublish.value) return true

    if (publishDirty.value) {
        try {
            await ElMessageBox.confirm(
                'You have unsaved publish values. Do you want to switch tabs?',
                'Confirm Switch',
                {
                    confirmButtonText: 'Switch',
                    cancelButtonText: 'Stay',
                    type: 'warning',
                },
            )
            // 用户确认切换：清空当前 tab 的发布值并退出批量发布
            resetPublishForTab(activeTab.value as TabName)
            publishDirty.value = false
            isPublish.value = false
            return true
        } catch {
            // 取消切换，保持原 Tab
            return false
        }
    }

    // 无修改：直接退出批量发布并允许切换
    isPublish.value = false
    return true
}

// 切换发布模式
const togglePublishMode = async () => {
    if (isPublish.value) {
        if (publishDirty.value) {
            try {
                await ElMessageBox.confirm(
                    'You have unsaved publish values. Do you want to discard them?',
                    'Unsaved Changes',
                    {
                        confirmButtonText: 'Discard',
                        cancelButtonText: 'Cancel',
                        type: 'warning',
                    },
                )
                // 用户确认放弃
                isPublish.value = false
                publishDirty.value = false
                resetPublishAll()
            } catch {
                // 用户取消，不做任何操作
                return
            }
        } else {
            isPublish.value = false
            publishDirty.value = false
            resetPublishAll()
        }
    } else {
        // 开启发布模式：清空当前 tab 的发布值
        isPublish.value = true
        resetPublishForTab(activeTab.value as TabName)
        publishDirty.value = false
    }
}

// 提交发布
const handleSubmitPublish = async () => {
    let commands = []
    const activeRef = getCurrentTableRef()
    const activeInstance = activeRef?.value
    commands = activeInstance?.getPublishCommands?.()

    if (!Array.isArray(commands) || commands.length === 0) return
    const res = await publishPointValue(channelId.value, {
        type: mappingTypeToTabName[activeTab.value],
        points: commands,
    })
    if (res.success) {
        publishDirty.value = false
        isPublish.value = false
        activeInstance?.resetPublish?.()
        ElMessage.success('Batch publish successful')
    }
}

// 根据激活 tab 获取对应表格实例
const getCurrentTableRef = () => {
    return tableRefsByTab[activeTab.value as TabName] || null
}

// 获取是否有未保存的修改
const getHasChanges = () =>
    (viewMode.value === 'points' &&
        (telemetryTableRef.value?.hasChanges?.() ||
            signalTableRef.value?.hasChanges?.() ||
            controlTableRef.value?.hasChanges?.() ||
            adjustmentTableRef.value?.hasChanges?.())) ||
    (viewMode.value === 'mappings' &&
        (telemetryTableRef.value?.hasChanges?.() ||
            signalTableRef.value?.hasChanges?.() ||
            controlTableRef.value?.hasChanges?.() ||
            adjustmentTableRef.value?.hasChanges?.()))

// 执行退出编辑并恢复原始数据
const performCancelEdit = () => {
    pointsData.value = deepClone(originalPointsData.value)
    isEditing.value = false
    isPublish.value = false
    publishDirty.value = false
    editFilters.value = []
    statusCheckboxValue.value = []
    invalidChecked.value = false
    telemetryTableRef.value?.clearImportedFileName?.()
    signalTableRef.value?.clearImportedFileName?.()
    controlTableRef.value?.clearImportedFileName?.()
    adjustmentTableRef.value?.clearImportedFileName?.()
    resetPublishAll()
    clearAllSignalFilters()
}

// 返回：编辑模式且有修改时弹出确认（与 Cancel Edit 类似），否则直接返回
const handleBack = async () => {
    if (isEditing.value && getHasChanges()) {
        try {
            await ElMessageBox.confirm(
                'You have unsaved changes. Do you want to discard them?',
                'Unsaved Changes',
                {
                    confirmButtonText: 'Discard',
                    cancelButtonText: 'Cancel',
                    type: 'warning',
                },
            )
        } catch {
            return
        }
    }
    if (isEditing.value) {
        performCancelEdit()
    } else {
        clearAllSignalFilters()
    }
    router.push('/channelConfiguration')
}

// 取消编辑：退出编辑模式并恢复原始数据（遵循之前的逻辑）
const handleCancelEdit = async () => {
    if (getHasChanges()) {
        try {
            await ElMessageBox.confirm(
                'You have unsaved changes. Do you want to discard them?',
                'Unsaved Changes',
                {
                    confirmButtonText: 'Discard',
                    cancelButtonText: 'Cancel',
                    type: 'warning',
                },
            )
        } catch {
            return
        }
    }
    performCancelEdit()
}

// 统一清理：关闭前清理所有表的 Signal Name 筛选
const clearAllSignalFilters = () => {
    telemetryTableRef.value?.clearSignalNameFilter?.()
    signalTableRef.value?.clearSignalNameFilter?.()
    controlTableRef.value?.clearSignalNameFilter?.()
    adjustmentTableRef.value?.clearSignalNameFilter?.()
}

// 统一清空状态筛选并显示全部
const clearStatusFilters = () => {
    editFilters.value = []
    statusCheckboxValue.value = []
    invalidChecked.value = false
    clearAllSignalFilters()
}

// 初始化数据
const initData = async () => {
    const id = route.query.id as string
    const name = route.query.name as string
    const protocol = route.query.protocol as 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'
    if (!id) {
        ElMessage.error('Channel ID is required')
        handleBack()
        return
    }

    channelId.value = Number(id)
    if (name) channelName.value = name
    if (protocol) channelProtocol.value = protocol

    // 设置初始 tab
    activeTab.value = protocol === 'di_do' ? 'signal' : 'telemetry'

    // 加载 points 数据
    await refreshPointsBaseline()

    // 如果没有 name，从接口获取
    if (!name) {
        const detail = await getChannelDetail(channelId.value)
        if (detail.success) {
            channelName.value = detail.data.name || ''
        }
    }

    // 准备 dataType -> 表引用映射
    dataTypeToRef.T = telemetryTableRef
    dataTypeToRef.S = signalTableRef
    dataTypeToRef.C = controlTableRef
    dataTypeToRef.A = adjustmentTableRef

    // 建立 WebSocket 连接并订阅当前通道的四类数据
    pageId.value = `points-${channelId.value}-${Date.now()}`
    wsManager.subscribe(
        {
            source: 'comsrv',
            channels: [channelId.value],
            dataTypes: ['T', 'S', 'C', 'A'],
            interval: 1000,
        },
        {
            onBatchDataUpdate: (payload: any) => {
                if (!payload?.updates?.length) return
                payload.updates.forEach((upd: any) => {
                    if (upd.channel_id !== channelId.value) return
                    const refMap = dataTypeToRef[upd.data_type as DataType]
                    refMap?.value?.applyRealtimeValues?.(upd.values, upd.ts)
                })
            },
        },
        pageId.value,
    )

    // 打开后将当前表滚动到顶部
    nextTick(() => {
        const ref = getCurrentTableRef()
        ref?.value?.scrollToTop?.()
    })
}

onMounted(() => {
    initData()
})

onUnmounted(() => {
    // 关闭时取消页面订阅
    if (pageId.value) {
        try {
            wsManager.unsubscribe(pageId.value)
        } catch { }
        pageId.value = ''
    }
})

// 监听路由变化
watch(
    () => route.query,
    () => {
        initData()
    },
    { deep: true },
)
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.voltage-class.points-tables-page {
    height: 100%;
    display: flex;
    flex-direction: column;

    .points-tables-page__header {
        margin-bottom: 20px;

        .points-tables-page__header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex: 1;
            min-width: 0;

            .points-tables-page__header-title {
                font-size: $font-size-large;
                font-weight: $font-weight-semibold;
                color: $text-color-primary;
            }

            .points-tables-page__dropdown-trigger {
                display: inline-flex;
                align-items: center;
                font-size: $font-size-large;
                font-weight: $font-weight-semibold;
                color: $text-color-primary;
                cursor: pointer;

                :deep(.el-icon--right) {
                    margin-left: 4px;
                    width: 1em;
                    height: 1em;
                }
            }

            .points-tables-page__channel-name {
                font-size: $font-size-large;
                font-weight: $font-weight-semibold;
                color: $text-color-primary;
                flex-shrink: 0;
                margin-left: 4px;
            }
        }
    }

    .points-tables-page__content {
        flex: 1;
        overflow: hidden;
        padding: 20px 20px 10px 20px;
        display: flex;
        flex-direction: column;
    }

    .points-tables-page__footer {
        padding: 20px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }
}

.voltage-class .rule-management__expand-content {
    height: 100%;

    .config-section__tabs-wrapper {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .config-section__tabs {
            width: 100%;
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;

            // 确保 tab header 有相对定位，以便 Status 筛选器可以相对于它定位
            :deep(.el-tabs__header) {
                position: relative;
                flex-shrink: 0;
            }

            :deep(.el-tabs__content) {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;

                .el-tab-pane {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
            }
        }

        .config-section__status-filter {
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10;
            // 与 tab 标签对齐（tab 标签的高度通常在 40px 左右）
            height: 40px;
            line-height: 40px;

            .filter-label {
                font-size: 14px;
                color: #fff;
                white-space: nowrap;
            }

            .status-checkbox-group {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
            }

            :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
                border-color: #fff !important;
            }

            :deep(.status-invalid-checkbox .el-checkbox__input.is-checked .el-checkbox__inner::after) {
                border-color: #fff !important;
            }
        }
    }


}

:deep(.el-tabs__content) {
    position: static;
}

/* 通用：操作列中的错误提示图标样式（编辑态下无效行） */
.voltage-class .point-table {
    .point-table__operation-cell {
        .point-table__error-tip {
            color: #f56c6c;
            font-size: 18px;
            margin-right: 4px;
        }
    }
}


:deep(.el-table td) {
    padding: 9px 12px;
}

:deep(.el-table .cell) {
    height: 32px;
    line-height: 32px;
}
</style>

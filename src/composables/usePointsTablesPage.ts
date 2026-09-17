import { computed, ref, watch, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'

export type PointsTablesSecondaryView = 'mappings' | 'routing'

export interface UsePointsTablesPageOptions<TSecondary extends string = PointsTablesSecondaryView> {
  /** Dropdown command for secondary view, e.g. mappings / routing */
  secondaryViewCommand: string
  /** Computed secondary view mode value */
  secondaryViewMode: TSecondary
  activeTab: Ref<string>
  resetPublishForTab: (tab: string) => void
  resetPublishAll: () => void
  resolvePublishDirtyForTab: (tab: string) => boolean
  onTabChanged?: () => void
}

const UNSAVED_CHANGES_CONFIRM = {
  confirmButtonText: 'Discard',
  cancelButtonText: 'Cancel',
  type: 'warning' as const,
  center: true,
  showClose: false,
}

const PUBLISH_SWITCH_CONFIRM = {
  confirmButtonText: 'Switch',
  cancelButtonText: 'Stay',
  type: 'warning' as const,
  center: true,
  showClose: false,
}

const PUBLISH_DISCARD_CONFIRM = {
  confirmButtonText: 'Discard',
  cancelButtonText: 'Cancel',
  type: 'warning' as const,
  center: true,
  showClose: false,
}

export function usePointsTablesPage<TSecondary extends string = PointsTablesSecondaryView>(
  options: UsePointsTablesPageOptions<TSecondary>,
) {
  const viewModeSwitch = ref(false)
  const viewMode = computed((): 'points' | TSecondary =>
    viewModeSwitch.value ? options.secondaryViewMode : ('points' as const),
  )

  const editFilters = ref<string[]>([])
  const statusCheckboxValue = ref<string[]>([])
  const invalidChecked = ref(false)

  const isPublish = ref(false)
  const publishDirty = ref(false)

  const handleStatusCheckboxChange = (val: string[]) => {
    if (val.length > 1) {
      statusCheckboxValue.value = [val[val.length - 1]]
    }
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

  const resetStatusFilters = () => {
    editFilters.value = []
    statusCheckboxValue.value = []
    invalidChecked.value = false
  }

  const handleViewModeChange = () => {
    resetStatusFilters()
  }

  const handleDropdownCommand = (command: string) => {
    if (command === 'points') {
      viewModeSwitch.value = false
    } else if (command === options.secondaryViewCommand) {
      viewModeSwitch.value = true
    }
    handleViewModeChange()
  }

  const handleTabChange = (tabName?: string | number) => {
    if (isPublish.value) {
      const tab = String(tabName ?? options.activeTab.value)
      publishDirty.value = options.resolvePublishDirtyForTab(tab)
    }
    options.onTabChanged?.()
  }

  const handleBeforeLeave = async (_newName?: string | number, _oldName?: string | number) => {
    void _newName
    void _oldName
    if (!isPublish.value) return true

    if (publishDirty.value) {
      try {
        await ElMessageBox.confirm(
          'You have unsaved publish values. Do you want to switch tabs?',
          'Confirm Switch',
          PUBLISH_SWITCH_CONFIRM,
        )
        options.resetPublishForTab(String(options.activeTab.value))
        publishDirty.value = false
        isPublish.value = false
        return true
      } catch {
        return false
      }
    }

    isPublish.value = false
    return true
  }

  const togglePublishMode = async () => {
    if (isPublish.value) {
      if (publishDirty.value) {
        try {
          await ElMessageBox.confirm(
            'You have unsaved publish values. Do you want to discard them?',
            'Unsaved Changes',
            PUBLISH_DISCARD_CONFIRM,
          )
          isPublish.value = false
          publishDirty.value = false
          options.resetPublishAll()
        } catch {
          return
        }
      } else {
        isPublish.value = false
        publishDirty.value = false
        options.resetPublishAll()
      }
    } else {
      isPublish.value = true
      options.resetPublishForTab(String(options.activeTab.value))
      publishDirty.value = false
    }
  }

  const confirmDiscardUnsavedChanges = async (): Promise<boolean> => {
    try {
      await ElMessageBox.confirm(
        'You have unsaved changes. Do you want to discard them?',
        'Unsaved Changes',
        UNSAVED_CHANGES_CONFIRM,
      )
      return true
    } catch {
      return false
    }
  }

  const handleCancelEdit = async (
    getHasChanges: () => boolean,
    performCancelEdit: () => void,
  ) => {
    if (getHasChanges()) {
      const confirmed = await confirmDiscardUnsavedChanges()
      if (!confirmed) return
    }
    performCancelEdit()
  }

  const resetPublishState = () => {
    isPublish.value = false
    publishDirty.value = false
    options.resetPublishAll()
  }

  return {
    viewModeSwitch,
    viewMode,
    editFilters,
    statusCheckboxValue,
    invalidChecked,
    handleStatusCheckboxChange,
    resetStatusFilters,
    handleViewModeChange,
    handleDropdownCommand,
    isPublish,
    publishDirty,
    handleTabChange,
    handleBeforeLeave,
    togglePublishMode,
    confirmDiscardUnsavedChanges,
    handleCancelEdit,
    resetPublishState,
  }
}

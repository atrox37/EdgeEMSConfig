<template>
  <div class="voltage-class left-panel-shell">
    <aside class="left-panel">
      <div class="left-panel__title">Device Node Library</div>
      <div class="left-panel__categories">
        <div class="left-panel__categories-longkuo">
          <el-collapse v-model="activeGroups" expand-icon-position="left" class="left-panel__collapse">
            <el-collapse-item v-for="group in panelGroups" :key="group.key" :name="group.key" :title="group.title"
              class="left-panel__collapse-item">
              <div class="left-panel__image-grid">
                <div v-for="tpl in group.templates" :key="tpl.id" class="left-panel__image-item" draggable="true"
                  :title="tpl.label" @dragstart="onDragStart($event, tpl)">
                  <div class="left-panel__image-type">{{ tpl.description }}</div>
                  <div class="left-panel__image-content">
                    <img v-if="tpl.imageUrl" :src="tpl.imageUrl" :alt="tpl.label" class="left-panel__image-thumb"
                      draggable="false" />
                    <div v-else class="left-panel__image-fallback">{{ tpl.label.slice(0, 2) }}</div>
                    <div class="left-panel__image-label">{{ tpl.label }}</div>
                  </div>


                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getTopologyPanelGroups } from '@/constants/deviceProducts'
import useModelDnd from '../useModelDnd'

const { onDragStart } = useModelDnd()
const activeGroups = ref(['generation', 'storage', 'load'])
const panelGroups = getTopologyPanelGroups()

</script>

<style lang="scss" scoped>
.left-panel-shell {
  position: relative;
  display: flex;
  height: 100%;
  width: 365px;
  flex-shrink: 0;
}

.left-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: rgba(19, 44, 84, 0.08);
  border-right: 1px solid rgba(15, 31, 61, 0.08);
  overflow: hidden;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
  box-shadow: 6px 0 12px rgba(15, 31, 61, 0.08);
  background: #ffffff;
  border: 2px solid #E3E6E9;
  border-radius: 4px;

  .left-panel__title {
    padding: 14px 16px;
    color: #354C7B;
    background: #EDEDF6;
    // border-bottom: 1px solid #e4e9f1;
    font-size: 16px;
    font-weight: 700;
  }

  .left-panel__categories {
    height: calc(100% - 44px);
    padding: 16px 6px;

    .left-panel__categories-longkuo {
      padding: 0 5px;
      overflow-y: auto;
      height: 100%;
    }
  }

  .left-panel__collapse {
    border: none;

    :deep(.el-collapse) {
      border: none;
    }

    :deep(.el-collapse-item__wrap) {
      border-bottom: none;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }

    // :deep(.el-collapse-item__header) {
    //   padding: 0 4px;
    //   font-size: 14px;
    //   font-weight: 600;
    //   color: var(--vt-color-secondary);
    //   background: color-mix(in srgb, var(--vt-color-secondary) 12%, transparent);
    //   border: 1px solid color-mix(in srgb, var(--vt-color-secondary) 35%, transparent);
    //   border-radius: 6px;
    //   height: 16px;
    //   min-height: 36px;
    //   line-height: 1.4;
    // }

    // :deep(.el-collapse-item__header.is-active) {
    //   border-bottom-left-radius: 0;
    //   border-bottom-right-radius: 0;
    //   color: var(--vt-color-primary);
    //   background: color-mix(in srgb, var(--vt-color-primary) 20%, transparent);
    //   border-color: color-mix(in srgb, var(--vt-color-primary) 35%, transparent);
    // }

    // :deep(.el-collapse-item__header.is-active .el-collapse-item__arrow) {
    //   color: var(--vt-color-primary);
    // }

    // :deep(.el-collapse-item__arrow) {
    //   font-size: 12px;
    //   color: var(--vt-color-secondary);
    // }

    // :deep(.el-collapse-item__title) {
    //   padding-left: 4px;
    // }

    // :deep(.el-collapse-item__content) {
    //   padding: 8px 8px 10px;
    //   border-radius: 0 0 8px 8px;
    //   background: rgba(255, 255, 255, 0.7);
    //   border: 1px solid rgba(255, 138, 0, 0.12);
    //   border-top: none;
    // }
  }

  .left-panel__collapse-item {
    margin-bottom: 8px;

    .left-panel__collapse-item:last-child {
      margin-bottom: 0;
    }
  }

  .left-panel__loading {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 4px;
    font-size: 12px;
    color: #909399;
  }

  .left-panel__node-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .left-panel__device-filter {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .left-panel__device-filter-label {
    font-size: 12px;
    font-weight: 600;
    color: #3d5a80;
    flex-shrink: 0;
  }

  .left-panel__device-filter-select {
    flex: 1;
    min-width: 0;
  }

  .left-panel__node-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: grab;
    transition: all 0.15s;
    border: 1px solid transparent;
  }

  .left-panel__node-item:hover {
    transform: translateX(2px);
  }

  .left-panel__node-item:active {
    cursor: grabbing;
  }

  .left-panel__node-item--station {
    background: rgba(26, 35, 126, 0.08);
    border-color: rgba(26, 35, 126, 0.2);
  }

  .left-panel__node-item--station:hover {
    border-color: #3949ab;
  }

  .left-panel__node-item--container {
    background: rgba(156, 39, 176, 0.07);
    border-color: rgba(156, 39, 176, 0.2);
  }

  .left-panel__node-item--container:hover {
    border-color: #9c27b0;
  }

  .left-panel__node-icon {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    :deep(svg) {
      width: 16px;
      height: 16px;
    }

    .left-panel__node-icon--station {
      background: #e8eaf6;

      :deep(svg) {
        color: #3949ab !important;
      }
    }

    .left-panel__node-icon--container {
      background: #f3e5f5;

      :deep(svg) {
        color: #9c27b0 !important;
      }
    }
  }

  .left-panel__node-info {
    flex: 1;
    min-width: 0;
  }

  .left-panel__node-name {
    font-size: 12px;
    font-weight: 600;
    color: #1a2438;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .left-panel__node-desc {
    font-size: 10px;
    color: #909399;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .left-panel__image-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .left-panel__image-item {
    position: relative;
    height: 140px;
    display: flex;
    flex-direction: column;
    // align-items: center;
    // gap: 4px;
    padding: 8px;
    border-radius: 8px;
    cursor: grab;
    border: 1px solid #EEEEEE;
    transition: all 300ms ease-out;
  }

  .left-panel__image-item:hover {
    border-color: #B3CEFA;
  }

  .left-panel__image-item:active {
    border-color: #B3CEFA;
    box-shadow: 0px 6px 12px 0px #0000001A;
    background-color: #F8F9FB;


  }

  .left-panel__image-type {
    height: 20px;
    width: 75px;
    padding: 4px 6px;
    font-size: 12px;
    color: #035DEF;
    background: rgba(3, 93, 239, 0.1);
    line-height: 1;
    border-radius: 4px;
  }

  .left-panel__image-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .left-panel__image-thumb {
      width: 72px;
      height: 72px;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
    }

    .left-panel__image-fallback {
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: #4a90d9;
      background: rgba(74, 144, 217, 0.08);
      border-radius: 8px;
    }

    .left-panel__image-label {
      font-size: 14px;
      color: #333333;
      text-align: center;
      line-height: 1;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }


  .left-panel__tips {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 12px;
    background: rgba(74, 144, 217, 0.06);
    border-top: 1px solid rgba(15, 31, 61, 0.06);
    font-size: 11px;
    color: #7f8c9a;
    line-height: 1.6;
    flex-shrink: 0;

    .left-panel__tips-icon {
      flex-shrink: 0;
      margin-top: 1px;

      :deep(svg) {
        width: 14px;
        height: 14px;
        color: #7f8c9a !important;
      }
    }
  }
}

// .left-panel {
//   background: #ffffff;




//   .left-panel__collapse {
//     // :deep(.el-collapse-item__header),
//     // :deep(.el-collapse-item__header.is-active) {
//     //   min-height: 40px;
//     //   padding: 0 8px;
//     //   color: #1f1f1f;
//     //   background: #ffffff;
//     //   border: 0;
//     //   border-bottom: 1px solid #edf1f6;
//     //   border-radius: 0;
//     // }

//     // :deep(.el-collapse-item__content) {
//     //   padding: 10px 0 14px;
//     //   background: #ffffff;
//     //   border: 0;
//     // }
//   }

//   .left-panel__image-grid {
//     gap: 12px;
//   }

//   .left-panel__image-item {
//     min-height: 148px;
//     padding: 10px 8px;
//     border: 1px solid #e5eaf2;
//     border-radius: 8px;
//     background: #ffffff;
//     box-shadow: 0 2px 6px rgba(31, 57, 100, 0.03);
//   }

//   .left-panel__image-item:hover {
//     border-color: #8bb5ff;
//     background: #f7faff;
//   }

//   .left-panel__image-thumb,
//   .left-panel__image-fallback {
//     width: 92px;
//     height: 92px;
//   }

//   .left-panel__image-label {
//     color: #3f4652;
//     font-size: 12px;
//   }

//   .left-panel__tips {
//     display: none;
//   }
// }
</style>

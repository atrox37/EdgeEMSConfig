import type { Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { toBlob } from 'html-to-image'
import type { ModelFlowData } from '@/types/visualModeling'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'
import { sanitizeFileNamePart } from '@/utils/csvExport'
import {
  normalizeTopology,
  stripKnownTopologyRuntimeFields,
  validateTopologyImport,
  type TopologyNormalizeResult,
} from '@/utils/topologyNormalize'
import type ModelingCanvas from '../components/ModelingCanvas.vue'
import type TopologyIssuesDialog from '../components/dialogs/TopologyIssuesDialog.vue'
import type { ProductListItem } from '@/types/deviceConfiguration'

export interface UseVisualModelingImportExportOptions {
  modelId: string
  getModelById: (id: string) => { id: string; name: string } | undefined
  products: () => ProductListItem[]
  modelingCanvasRef: Ref<InstanceType<typeof ModelingCanvas> | null>
  importInput: Ref<HTMLInputElement | null>
  topologyIssuesDialogRef: Ref<InstanceType<typeof TopologyIssuesDialog> | null>
  exportLoading: Ref<boolean>
  syncEdgesFromFlow: () => Promise<void>
  exportCurrentFlow: () => ModelFlowData
  refreshTopologyValidationData: () => Promise<void>
  persistenceValidationOptions: (useCurrentFixedBindings?: boolean) => Record<string, unknown>
  hydrateCanvasFromFlow: (flow: ModelFlowData) => Promise<void>
  markDirty: () => void
  onSnapshot: () => void
}

function buildExportFilename(name: string, extension: 'json' | 'png'): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '_',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
  return `${sanitizeFileNamePart(name, 'topology')}_${timestamp}.${extension}`
}

export function useVisualModelingImportExport(options: UseVisualModelingImportExportOptions) {
  async function handleExportJson() {
    const model = options.getModelById(options.modelId)
    if (!model) return
    await options.syncEdgesFromFlow()
    const exportData = {
      station_id: 'station',
      station_name: 'Station',
      flow_json: options.exportCurrentFlow(),
    }
    const bytes = new TextEncoder().encode(JSON.stringify(exportData, null, 2))
    const saveResult = await saveBytesWithPreferredPath(
      bytes,
      buildExportFilename(model.name, 'json'),
      'application/json',
    )
    ElMessage.success(`JSON exported: ${saveResult.displayPath}`)
  }

  async function handleExportPng() {
    const model = options.getModelById(options.modelId)
    const canvas = options.modelingCanvasRef.value?.getExportElement()
    if (!model || !canvas) {
      ElMessage.error('PNG export failed: canvas is not ready')
      return
    }

    const edgePaths = Array.from(canvas.querySelectorAll<SVGPathElement>(
      '.vue-flow__edge path, .vue-flow__edge-path',
    ))
    const originalEdgeStyles = edgePaths.map((path) => ({
      path,
      style: path.getAttribute('style'),
    }))

    edgePaths.forEach((path) => {
      path.style.setProperty('fill', 'none', 'important')
      path.style.setProperty('stroke', '#B3CEFA', 'important')
      path.style.setProperty('stroke-width', '3', 'important')
    })

    try {
      const blob = await toBlob(canvas, {
        backgroundColor: '#fbfcff',
        cacheBust: false,
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLElement && (
          node.classList.contains('modeling-editor__flow-controls')
          || node.classList.contains('modeling-editor__minimap')
          || node.classList.contains('modeling-editor__floating-actions')
        )),
      })
      if (!blob) throw new Error('Failed to create topology PNG blob')
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const saveResult = await saveBytesWithPreferredPath(
        bytes,
        buildExportFilename(model.name, 'png'),
        'image/png',
      )
      ElMessage.success(`PNG exported: ${saveResult.displayPath}`)
    } catch (error) {
      console.error('[VisualModeling] PNG export failed', error)
      ElMessage.error('PNG export failed')
    } finally {
      originalEdgeStyles.forEach(({ path, style }) => {
        if (style === null) path.removeAttribute('style')
        else path.setAttribute('style', style)
      })
    }
  }

  async function handleExportCommand(cmd: string) {
    if (options.exportLoading.value) return
    options.exportLoading.value = true
    try {
      if (cmd === 'json') await handleExportJson()
      if (cmd === 'png') await handleExportPng()
    } finally {
      options.exportLoading.value = false
    }
  }

  function handleImportClick() {
    options.importInput.value?.click()
  }

  function handleImportChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        const flow = stripKnownTopologyRuntimeFields(parsed.flow_json || parsed) as ModelFlowData
        const rawNodes = Array.isArray(flow.nodes) ? flow.nodes : []
        const rawEdges = Array.isArray(flow.edges) ? flow.edges : []
        if (!rawNodes.length && !rawEdges.length) {
          ElMessage.error('Import failed: no node data found')
          return
        }

        await options.refreshTopologyValidationData()
        const importOptions = options.persistenceValidationOptions(false)
        const strictValidation = validateTopologyImport(flow, options.products(), importOptions)
        if (!strictValidation.canSave) {
          void options.topologyIssuesDialogRef.value?.open({ mode: 'import', issues: strictValidation.issues })
          return
        }

        const normalized: TopologyNormalizeResult = normalizeTopology(
          flow as ModelFlowData,
          options.products(),
          importOptions,
        )

        void (async () => {
          if (!normalized.canImport) {
            await options.topologyIssuesDialogRef.value?.open({
              mode: 'import',
              issues: normalized.issues,
              appliedFixes: normalized.appliedFixes,
            })
            return
          }

          if (normalized.warnings.length || normalized.appliedFixes.length) {
            const proceed = await options.topologyIssuesDialogRef.value?.open({
              mode: 'import',
              issues: normalized.issues,
              appliedFixes: normalized.appliedFixes,
            })
            if (!proceed) return
          }

          await options.hydrateCanvasFromFlow(normalized.flow)
          options.markDirty()
          options.onSnapshot()
          ElMessage.success(
            normalized.appliedFixes.length
              ? 'Imported successfully (data was cleaned up)'
              : 'Imported successfully',
          )
        })()
      } catch {
        ElMessage.error('Import failed: invalid JSON')
      } finally {
        ;(e.target as HTMLInputElement).value = ''
      }
    }
    reader.readAsText(file)
  }

  return {
    handleExportCommand,
    handleImportClick,
    handleImportChange,
  }
}

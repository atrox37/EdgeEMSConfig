import { onUnmounted, type Ref } from 'vue'

type FlowFitOptions = {
  includeHiddenNodes?: boolean
  padding?: number
  duration?: number
}

type UseFlowViewportOptions = {
  fitView: (options?: FlowFitOptions) => Promise<boolean> | boolean | void
  getNodes: Ref<unknown[]> | (() => unknown[])
  padding?: number
  resizeDelay?: number
}

export function useFlowViewport(options: UseFlowViewportOptions) {
  let resizeTimer: number | null = null

  function hasNodes() {
    const nodes = typeof options.getNodes === 'function' ? options.getNodes() : options.getNodes.value
    return nodes.length > 0
  }

  async function fitFlowToViewport(animated = false) {
    if (!hasNodes()) return
    await options.fitView({
      includeHiddenNodes: true,
      padding: options.padding ?? 0.2,
      duration: animated ? 300 : 0,
    })
  }

  function handleWindowResize(_event?: Event, animated = true) {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      void fitFlowToViewport(animated)
    }, options.resizeDelay ?? 160)
  }

  function disposeViewport() {
    if (resizeTimer !== null) {
      window.clearTimeout(resizeTimer)
      resizeTimer = null
    }
  }

  onUnmounted(disposeViewport)

  return {
    fitFlowToViewport,
    handleWindowResize,
    disposeViewport,
  }
}

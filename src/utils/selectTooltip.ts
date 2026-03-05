let selectTooltipInstalled = false

const resolveTooltipTarget = (item: HTMLElement): HTMLElement => {
  const firstChild = item.firstElementChild as HTMLElement | null
  return firstChild ?? item
}

export const installSelectOverflowTooltip = () => {
  if (selectTooltipInstalled || typeof document === 'undefined') return
  selectTooltipInstalled = true

  document.addEventListener(
    'mouseover',
    event => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const item = target.closest('.el-select__popper.el-popper .el-select-dropdown__item') as
        | HTMLElement
        | null
      if (!item) return

      const textContainer = resolveTooltipTarget(item)
      const shouldShowTooltip =
        textContainer.scrollWidth > textContainer.clientWidth || item.scrollWidth > item.clientWidth

      if (shouldShowTooltip) {
        const text = item.innerText?.trim()
        if (text) {
          item.setAttribute('title', text)
          return
        }
      }

      item.removeAttribute('title')
    },
    true,
  )
}


/** Resolve the image filename returned by product topology metadata. */
const IMAGE_ASSETS = import.meta.glob('../assets/images/*', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

export function getProductInstanceImageUrl(imageName?: string): string | undefined {
  if (!imageName) return undefined
  const normalizedImageName = imageName.split('/').pop() ?? imageName
  return IMAGE_ASSETS[`../assets/images/${normalizedImageName}`]
}

export function hasProductInstanceImage(imageName?: string): boolean {
  return !!getProductInstanceImageUrl(imageName)
}

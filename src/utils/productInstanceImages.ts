/** 产品名 → Instance 设备图片（assets/images） */
const PRODUCT_IMAGE_FILE: Record<string, string> = {
  Battery: 'Instance Battery.png',
  PCS: 'Instance PCS.png',
  Diesel: 'Instance Diesel.png',
  PVInverter: 'Instance PV Inverter.png',
  'PV DCDC': 'Instance PV DCDC.png',
  EVChargingLoad:   'Instance EV Charging Load.png',
  Env:              'Instance Environment.png',
  HVACLoad:         'Instance HVAC Load.png',
  Load:             'Instance Load.png',
  Load_Three_Phase: 'Instance Three Phase Load.png',
}

const imageModules = import.meta.glob<string>(
  '/src/assets/images/Instance *.png',
  { eager: true, import: 'default' },
)

function resolveImageUrl(fileName: string): string | undefined {
  const entry = Object.entries(imageModules).find(([path]) => path.endsWith(fileName))
  return entry?.[1]
}

export function getProductInstanceImageUrl(productName?: string): string | undefined {
  if (!productName) return undefined
  const fileName = PRODUCT_IMAGE_FILE[productName]
  if (!fileName) return undefined
  return resolveImageUrl(fileName)
}

export function hasProductInstanceImage(productName?: string): boolean {
  return !!getProductInstanceImageUrl(productName)
}

/** Product name → topology device image URL. */
const PRODUCT_IMAGE_URL: Record<string, string> = {
  'PV Group': new URL('../assets/images/device-PvGroup.png', import.meta.url).href,
  'AC Inverter': new URL('../assets/images/device-ACInverter.png', import.meta.url).href,
  'Hybrid Inverter': new URL('../assets/images/device-HybridInverter.png', import.meta.url).href,
  'Distribution Board': new URL('../assets/images/device-DistributionBoard.png', import.meta.url).href,
  'Three Phase Load': new URL('../assets/images/device-ThreePhaseLoad.png', import.meta.url).href,
  'EV Charging Load': new URL('../assets/images/device-EVChargingLoad.png', import.meta.url).href,
  'HVAC Load': new URL('../assets/images/device-HVACLoad.png', import.meta.url).href,
  Battery: new URL('../assets/images/device-Battery.png', import.meta.url).href,
  PCS: new URL('../assets/images/device-PCS.png', import.meta.url).href,
  Diesel: new URL('../assets/images/device-Diesel.png', import.meta.url).href,
  Load: new URL('../assets/images/device-Load.png', import.meta.url).href,
  Meter: new URL('../assets/images/device-LoadMeter.png', import.meta.url).href,
}

export function getProductInstanceImageUrl(productName?: string): string | undefined {
  if (!productName) return undefined
  return PRODUCT_IMAGE_URL[productName]
}

export function hasProductInstanceImage(productName?: string): boolean {
  return !!getProductInstanceImageUrl(productName)
}

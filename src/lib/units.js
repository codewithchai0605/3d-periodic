import { createContext, useContext } from 'react'

export const UNITS = ['K', '°C', '°F']
export const UnitCtx = createContext({ unit: 'K', setUnit: () => {} })
export const useUnit = () => useContext(UnitCtx)

export function fromK(k, unit) {
  if (unit === '°C') return k - 273.15
  if (unit === '°F') return (k - 273.15) * 1.8 + 32
  return k
}
export function fmtTemp(k, unit) {
  if (k == null) return null
  return `${Math.round(fromK(k, unit)).toLocaleString()} ${unit}`
}
/** The "other" unit shown as small print under a value. */
export const altUnit = (unit) => (unit === 'K' ? '°C' : 'K')

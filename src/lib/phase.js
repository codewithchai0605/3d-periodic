/**
 * State of matter of an element at temperature T (kelvin) and ~1 atm.
 * Uses melting / boiling points. Where an element sublimes (boil <= melt) it
 * goes straight from solid to gas. Where data is missing we say "unknown".
 */
export function stateAt(el, T) {
  const { melt, boil } = el
  if (melt == null && boil == null) return 'unknown'
  if (melt == null) return T < boil ? 'liquid' : 'gas' // e.g. helium never freezes at 1 atm
  if (boil != null && boil <= melt) return T < boil ? 'solid' : 'gas' // sublimation
  if (T < melt) return 'solid'
  if (boil == null) return 'liquid'
  return T < boil ? 'liquid' : 'gas'
}

export const kToC = (k) => k - 273.15
export const kToF = (k) => (k - 273.15) * 1.8 + 32

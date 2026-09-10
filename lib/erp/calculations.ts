export type NumericInput = number | string | null | undefined

export function toNumber(value: NumericInput): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function safeDivide(numerator: NumericInput, denominator: NumericInput): number | null {
  const divisor = toNumber(denominator)
  if (divisor === 0) return null
  return toNumber(numerator) / divisor
}

export function calculateDistance(kmInitial: NumericInput, kmFinal: NumericInput): number {
  const initial = toNumber(kmInitial)
  const final = toNumber(kmFinal)
  if (final < initial) throw new Error('O KM final não pode ser menor que o KM inicial')
  return final - initial
}

export function calculateOperationMetrics(input: {
  km: NumericInput
  trips: NumericInput
  tons: NumericInput
  liters: NumericInput
  kmInitial?: NumericInput
  kmFinal?: NumericInput
}) {
  const km = input.kmInitial != null && input.kmFinal != null
    ? calculateDistance(input.kmInitial, input.kmFinal)
    : toNumber(input.km)
  const trips = toNumber(input.trips)
  const tons = toNumber(input.tons)
  const liters = toNumber(input.liters)

  return {
    km,
    trips,
    tons,
    liters,
    kmPerTrip: safeDivide(km, trips),
    tonsPerTrip: safeDivide(tons, trips),
    kmPerLiter: safeDivide(km, liters),
    litersPer100Km: safeDivide(liters * 100, km),
  }
}

export function calculateFuelCost(liters: NumericInput, pricePerLiter: NumericInput, totalCost?: NumericInput) {
  const calculatedTotal = totalCost == null ? toNumber(liters) * toNumber(pricePerLiter) : toNumber(totalCost)
  return {
    totalCost: calculatedTotal,
    costPerKm: null as number | null,
  }
}

export function calculateFinancialMetrics(input: {
  revenue: NumericInput
  costs: NumericInput
  tons?: NumericInput
  trips?: NumericInput
  km?: NumericInput
}) {
  const revenue = toNumber(input.revenue)
  const costs = toNumber(input.costs)
  const result = revenue - costs
  return {
    revenue,
    costs,
    result,
    marginPercent: safeDivide(result * 100, revenue),
    costPerTon: safeDivide(costs, input.tons),
    costPerTrip: safeDivide(costs, input.trips),
    costPerKm: safeDivide(costs, input.km),
    revenuePerTon: safeDivide(revenue, input.tons),
    revenuePerTrip: safeDivide(revenue, input.trips),
    resultPerTon: safeDivide(result, input.tons),
  }
}

export function calculateVariation(current: NumericInput, historical: NumericInput) {
  const currentValue = toNumber(current)
  const historicalValue = toNumber(historical)
  return {
    difference: currentValue - historicalValue,
    percent: safeDivide((currentValue - historicalValue) * 100, historicalValue),
  }
}

export function calculateBenchmarkAttainment(actual: NumericInput, reference: NumericInput) {
  const attainment = safeDivide(toNumber(actual) * 100, reference)
  return {
    attainmentPercent: attainment,
    belowReferencePercent: attainment == null ? null : Math.max(0, 100 - attainment),
  }
}

export function calculateAvailability(plannedDays: NumericInput, downtimeDays: NumericInput) {
  const planned = toNumber(plannedDays)
  const downtime = Math.max(0, toNumber(downtimeDays))
  return safeDivide(Math.max(0, planned - downtime) * 100, planned)
}

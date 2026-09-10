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

export function calculateDowntimeImpact(dailyRevenue: NumericInput, downtimeDays: NumericInput) {
  const revenue = Math.max(0, toNumber(dailyRevenue))
  const days = Math.max(0, toNumber(downtimeDays))
  return {
    estimatedDailyRevenue: revenue,
    downtimeDays: days,
    estimatedUnrealizedRevenue: revenue * days,
  }
}

export function calculateHistoricalAverage(values: NumericInput[]) {
  const numbers = values.map(toNumber)
  if (numbers.length === 0) return null
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

export function identifyPossibleFactors(input: {
  currentTrips: NumericInput
  historicalTrips: NumericInput
  currentTons: NumericInput
  historicalTons: NumericInput
  currentFuelCost: NumericInput
  historicalFuelCost: NumericInput
  downtimeDays: NumericInput
  maintenanceCost: NumericInput
}) {
  const factors: string[] = []
  const tripsVariation = calculateVariation(input.currentTrips, input.historicalTrips).percent
  const tonsVariation = calculateVariation(input.currentTons, input.historicalTons).percent
  const fuelVariation = calculateVariation(input.currentFuelCost, input.historicalFuelCost).percent
  if (tripsVariation != null && tripsVariation < 0) factors.push(`redução de ${Math.abs(tripsVariation).toFixed(1)}% nas viagens`)
  if (tonsVariation != null && tonsVariation < 0) factors.push(`redução de ${Math.abs(tonsVariation).toFixed(1)}% nas toneladas`)
  if (fuelVariation != null && fuelVariation > 0) factors.push(`aumento de ${fuelVariation.toFixed(1)}% no custo de combustível`)
  if (toNumber(input.downtimeDays) > 0) factors.push(`${toNumber(input.downtimeDays)} dia(s) de indisponibilidade`)
  if (toNumber(input.maintenanceCost) > 0) factors.push(`custo de manutenção de R$ ${toNumber(input.maintenanceCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  return factors
}

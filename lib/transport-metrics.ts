export function safeDivide(numerator: number, denominator: number) { return denominator > 0 ? numerator / denominator : null }
export function calculateKmPerLiter(km: number, liters: number) { return safeDivide(km, liters) }
export function calculateLitersPerTon(liters: number, tons: number) { return safeDivide(liters, tons) }
export function calculateTonsPerTrip(tons: number, trips: number) { return safeDivide(tons, trips) }
export function calculateMargin(revenue: number, costs: number) { return safeDivide(revenue - costs, revenue) }
export function formatMetric(value: number | null, suffix = '') { return value === null || !Number.isFinite(value) ? 'N/A' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${suffix}` }
export function validateOperation(input: { km: number; tons: number; liters: number }) { if (!Number.isFinite(input.km) || input.km < 0) throw new Error('KM deve ser um número maior ou igual a zero.'); if (!Number.isFinite(input.tons) || input.tons < 0) throw new Error('Toneladas deve ser um número maior ou igual a zero.'); if (!Number.isFinite(input.liters) || input.liters < 0) throw new Error('Litros deve ser um número maior ou igual a zero.'); return true }

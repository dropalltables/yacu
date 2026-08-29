export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatCompact(value: number): string {
  if (value < 1_000) return Math.round(value).toLocaleString("en-US")
  const units = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"],
  ] as const
  const [divisor, suffix] = units.find(([divisor]) => value >= divisor) ?? units[2]
  const scaled = value / divisor
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${suffix}`
}

export function formatMetric(value: number, metric: "cost" | "tokens"): string {
  return metric === "cost" ? formatMoney(value) : formatCompact(value)
}

export function formatAxis(value: number, metric: "cost" | "tokens"): string {
  if (metric === "tokens") return formatCompact(value)
  if (value >= 1_000) return `$${formatCompact(value)}`
  return `$${Math.round(value).toLocaleString("en-US")}`
}

export function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function padLeft(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value.padStart(width)
}

export function truncate(value: string, width: number): string {
  if (value.length <= width) return value.padEnd(width)
  if (width <= 1) return value.slice(0, width)
  return `${value.slice(0, width - 1)}…`
}

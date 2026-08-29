import type { Dashboard } from "../../domain/aggregate"
import { formatCompact, formatMoney } from "../format"
import { useTheme } from "../ThemeContext"

export function Totals({ dashboard, compact }: { dashboard: Dashboard; compact: boolean }) {
  const theme = useTheme()
  const values = [
    ["Processed tokens", formatCompact(dashboard.totals.processedTokens)],
    ["Cached input", formatCompact(dashboard.totals.cacheReadTokens)],
    ["Uncached input", formatCompact(dashboard.totals.inputTokens + dashboard.totals.cacheCreationTokens)],
    ["Output", formatCompact(dashboard.totals.outputTokens)],
    ["Cache savings", formatMoney(dashboard.totals.cacheSavingsUsd)],
  ]
  return (
    <box flexDirection="column" width="100%" gap={1}>
      <text fg={theme.text}><strong>Totals</strong></text>
      <box flexDirection={compact ? "column" : "row"} justifyContent="space-between" gap={compact ? 0 : 2}>
        {values.map(([label, value]) => (
          <box key={label} flexDirection={compact ? "row" : "column"} justifyContent="space-between" flexGrow={1}>
            <text fg={theme.muted}>{label}</text>
            <text fg={theme.text}>{value}</text>
          </box>
        ))}
      </box>
    </box>
  )
}

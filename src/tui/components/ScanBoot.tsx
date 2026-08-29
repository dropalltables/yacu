import type { ScanProgress } from "../../data/types"
import { useTheme } from "../ThemeContext"

export function ScanBoot({ log, width }: { log: ScanProgress[]; width: number }) {
  const theme = useTheme()
  const completed = Math.max(0, ...log.map((row) => row.completed))
  const total = log[0]?.total ?? 6
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100)
  const prefix = `Progress: [${String(percent).padStart(3)}%]`
  const barWidth = Math.max(1, width - prefix.length - 3)
  const filled = total === 0 ? barWidth : Math.round((completed / total) * barWidth)

  return (
    <box flexDirection="column" width="100%" flexGrow={1}>
      <text fg={theme.text}>Reading local usage...</text>
      <box flexDirection="column">
        {log.map((row, index) => (
          <text key={`${row.source}:${index}`} fg={theme.text}>
            {scanLine(row)}
          </text>
        ))}
      </box>
      <box flexGrow={1} />
      <text>
        <span fg={theme.onProgress} bg={theme.progress}>{prefix}</span>
        <span fg={theme.text}>{` [${"#".repeat(filled)}${".".repeat(barWidth - filled)}]`}</span>
      </text>
    </box>
  )
}

export function scanLine(row: ScanProgress): string {
  if (row.status === "pending" || row.status === "scanning") return `Scanning ${row.label}...`
  if (row.status === "error") return `Scanning ${row.label}... failed${row.error == null ? "" : `: ${row.error}`}`
  return `Scanning ${row.label}... ${row.files ?? 0} files, ${row.records ?? 0} records, ${row.sessions ?? 0} sessions`
}

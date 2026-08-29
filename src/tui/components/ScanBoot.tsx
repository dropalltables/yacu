import { useTheme } from "../ThemeContext"

export function ScanBoot({
  completed,
  total,
  width,
}: {
  completed: number
  total: number
  width: number
}) {
  const theme = useTheme()
  const progress = total === 0 ? 1 : Math.max(0, Math.min(1, completed / total))
  const barWidth = Math.max(8, Math.min(20, width - 4))
  const filled = Math.round(progress * barWidth)

  return (
    <box
      width="100%"
      flexGrow={1}
      justifyContent="center"
      alignItems="center"
    >
      <box flexDirection="column" alignItems="center" gap={1}>
        <text fg={theme.text}>scanning usage...</text>
        <text fg={theme.text}>{`[${"#".repeat(filled)}${" ".repeat(barWidth - filled)}]`}</text>
      </box>
    </box>
  )
}

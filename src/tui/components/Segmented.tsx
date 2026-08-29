import { useState } from "react"
import type { KeyEvent, MouseEvent } from "@opentui/core"
import { useTheme } from "../ThemeContext"
import { usePointer } from "../usePointer"

type Option<T extends string | number> = { value: T; label: string }

export function Segmented<T extends string | number>({
  options,
  selected,
  onChange,
}: {
  options: Array<Option<T>>
  selected: T
  onChange: (value: T) => void
}) {
  const theme = useTheme()
  const [hovered, setHovered] = useState<T | null>(null)
  const { pointerOver, pointerOut } = usePointer()

  const mousePress = (value: T) => (event: MouseEvent) => {
    if (event.button !== 0) return
    event.stopPropagation()
    onChange(value)
  }

  const keyPress = (value: T) => (key: KeyEvent) => {
    if (key.name === "return" || key.name === "space") onChange(value)
  }

  return (
    <box flexDirection="row" backgroundColor={theme.panel}>
      {options.map((option) => {
        const active = option.value === selected
        const hot = option.value === hovered
        return (
          <box
            key={String(option.value)}
            focusable
            height={1}
            backgroundColor={active ? theme.selected : hot ? theme.hover : theme.panel}
            onMouseDown={mousePress(option.value)}
            onMouseOver={() => {
              setHovered(option.value)
              pointerOver()
            }}
            onMouseOut={() => {
              setHovered(null)
              pointerOut()
            }}
            onKeyDown={keyPress(option.value)}
          >
            <text selectable={false} fg={active ? theme.onSelected : hot ? theme.onHover : theme.muted}>{` ${option.label} `}</text>
          </box>
        )
      })}
    </box>
  )
}

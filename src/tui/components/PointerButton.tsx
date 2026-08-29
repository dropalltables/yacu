import { useState } from "react"
import type { KeyEvent, MouseEvent } from "@opentui/core"
import { useTheme } from "../ThemeContext"
import { usePointer } from "../usePointer"

export function PointerButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme()
  const [hovered, setHovered] = useState(false)
  const { pointerOver, pointerOut } = usePointer()

  const press = (event: MouseEvent) => {
    if (event.button !== 0) return
    event.stopPropagation()
    onPress()
  }

  const keyPress = (key: KeyEvent) => {
    if (key.name === "return" || key.name === "space") onPress()
  }

  return (
    <box
      focusable
      height={1}
      backgroundColor={hovered ? theme.hover : theme.panel}
      onMouseDown={press}
      onMouseOver={() => {
        setHovered(true)
        pointerOver()
      }}
      onMouseOut={() => {
        setHovered(false)
        pointerOut()
      }}
      onKeyDown={keyPress}
    >
      <text selectable={false} fg={hovered ? theme.onHover : theme.muted}>{` ${label} `}</text>
    </box>
  )
}

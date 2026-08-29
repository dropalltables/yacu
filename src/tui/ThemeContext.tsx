import { createContext, useContext, type ReactNode } from "react"
import { terminalTheme, type Theme } from "./theme"

const ThemeContext = createContext<Theme>(terminalTheme("dark"))

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}

export async function forEachJsonLine(
  path: string,
  callback: (value: unknown) => void | Promise<void>,
): Promise<void> {
  const reader = Bun.file(path).stream().getReader()
  const decoder = new TextDecoder()
  let pending = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    pending += decoder.decode(value, { stream: true })
    const lines = pending.split("\n")
    pending = lines.pop() ?? ""
    for (const line of lines) await parseLine(line, callback)
  }

  pending += decoder.decode()
  await parseLine(pending, callback)
}

async function parseLine(
  line: string,
  callback: (value: unknown) => void | Promise<void>,
): Promise<void> {
  if (line.trim() === "") return
  try {
    await callback(JSON.parse(line))
  } catch {
    return
  }
}

export async function globFiles(
  root: string,
  pattern: string,
  options: { includeSymlinks?: boolean } = {},
): Promise<string[]> {
  if (!(await Bun.file(root).exists()) && !(await isDirectory(root))) return []
  const files: string[] = []
  const glob = new Bun.Glob(pattern)
  for await (const file of glob.scan({
    cwd: root,
    absolute: true,
    onlyFiles: options.includeSymlinks !== true,
  })) files.push(file)
  if (options.includeSymlinks === true) {
    const existingFiles = await Promise.all(files.map(async (file) => {
      try {
        return (await stat(file)).isFile() ? file : null
      } catch {
        return null
      }
    }))
    return existingFiles.filter((file): file is string => file != null).sort()
  }
  return files.sort()
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value != null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function stringValue(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null
}
import { stat } from "node:fs/promises"

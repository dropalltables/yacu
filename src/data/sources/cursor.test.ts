import { describe, expect, test } from "bun:test"
import { countContent } from "./cursor"

describe("countContent", () => {
  test("counts text and tool calls from Cursor transcript parts", () => {
    const text = countContent([{ type: "text", text: "hello world" }])
    const tool = countContent([{ type: "tool_use", name: "Read", input: { path: "a.ts" } }])

    expect(text).toBeGreaterThan(0)
    expect(tool).toBeGreaterThan(0)
  })

  test("ignores unknown transcript parts", () => {
    expect(countContent([{ type: "image", data: "ignored" }])).toBe(0)
  })
})

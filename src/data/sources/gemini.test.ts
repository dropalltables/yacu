import { describe, expect, test } from "bun:test"
import { parseGeminiConversation } from "./gemini"

describe("parseGeminiConversation", () => {
  test("parses complete JSON session files", () => {
    const parsed = parseGeminiConversation(JSON.stringify({
      sessionId: "one",
      startTime: "2026-08-28T10:00:00Z",
      messages: [{ id: "m1", type: "gemini", tokens: { input: 10, output: 2, cached: 3, total: 12 } }],
    }))

    expect(parsed?.sessionId).toBe("one")
    expect(parsed?.messages).toHaveLength(1)
  })

  test("applies JSONL rewinds", () => {
    const parsed = parseGeminiConversation([
      JSON.stringify({ sessionId: "two", startTime: "2026-08-28T10:00:00Z" }),
      JSON.stringify({ id: "m1", type: "gemini", tokens: { input: 10 } }),
      JSON.stringify({ id: "m2", type: "gemini", tokens: { input: 20 } }),
      JSON.stringify({ $rewindTo: "m1" }),
      JSON.stringify({ id: "m3", type: "gemini", tokens: { input: 30 } }),
    ].join("\n"))

    expect(parsed?.messages.map((message) => message.id)).toEqual(["m1", "m3"])
  })
})

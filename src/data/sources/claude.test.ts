import { describe, expect, test } from "bun:test"
import { parseClaudeUsageEntry } from "./claude"

describe("parseClaudeUsageEntry", () => {
  test("reads Claude token usage without transcript content", () => {
    expect(parseClaudeUsageEntry({
      timestamp: "2026-08-29T12:00:00.000Z",
      sessionId: "session-1",
      requestId: "request-1",
      message: {
        id: "message-1",
        model: "claude-opus-5",
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: 30,
          cache_read_input_tokens: 40,
        },
      },
    })).toEqual({
      timestamp: "2026-08-29T12:00:00.000Z",
      sessionId: "session-1",
      requestId: "request-1",
      messageId: "message-1",
      model: "claude-opus-5",
      inputTokens: 10,
      outputTokens: 20,
      cacheCreationTokens: 30,
      cacheReadTokens: 40,
    })
  })

  test("rejects rows without required counters or a valid timestamp", () => {
    expect(parseClaudeUsageEntry({ timestamp: "invalid", message: { usage: {} } })).toBeNull()
    expect(parseClaudeUsageEntry({
      timestamp: "2026-08-29T12:00:00.000Z",
      message: { usage: { input_tokens: 1 } },
    })).toBeNull()
  })
})

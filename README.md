# yacu

Local coding-agent usage in an OpenTUI dashboard.

## Run

```sh
bunx @dropalltables/yacu
```

Or install it:

```sh
bun add --global @dropalltables/yacu
yacu
```

`yacu` reads local Claude Code, Codex, Cursor, Gemini CLI, OpenCode, and Grok session stores. It fetches current model pricing from [models.dev](https://models.dev) and does not require an account or API key. Cursor token totals are estimated from local agent transcripts; the other sources use locally recorded usage fields.

## Keys

| Key | Action |
| --- | --- |
| `c` | Cost or tokens |
| `1`–`4` | 24 hours, 7, 30, or 90 days |
| `left` / `right` | Previous or next range |
| `b` | Model or day breakdown |
| `r` | Refresh |
| `q` / `esc` | Quit |

## Mouse

| Action | Result |
| --- | --- |
| Hover graph | Inspect daily usage |
| Click graph | Pin or clear a day |
| Click provider | Show or hide its graph series |
| Click controls | Change metric, range, breakdown, or refresh |
| Scroll | Scroll the dashboard |

## Development

```sh
bun install
bun run start
bun test
bun run typecheck
```

## License

MIT

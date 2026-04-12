# EBC-OS — Claude Code Configuration

## Behavioral Rules

- Do what was asked; nothing more, nothing less
- ALWAYS read a file before editing it
- NEVER create files unless absolutely necessary; prefer editing existing files
- NEVER proactively create `*.md` / README files unless explicitly requested
- NEVER save working files, tests, or scratch markdown to the root folder
- NEVER commit secrets, credentials, or `.env` files

## File Organization

- `/src` source · `/tests` tests · `/docs` docs · `/config` config · `/scripts` scripts · `/examples` examples
- Never write to the repo root

## Project Architecture

- Keep files under 500 lines
- Typed interfaces for public APIs
- Validate input at system boundaries; sanitize file paths

## Build & Test

```bash
npm run build
npm test
npm run lint
```

- Run tests after meaningful code changes
- Verify build before committing

## Security

- No hardcoded API keys, secrets, or credentials in source
- Never commit `.env` files
- Validate user input at boundaries; sanitize paths

## Concurrency

- Batch parallel/independent tool calls in ONE message (reads, edits, bash)
- Batch all todos in ONE `TodoWrite` call

## Swarm / Multi-Agent (only when warranted)

- Spawn a swarm ONLY for tasks with ≥3 genuinely parallel, independent workstreams
- For single-file edits or sequential work, use direct tool calls — swarm overhead exceeds task cost
- When spawning: hierarchical topology, 6–8 agents max, `run_in_background: true`, ALL Task calls in ONE message, then STOP polling

## Notes

- claude-flow MCP and its CLI are available via ToolSearch when needed; full reference: `npx @claude-flow/cli@latest --help`

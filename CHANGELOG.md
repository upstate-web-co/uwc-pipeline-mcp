# Changelog

All notable changes to `@upstate-web/uwc-pipeline-mcp` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-04-18

### Added
- MCP stdio server exposing two tools:
  - `list_skills` — enumerates Agent Skills in the configured directory
  - `get_skill(slug)` — returns the full `SKILL.md` content for a given skill
- `UWC_SKILLS_DIR` env var for pointing the server at any Agent Skills-compliant directory (defaults to `node_modules/@upstate-web/uwc-skills/skills`)
- `bin` entry `uwc-pipeline-mcp` so the server is invokable via `npx`
- Built-in slug validation (rejects path traversal and non-alphanumeric slugs)
- TypeScript 5, Node ≥18, ESM

### Notes
- The server is deliberately content-agnostic. It reads any directory of Agent Skills-compliant `SKILL.md` files; the bundled UWC skill package is one valid input, not a requirement.
- `generate_phase_prompt` and `run_governance_agent` tools from the original roadmap are deferred — they require UWC-specific schema + endpoints that would leak private infrastructure into a public package.

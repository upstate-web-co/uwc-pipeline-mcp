# @upstate-web/uwc-pipeline-mcp

> MCP server that exposes a directory of Claude Agent Skills as callable tools — `list_skills` and `get_skill`. Pairs with [`@upstate-web/uwc-skills`](https://github.com/upstate-web-co/uwc-skills-npm), but works against any Agent Skills-compliant directory.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## What this is

A minimal [Model Context Protocol](https://modelcontextprotocol.io) server that surfaces [Agent Skills](https://docs.anthropic.com/en/docs/agents/skills) over stdio. Point it at a directory of `SKILL.md`-compliant subdirectories and Claude Code (or any MCP-compatible client) can list and fetch them as structured tool calls.

Two tools shipped in v0.1.0:

| Tool | Arguments | Returns |
|---|---|---|
| `list_skills` | none | Slug, version, name, and description for every skill in the configured directory |
| `get_skill` | `slug: string` | Full `SKILL.md` content (frontmatter + body) for the named skill |

The server is deliberately content-agnostic. The bundled [`@upstate-web/uwc-skills`](https://github.com/upstate-web-co/uwc-skills-npm) is one valid skill source; anything that follows Anthropic's Agent Skills spec will work.

## Install

```bash
npm install -g @upstate-web/uwc-pipeline-mcp
```

Or install locally and invoke via `npx`:

```bash
npx @upstate-web/uwc-pipeline-mcp
```

## Configure your skills directory

The server reads skills from the first match:

1. `UWC_SKILLS_DIR` environment variable, if set
2. `./node_modules/@upstate-web/uwc-skills/skills`, if the package is installed in the working directory

If neither exists, `list_skills` returns an empty list with instructions.

```bash
# Point at an arbitrary directory
export UWC_SKILLS_DIR=/path/to/my/skills
npx @upstate-web/uwc-pipeline-mcp
```

## Use with Claude Code

Register as an MCP server:

```bash
claude mcp add uwc-pipeline-mcp -- npx @upstate-web/uwc-pipeline-mcp
```

With a custom skills directory:

```bash
claude mcp add uwc-pipeline-mcp \
  --env UWC_SKILLS_DIR=/path/to/skills \
  -- npx @upstate-web/uwc-pipeline-mcp
```

Then in a Claude Code session, the tools appear as `list_skills` and `get_skill`. A typical flow:

1. Claude calls `list_skills` → sees all available skill slugs + descriptions
2. Based on the current task, Claude calls `get_skill(slug)` to load the full skill content
3. Claude applies the skill's guidance to your code

## Smoke test

Verify the server works from the command line by piping JSON-RPC over stdio:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_skills","arguments":{}}}' | UWC_SKILLS_DIR=/path/to/skills npx @upstate-web/uwc-pipeline-mcp
```

## Scope & non-goals

This package ships a deliberately narrow surface area:

- **Read-only.** No write tools; no mutation of skill content.
- **No network calls.** Reads local filesystem only.
- **No pipeline-specific tools.** `generate_phase_prompt`, `run_governance_agent`, `run_meta_retro_prompt`, `compile_knowledge_bundle` are **not** shipped and **not on the roadmap**. Each requires UWC-specific schema, endpoints, or directory layout that would bind this package to a private stack. They fail our leakage test. Dropped, not deferred.
- **No authentication.** stdio is the only transport; auth is the MCP client's responsibility.

If you need pipeline tooling beyond skill browsing, the source of truth for those patterns is published as skill *content* in [`@upstate-web/uwc-skills`](https://github.com/upstate-web-co/uwc-skills-npm) — load the relevant skill with `get_skill` and apply it yourself.

**New tools enter this server only if they pass the same bar as new skills:** portability (works without UWC infrastructure), leakage-free (no private schema, keys, or endpoints), and usefulness (value to a non-UWC developer). `list_skills` + `get_skill` are both read-only filesystem queries against a configurable directory — the canonical shape we'll stick to.

## Build from source

```bash
git clone https://github.com/upstate-web-co/uwc-pipeline-mcp
cd uwc-pipeline-mcp
npm install
npm run build
node dist/index.js
```

## Related

- **Skill bundle:** [`@upstate-web/uwc-skills`](https://github.com/upstate-web-co/uwc-skills-npm)
- **Agent Skills spec:** [docs.anthropic.com/en/docs/agents/skills](https://docs.anthropic.com/en/docs/agents/skills)
- **MCP spec:** [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **MCP TypeScript SDK:** [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)

## License

MIT. Use freely in commercial work.

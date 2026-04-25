#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, join } from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

type SkillSummary = {
  slug: string;
  name: string;
  description: string;
  version: string;
  path: string;
};

type ParsedFrontmatter = Record<string, string>;

const SKILLS_DIR =
  process.env.UWC_SKILLS_DIR ??
  resolve(process.cwd(), "node_modules/@upstatewebco/uwc-skills/skills");

async function directoryExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

function parseFrontmatter(source: string): ParsedFrontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) return {};
  const body = match[1];
  const out: ParsedFrontmatter = {};
  for (const line of body.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

async function discoverSkills(root: string): Promise<SkillSummary[]> {
  if (!(await directoryExists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const results: SkillSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = join(root, entry.name, "SKILL.md");
    try {
      const source = await readFile(skillPath, "utf8");
      const fm = parseFrontmatter(source);
      results.push({
        slug: entry.name,
        name: fm.name ?? entry.name,
        description: fm.description ?? "",
        version: fm.version ?? "unknown",
        path: skillPath,
      });
    } catch {
      // Directory without a readable SKILL.md — skip silently.
    }
  }
  return results.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function readSkill(root: string, slug: string): Promise<string> {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slug)) {
    throw new Error(
      `Invalid skill slug: "${slug}". Slugs are lowercase alphanumeric with hyphens, underscores, or dots.`,
    );
  }
  const skillPath = join(root, slug, "SKILL.md");
  return readFile(skillPath, "utf8");
}

const server = new Server(
  {
    name: "uwc-pipeline-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_skills",
      description:
        "List every Claude Agent Skill available in the configured skills directory. Returns slug, frontmatter name, description, and version per skill. Use this first to discover what skills you can pull with get_skill.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_skill",
      description:
        "Fetch the full SKILL.md content (frontmatter + body) for a single skill by its slug. Call list_skills first to see valid slugs.",
      inputSchema: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "The skill's directory name (e.g. 'ai-cost-guard').",
          },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "list_skills") {
    const skills = await discoverSkills(SKILLS_DIR);
    if (skills.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No skills found under ${SKILLS_DIR}. Set UWC_SKILLS_DIR to a directory of SKILL.md-compliant subdirectories, or install @upstatewebco/uwc-skills in the working directory.`,
          },
        ],
      };
    }
    const rows = skills
      .map(
        (s) =>
          `- **${s.slug}** (v${s.version}) — ${s.name}\n  ${s.description}`,
      )
      .join("\n");
    return {
      content: [
        {
          type: "text",
          text: `${skills.length} skill(s) found in ${SKILLS_DIR}:\n\n${rows}`,
        },
      ],
    };
  }

  if (name === "get_skill") {
    const slug = typeof args?.slug === "string" ? args.slug : undefined;
    if (!slug) {
      throw new Error("get_skill requires a 'slug' argument (string).");
    }
    try {
      const text = await readSkill(SKILLS_DIR, slug);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to read skill "${slug}" from ${SKILLS_DIR}: ${message}`,
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    `[uwc-pipeline-mcp] Serving skills from ${SKILLS_DIR}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `[uwc-pipeline-mcp] Fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});

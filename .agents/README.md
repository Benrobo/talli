# Bundled agent skills

Skills live with the codebase, not in `~/`. Cloning this repo gives every
contributor (and every AI coding agent on it) the same curated knowledge
without having to install anything globally.

## Layout

```
.agents/
├── skills/             # Universal skills (Claude, Codex, Cursor agents)
└── skills-cursor/      # Cursor-specific skills (rules, hooks, etc.)
```

| Skill | What it covers |
|---|---|
| `frontend-design` | Distinctive, production-grade UI; avoids generic AI aesthetic. |
| `tanstack-router-best-practices` | Type-safe routing, loaders, search params, navigation. |
| `web-perf` | Core Web Vitals audits and Lighthouse-style optimizations. |
| `workers-best-practices` | Cloudflare Workers anti-patterns, observability, secrets. |
| `wrangler` | `wrangler` CLI commands and `wrangler.jsonc` configuration. |
| `agents-sdk` | Cloudflare Agents SDK: state, RPC, WebSockets, scheduling. |
| `cloudflare` | Broad Cloudflare platform reference (Workers, KV, D1, R2, AI, etc.). |
| `durable-objects` | DO design and review: coordination, RPC, SQLite, alarms. |
| `sandbox-sdk` | Sandboxed code execution (interpreters, untrusted code). |
| `find-skills` | Discover and install additional skills. |
| `karpathy-guidelines` | Andrej Karpathy-inspired guardrails for assumptions, simplicity, surgical edits, and verification. |
| `skills-cursor/create-rule` | Author `.cursor/rules/` and `AGENTS.md`. |
| `skills-cursor/create-skill` | Author new agent skills. |
| `skills-cursor/split-to-prs` | Split work into small reviewable PRs. |
| `skills-cursor/babysit` | Keep a PR merge-ready: triage, conflicts, CI. |

## Promoting any of these to your home directory

If you want one of these skills available globally instead of (or in addition
to) the project-local copy, run:

```bash
bun run skills:install
```

The script (in `scripts/install-skills.sh`) symlinks `.agents/skills/<name>`
into `~/.agents/skills/<name>` so updates propagate both ways.

## Adding a new skill to this project

1. Drop a new folder under `.agents/skills/` containing a `SKILL.md`.
2. Update `skills-lock.json` with a source URL and content hash.
3. Reference it from `AGENTS.md` so the agent knows it exists.

See `.agents/skills-cursor/create-skill/` for the full authoring spec.

# VoxWard Kiro harness

Open Voxward itself as the Kiro workspace. All paths in this document are relative to that project root.

| Location | Purpose |
| --- | --- |
| .kiro/steering/ | Nine always-included documents split from the platform AGENTS.md |
| .kiro/skills/mana-orchestrate/ | Project-local Mana Skill, maintenance references and Kiro Spec helpers |
| .kiro/hooks/einzbern.json | Prompt recall and the supported read_file window guard |
| .kiro/harness/ | Local hook entry, pinned Kiro-aware runtime, source provenance and licenses |
| .kiro/references/ | On-demand project navigation and Owner output contract |

This is the Owner-authorized VoxWard installation exception for the stated Kiroween 2026 project-folder requirement. The root AGENTS.md remains in the platform workspace; no Voxward/AGENTS.md or CLAUDE.md is needed for this copy. This installation does not certify contest eligibility.

Use Kiro Default or Spec normally. For a custom agent, include file://.kiro/steering/**/*.md and skill://.kiro/skills/**/SKILL.md in that agent's resources. No custom agent is created or selected by this installation. Restart or reload an existing session after installing the files.

The hook runs with Node.js 24 or newer. Its registry and memory resolution use the current device's existing Einzbern installation and library bindings. Formal memory and credentials are not copied into this project. If a checkout has no matching device binding, memory recall is unavailable until that checkout is explicitly configured; the Steering files remain readable.

The local hook runtime and Skill originate from the INIT-085 candidate recorded in harness/provenance.json. They are not a new general release. The optional kiro-run.mjs needs a matching installed engine exposing execution-kiro-preflight --reserve-output; it is not activated by these hooks. No model is called merely by preparing these files or by the local verification below.

Specs are created for a selected real work item when needed. The helper generates requirements.md, design.md, tasks.md and source.json below a project-relative .kiro/specs/<name>/ directory; installation alone creates no task or formal completion record. Read skills/mana-orchestrate/references/kiro-specs.md relative to this .kiro directory for the workflow.

The project Hook handles UserPromptSubmit and PreToolUse. Prompt recall has a 60-second timeout for the existing shared library; the read guard retains a 30-second timeout. For the documented read_file payload it can reject an unbounded read above the current engine byte limit; unknown tools remain unknown. It does not replace Kiro filesystem permissions, workspace trust or user approval. A global Hook set, if added separately later, can run alongside workspace Hooks; inspect both scopes during maintenance.

Kiro documentation:

- Steering: https://kiro.dev/docs/steering/
- Skills: https://kiro.dev/docs/skills/
- Hooks: https://kiro.dev/docs/hooks/

---
name: mana-orchestrate
description: "The Grail grants wishes; Mana Orchestrate makes the mana flow to the right place at the right moment. It brings Einzbern, project memory, into Claude Code, Codex and DeepSeek Harness: recall before you start, write results back to the work item, record decisions as minutes, keep lessons as cards. Where Einzbern is not installed yet, it is the wizard: install, restore, update, migrate, uninstall, health check. Use for Einzbern-managed coding, work items, knowledge cards, minutes, .ether, Atelier, installation or updates."
---

# Mana Orchestrate

Navigation generated from the INIT-085 candidate for Einzbern 4.4.0, with a VoxWard project overlay. This is a project copy, not a published release.

Execution protocol: tcrn.host-execution-request.v1.

## VoxWard workspace copy

All project-relative paths below use the Voxward root. Read .kiro/references/project-context.md for the actual project navigation. This Skill and the Kiro hooks are stored in the project; formal memory, credentials, device policy and runtime state retain their existing locations and authority.

Resolve the actually installed engine before use. The local kiro-specs.mjs helper uses its existing work/decision read interfaces. The optional kiro-run.mjs helper requires a matching engine with execution-kiro-preflight --reserve-output; inspect commands before using that candidate-only path. Its presence is not proof that the installed engine has that capability.

For tests authorized under the current Kiro integration work, the selected model remains claude-haiku-4.5. Keep actual session/model observations and available usage separate from requested values. This installation performs no provider request. The retained INIT-085 operational example describes a separate historical test; its temporary bridge paths are not VoxWard configuration.

## Navigation

Run `node "<device directory>/engine/einzbern.mjs" <verb> --<flag> <value>`. Root: `~/.einzbern` or `EINZBERN_HOME`; if missing, install first. `commands` / `<verb> --help`: verbs/flags. UTC `--at`; `--workspace <library>` when required. Contracts: engine bundle `specs/` beside `scripts/`, not this Skill.

Local sessions share queued writes without stepping aside, not cross-device exclusion. Remote submission needs serial handoff. No platform-native dot hook, background lifecycle manager or sync service is installed.

| Moment | Verb | What to do |
| --- | --- | --- |
| Starting work | `recall`, `rule-list` | Prompt recall if sufficient, else `recall --view agent --query "<task>"`. Enabled rules only (`specs/work-practices-v1.md`). New, resumed and delegated sessions read their own live work; parent or patrol reads do not substitute. Specs: `references/kiro-specs.md`. Dot blocker/privacy-publication: `specs/dot-rules-v1.md`. |
| Draft by work type | `work-draft` | Types/defects, inherited constraints and source gaps: `specs/work-content-v1.md`. One native content, not a second acceptance copy. |
| Need the full text | `work-show`, `work-content-context`, `minutes-show`, `work-project-context`, `execution-prepare`, `execution-record`, `execution-evidence` | Read full work/minutes. Use each target's `handoff` for native dispatch/gates (`EINZBERN_PROJECT_CONTEXT`). Unresolved targets stop dependent work only; coordination-only work needs no development target. Keep critical clauses (`specs/context-v1.md` segments/digests). For `--execution-request`, `dispatchAdmitted` is true. Pass its selected runner/model/effort exactly, never substitute. Keep stdout, stderr and exit code. Evidence is no reusable permit. `execution-evidence --from-file <json>` remains read-only validation, not authentication. `specs/dispatch-admission-evidence-v1.md`. |
| Native dispatch (Codex, Claude, dot) | `execution-host-prepare`, `execution-host-record`, `execution-host-evidence`, `execution-codex-peer-record`, `execution-codex-peer-evidence` | Authorized tools; normal prompt reports. Existing class fallback authority unless explicitly hard. Parent reads before dispatch, child reads before work. targets=[]: no binding; scope/permission. machine-assemble inputs, never hand-fill JSON; raw returns/reports, actual status/attempt association, `--binding`/`--prior`. Unknown retains responsibility; query unknown before retry. Cancel acknowledgement is not termination. Dot model selection is host-managed. Validity, finality and review differ; authorized saves. `specs/host-fallback-v1.md`. Codex only: independent main/economy peers, no collector. `docs/codex-native-controller.md`. Other hosts keep their workflow. |
| Shared submission | `shared-submit-plan`, `shared-submit-evidence`, `shared-submit-advisory-read`, `shared-submit-advisory-write` | Complete baseline and engine changes; one complete pre-submit refresh and engine reapply; serial handoff; segments before manifest; verify remote bytes and complete destination replay; observe release. Advisory is not a lock; absence/age grants nothing. Query unknown publication before retry. `specs/shared-submit-v1.md`. |
| Configuration backup or restore | `config-backup-plan`, `config-backup-create`, `config-backup-prepare`, `config-backup-commit`, `config-backup-verify`, `config-backup-list`, `config-backup-resume`, `config-backup-retire`, `config-restore-plan`, `config-restore-apply` | Allowlist; approved retention. Remote prepare/readback/commit; same-ID recovery, not authentication. Local create unchanged. `specs/config-backup-v1.md`. |
| Work is done | `work-transition`, `work-annotate` | Actual actor/readback. Pending is not complete. Compare original source, behavior and assertions; structure is not semantic acceptance. Dot/local consumption separately; unavailable remains unverified. `specs/batch-execution-v1.md`. |
| A decision is made | `minutes-record` | As soon as you judge a decision, record D1–Dn; end with `已记 <minutes key> Dn` (`Recorded <minutes key> Dn` in English). Prior: `--supersedes`/`--withdraws`/`--coexists`. |
| A lesson is learned | `knowledge-create`, `knowledge-capture` | Capture at most five new sourced lessons per approved batch; read back. Use stable project IDs and repository-relative evidence paths, not device paths. No progress in AGENTS. |
| Configuration / UI | `settings-catalog`, `variable-list` | AGENTS: principles only. Read scoped config and optional `design.authority`: `specs/configuration-contract-v1.md`. |

Coding tasks: read `specs/coding-style-v1.md`.

## Three steps

1. Install this skill: `npx skills add tpmoonchefryan/mana-orchestrate`.
2. Say "install Einzbern". Traditional hooks or independent dot target: `setup`; approval: install.md.
3. Installation, policy changes, restoration and publication retain their separate approvals. 20-minute patrol and daily 00:00 Asia/Shanghai backup are independent; unapproved policy forbids daily enablement; unknown stays unknown.

## Install-type tasks

Install/restore/update/repair/rollback/migrate/uninstall/doctor: read `references/` (`install.md`, `restore.md`, `update.md`, `migrate.md`, `uninstall.md`, `doctor.md`); dot: install; never load them for any other work.

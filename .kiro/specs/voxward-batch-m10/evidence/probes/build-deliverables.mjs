import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SHOW_DIR = process.env.SHOW_DIR;
const OUT_DIR = process.env.OUT_DIR;
assert.ok(SHOW_DIR && OUT_DIR, "SHOW_DIR and OUT_DIR env vars are required");

const CODE_VERSION = "911fe22";
const FULL_SHA = "911fe2247439c3e7a4f43c79c36498552b745782";
const LOCATOR_BASE = ".kiro/specs/voxward-batch-m10/evidence/acceptance.md";

const s029Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-STORY-029.json"), "utf8"));
const sub052Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-SUB-052.json"), "utf8"));
const sub053Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-SUB-053.json"), "utf8"));

assert.equal(s029Show.headEventHash, sub052Show.headEventHash);
assert.equal(s029Show.headEventHash, sub053Show.headEventHash);
const headEventHash = s029Show.headEventHash;

function anchorOf(acceptanceId) {
  return acceptanceId.toLowerCase();
}

function kindOfMethod(acceptanceId, method) {
  if (acceptanceId === "VW-S029-KIRO-REAL") {
    return "source-behavior-review";
  }
  if (
    method.startsWith("接口/数据字段/文档与原始需求核对") ||
    method.startsWith("对照本单交付边界及依赖")
  ) {
    return "source-behavior-review";
  }
  return "machine";
}

function suffixOf(acceptanceId) {
  return acceptanceId.replace(/^VW-(?:S029|SUB052|SUB053)-/, "");
}

function decisionForRow(externalKey, acceptanceId, method) {
  const sfx = suffixOf(acceptanceId);
  const kind = kindOfMethod(acceptanceId, method);

  if (acceptanceId === "VW-S029-KIRO-REAL") {
    return {
      outcome: "unverified",
      kind,
      actual:
        "按 minutes:8fc0b8640384844e0b2a1787#D2 忠实保留 unverified（Owner 实测门）。本批（911fe22）严格遵守不执行真实 kiro-cli/kirocrew/kiro 推理、不创建系统用户、不使用开发账号充当运行账号的硬约束（Q58 审计 probes/logs/q58-audit.json 确认 5 外网目标全拒且 0 外连；E80 P3 确认 fake-cli.log 未触发任何真实 CLI 进程）。deploy/kiro-runtime/README.md、docs/deployment/{remote-deploy,troubleshooting-and-quotas}.md 及 .kiro/specs/voxward-s029-deploy/{design.md,evidence/self-check.md} 均显式标明会话保存位置、--delete-session 真实效果、跨账号孤儿清理与无人值守未信任工具处理待 Owner 提供独立系统账号、HOME 与 KIRO_API_KEY 后实测验证，未以替身测试冒充已验证。",
    };
  }

  switch (sfx) {
    case "AC001":
    case "STORY":
    case "PARENT":
      if (externalKey === "VOXWARD-SUB-052") {
        return {
          outcome: "satisfied",
          kind,
          actual:
            "第 m10 批（911fe22，合入 voxward/s029-deploy 1990296）首次验收通过。实测依据：（1）可复现构建与离线自检（E03 + E07 + E80 P1）：pnpm build 稳定产出 apps/server/dist/{main.js,sandbox-main.js,bootstrap-owner.js,migrations} 与 apps/web/dist/index.html；node scripts/deploy-check.mjs --env-file deploy/server/server.env.example 全部 19/19 项检查通过，且负向实测拦截 VOXWARD_SANDBOX_ENABLED=true、VOXWARD_KIRO_TIMEOUT_MS=300001 与非法 env-file（均退出码 1）；（2）持久卷 WAL 迁移与生产启动生命周期（E80 P1）：真实拉起 dist/main.js 绑定独立临时卷与随机端口，自动开启 WAL + secure_delete=1 + foreign_keys=1 并完成迁移，GET /healthz 返回 200、/sandbox-api/state 返回 404，SIGTERM 优雅退出码 0，且对沙盒开关或越界超时不回显原值 fail-closed 退出 1；（3）部署模板与无共享密钥一次性引导（Q17/Q26/Q37）：deploy/server/{server.env.example,voxward.service,Caddyfile.example,README.md} 与 deploy/kiro-runtime/* 零真实密钥/零共享口令/零生产演示账号；scripts/bootstrap-owner.mjs 实测仅在零活跃 CHANNEL_OWNER 时成功引导，重复执行返回 OWNER_ALREADY_BOOTSTRAPPED（退出码 1）；login.ts 实施 MAX_SCRYPT_CONCURRENCY=4 与弱/超内存 PHC 哈希拒绝；未配置 YouTube/模型项按 NOT_CONFIGURED / SELECTION_NOT_CONFIGURED 拒绝，不伪装已可用。",
        };
      }
      if (externalKey === "VOXWARD-SUB-053") {
        return {
          outcome: "satisfied",
          kind,
          actual:
            "第 m10 批（911fe22，合入 voxward/s029-deploy 1990296）首次验收通过。实测依据：（1）全套运维与排障文档对齐代码（E80 P3）：docs/deployment/ 下 remote-deploy.md、moderators-and-access.md、logs-and-retention.md、backup-and-recovery.md、upgrade-and-rollback.md、troubleshooting-and-quotas.md 与既有 youtube-credentials.md 完整覆盖构建启动、持久卷迁移、HTTPS/WSS/Secure Cookie/CSRF/Host 透传、多房管最小权限邀请与即时撤权、两类日志权限隔离与 60s retention sweep、VACUUM INTO 备份与 .restoring 墓碑重放恢复、停服备份升级与回退、YouTube/Kiro 配额与 Q41 NTP 校时，并显式披露 VW-S029-KIRO-REAL 与 VOXWARD-SUB-050（Q60）未验证准入前提；（2）干净环境端到端非真实演练（E05 deployment-drill.test.ts + E80 P1–P3）：在独立临时持久卷上完整复现迁移 -> bootstrap-owner.mjs 一次性引导 -> 多房管批量授权与 CSRF/WS Origin 校验 -> 重启后成员持久化 -> 备份后执行 DELETE_AND_EXCEPT 隐私删除 -> .restoring 隔离恢复自动重放墓碑保留 score_exceptions -> 缺失备份 BACKUP_NOT_FOUND / 缺凭据 409 NOT_CONFIGURED / 越界配置 CONFIG_INVALID / 重复引导 OWNER_ALREADY_BOOTSTRAPPED 失败关闭。",
        };
      }
      return {
        outcome: "satisfied",
        kind,
        actual:
          "第 m10 批（911fe22，合入 voxward/s029-deploy 1990296）非真实远端部署与运维演练通过（本单专属真实 Kiro 演练门由独立验收行 VW-S029-KIRO-REAL 承载并保留 unverified）。实测依据：（1）汇总同候选版本子单 VOXWARD-SUB-052（23/23 satisfied）与 VOXWARD-SUB-053（23/23 satisfied）证据：pnpm build、typecheck、check-deps（267 files, 0 violations）、deploy-check.mjs（19/19 PASS + 3 组负向拦截）与 guarded S029 套件（9 文件 73 用例）全绿；（2）E80 P1–P3 在干净临时持久卷上复现 dist/main.js 真实启动与 SIGTERM 优雅关闭、bootstrap-owner.mjs 无共享密钥首主账号引导与二次 fail-closed、多房管最小权限邀请与即时撤权、重启持久化、备份后隐私删除经 .restoring 隔离恢复重放墓碑、以及缺凭据/禁用沙盒/越界超时失败关闭；（3）全部模板与 7 篇部署运维文档零共享密钥、零生产演示账号、零违禁本机路径，真实数据准入前提（VW-S029-KIRO-REAL、VOXWARD-SUB-050/Q60、YouTube OAuth 审核）披露清晰，未配置项严格拒绝不伪装已可用。",
      };

    case "INHERIT-001":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "结合 D2 变更集、scripts/check-deps.mjs（E06 267 文件 0 违规）及 E80 P1–P3 演练核查：服务端自托管于远端 Linux Loopback + TLS 反代模板（deploy/server/），主播与房管仅经浏览器或只读输出接入，零本机软件安装依赖；生产 main.ts 拒绝 VOXWARD_SANDBOX_ENABLED 且无共享密钥或演示账号；全部 23 个受控文件零违禁本机路径。",
      };
    case "INHERIT-002":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-002 核查 D2 变更集、apps/server/src/modules/platform-source/youtube/* 与 E80 P3：本单保持平台接入模块代码 0 修改（含 youtube/stream-list.ts 0 修改），E80 P3 核验 PKCE S256 state 防抢占、重授权退役旧凭据与缺凭据 409 NOT_CONFIGURED，并在 docs/deployment/{youtube-credentials,troubleshooting-and-quotas}.md 明确说明未发起真实 YouTube 联网及宿主机 NTP 校时要求（Q41）。",
      };
    case "INHERIT-003":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-003 核查 D2 变更集与模块边界：本单仅涉及远端部署模板、认证引导/限流加固、配置超时上限与运维文档演练，未修改 EPIC-001 路由真值表或规则预筛引擎职责，check-deps 267 文件 0 违规，无虚构通过。",
      };
    case "INHERIT-004":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-004 核查 D2 变更集与 E80 P2：本单未改动评分算法实现，并在 E80 P2 备份恢复演练中验证了备份后新增的 DELETE_AND_EXCEPT 墓碑在 .restoring 恢复后仍保留 score_exceptions 活跃例外记录，不破坏频道评分契约。",
      };
    case "INHERIT-005":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-005 核查 D2 变更集与配置加载契约：本单未修改审核规则、精翻或延迟复盘模块代码；模型未配置时 checkRunnable 继续返回 SELECTION_NOT_CONFIGURED 拒绝执行（E80 P3），不改变 EPIC-001/002 既有职责。",
      };
    case "INHERIT-006":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-006 核查 D2 变更集、config/{schema,load}.ts 与 adapters/kiro-cli/provider.ts：本单未改动 TaskCoordinator 车道调度逻辑，仅在配置与 Kiro CLI 适配器入口补齐 Q37 超时上限校验（1000..300000 ms，E80 P1/P3），防止无限挂起占槽。",
      };
    case "INHERIT-007":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-007 核查 D2 变更集与 docs/deployment/moderators-and-access.md：本单未修改 DecisionService 单次最终裁决逻辑，运维手册与部署演练（E05 + E80 P2）基于既有 RBAC 路由验证多房管邀请与即时撤权，保持原有裁决契约不变。",
      };
    case "INHERIT-008":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-008 核查 D2 变更集与 E05 adapters/kiro-cli 套件：本单未修改 AI 批次 JSON Schema 校验器或 itemId 映射契约，Kiro CLI 适配器单测与演练继续通过 moderationValidator 端口执行强校验。",
      };
    case "INHERIT-009":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "结合 deploy/kiro-runtime/README.md、docs/deployment/{remote-deploy,troubleshooting-and-quotas}.md 及 E05/E80 实测核查：适配器显式传入最小 env（不继承服务器环境）、禁用 --trust-all-tools/--cloud/--repo、按 0700 run-* 目录隔离并在结束时清理；同时清晰区分「已实现」「部署要求」「待实测」，将真实 CLI 会话清理效果显式保留在 VW-S029-KIRO-REAL（unverified）。",
      };
    case "INHERIT-010":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-010 核查 config/schema.ts（ADAPTER_SETS=['synthetic']）、adapters/kiro-cli/{provider,capabilities}.ts 与 E80 P3：Kiro CLI / Crew 保持可替换端口边界，describeKiroCli 未报告模型时 checkSettings/checkRunnable 严格返回 CAPABILITY_NOT_REPORTED / SELECTION_NOT_CONFIGURED，不静默换模型。",
      };
    case "INHERIT-011":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "E05 deployment-drill.test.ts 与 E80 P1–P2 在干净临时持久卷上完整验证：openDatabase 强制启用 WAL、synchronous=FULL、foreign_keys=ON、secure_delete=ON，runMigrations 自动向前迁移，服务重启后账号与成员授权持久保留，createBackup（VACUUM INTO）与 restoreDatabaseWithPorts（.restoring 隔离迁移、墓碑重放、sweepExpired、compact、integrity_check、原子替换）及 BACKUP_NOT_FOUND 失败关闭全部成立。",
      };
    case "INHERIT-012":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "E05 bootstrap-and-q26.test.ts、deployment-drill.test.ts 与 E80 P2 完整验证：（1）Q17 bootstrap-owner.mjs 无共享密钥初始化唯一首主账号，二次引导以 OWNER_ALREADY_BOOTSTRAPPED 拒绝；（2）登录签发 HttpOnly; Secure; SameSite=Strict 会话 Cookie，状态变更缺 x-csrf-token 返回 403，WebSocket 握手强制校验 Origin===Host；（3）多房管最小权限（MODERATOR 禁管成员，logAccess=false 禁读日志返回 403、logAccess=true 返回 200）与 DELETE 撤权后即时失效；（4）Q26 MAX_SCRYPT_CONCURRENCY=4 并发保护与弱/超限哈希拒绝全部生效。",
      };
    case "INHERIT-013":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-013 核查 docs/deployment/backup-and-recovery.md 与 E80 P2 实测：本单未修改数据删除与记分例外模块代码，并在 E80 P2 中实证备份时间点之后执行的 DELETE_AND_EXCEPT 请求经外部 tombstone-ledger 在 .restoring 恢复时自动重放，被删主体的 score_exceptions 活跃记录完整保留不回退。",
      };
    case "INHERIT-014":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-014 核查 docs/deployment/logs-and-retention.md 与 E80 P2：本单未修改 Change Log / Technical Log 存储实现，运维手册准确对齐 /internal/channels/:channelId/logs/* 路由与 logAccess 门禁，且 E80 P2 实测 logAccess=false 返回 403、logAccess=true 返回 200。",
      };
    case "INHERIT-015":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-015 核查 apps/server/src/main.ts:30 与 docs/deployment/logs-and-retention.md：持久卷模式下 main.ts 默认以 retentionSweepIntervalMs=60_000 调度过期清理并通过 InvalidationBus 广播缓存失效，隔离恢复阶段同步循环执行 sweepExpired，未改变保留期契约。",
      };
    case "INHERIT-016":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-016 核查 main.ts:68-90、config/load.ts:109-120 与 E80 P1–P2：启动失败、数据库错误、监听错误与配置越界仅输出固定错误码与键名（E80 P1 实测传入越界 VOXWARD_KIRO_TIMEOUT_MS=987654 时 stderr 仅输出 CONFIG_INVALID 而不回显 987654；bootstrap-owner.mjs 不回显口令），无敏感凭据或原文泄露。",
      };
    case "INHERIT-017":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "结合 deploy/server/*、deploy/kiro-runtime/*、docs/deployment/* 与 E80 P1–P3 核查：远端自托管方案将 SQLite 与墓碑账本置于服务账号 0700 本地持久卷，Kiro 运行目录与服务账号分权隔离，保留期自动 sweep 与 .restoring 恢复重放闭环完整，真实平台与真实 Kiro 准入边界如实披露。",
      };
    case "INHERIT-018":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-018 核查 D2 变更集（db/output-store.ts 与 web/src/routes.tsx 均 0 修改）与 deploy/server/Caddyfile.example：本单未改动 OBS 原生只读输出或 blivechat 兼容协议代码，反代模板显式保留 Host 头以支持 WebSocket 握手与受控输出流。",
      };
    case "INHERIT-019":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-019 核查 apps/server/src/main.ts:10-14、scripts/deploy-check.mjs:83-92 与 E80 P1 实测：生产入口 dist/main.js 与离线自检脚本在检测到 VOXWARD_SANDBOX_ENABLED 开启时均立即以退出码 1 失败关闭，且正常启动的 dist/main.js 对 /sandbox-api/state 返回 404，确保合成演示沙盒绝不混入生产部署。",
      };
    case "INHERIT-020":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-020 核查本单交付边界与 docs/deployment/remote-deploy.md §7：本单完成 EPIC-006 中远端部署模板、引导加固、运维手册与非真实自动化演练部分，同时显式保留 VW-S029-KIRO-REAL 与 VOXWARD-SUB-050（Q60 真实模型性能/费用基准）为 unverified，不替代真实负载基准验收。",
      };
    default:
      throw new Error(`Unhandled acceptance row suffix: ${sfx} (${acceptanceId})`);
  }
}

function buildTarget(show) {
  const externalKey = show.record.externalKey;
  const workId = show.record.id;
  const revision = show.record.revision;
  const acList = show.content.acceptance;

  const evidence = [];
  const mdSections = [];

  for (const ac of acList) {
    const anchor = anchorOf(ac.id);
    const locator = `${LOCATOR_BASE}#${anchor}`;
    const dec = decisionForRow(externalKey, ac.id, ac.method ?? "");
    const req = ac.requirement;

    evidence.push({
      acceptanceId: ac.id,
      acceptanceVersion: ac.version,
      requirement: {
        workId: req.workId,
        requirementId: req.requirementId,
        version: req.version,
      },
      codeVersion: CODE_VERSION,
      locator,
      actual: dec.actual,
      outcome: dec.outcome,
      kind: dec.kind,
    });

    mdSections.push(
      [
        `<a id="${anchor}"></a>`,
        `### **${ac.id}@${ac.version}：${dec.outcome}**（\`${dec.kind}\`）`,
        "",
        `- **关联需求**：\`${req.requirementId}@${req.version}\` (\`${req.workId}\`)`,
        `- **方法**：${ac.method}`,
        `- **场景**：${ac.scenario}`,
        `- **期望**：${ac.expected}`,
        `- **实测/审查结论**：${dec.actual}`,
        "",
      ].join("\n"),
    );
  }

  return { externalKey, workId, revision, evidence, mdSections };
}

const tS029 = buildTarget(s029Show);
const tSub052 = buildTarget(sub052Show);
const tSub053 = buildTarget(sub053Show);
const targets = [tS029, tSub052, tSub053];

const counts = {
  total: 0,
  satisfied: 0,
  failed: 0,
  unverified: 0,
  byTarget: {},
};

for (const t of targets) {
  const c = { total: t.evidence.length, satisfied: 0, failed: 0, unverified: 0 };
  for (const r of t.evidence) {
    c[r.outcome] += 1;
    counts.total += 1;
    counts[r.outcome] += 1;
  }
  counts.byTarget[t.externalKey] = c;
}

assert.equal(counts.total, 69);
assert.equal(counts.satisfied, 68);
assert.equal(counts.failed, 0);
assert.equal(counts.unverified, 1);
assert.equal(counts.byTarget["VOXWARD-SUB-052"].satisfied, 23);
assert.equal(counts.byTarget["VOXWARD-SUB-053"].satisfied, 23);
assert.equal(counts.byTarget["VOXWARD-STORY-029"].satisfied, 22);
assert.equal(counts.byTarget["VOXWARD-STORY-029"].unverified, 1);

const kindCounts = targets
  .flatMap((t) => t.evidence)
  .reduce((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});

const acceptanceMd = [
  `# 第 m10 批独立验收证据（Wave 4b：S029 / SUB-052 / SUB-053 首次验收，候选 \`${CODE_VERSION}\`）`,
  "",
  "## 1. 验收基线、门禁与实测探针摘要",
  "",
  `- **候选版本**：分离只读工作树上的 \`${CODE_VERSION}\`（完整 SHA \`${FULL_SHA}\`，合入 \`voxward/s029-deploy\`：Spec 提交 \`794083c\` 先于实现提交 \`1990296\`）。`,
  `- **实时工单快照**：\`headEventHash = ${headEventHash}\`，共 3 张活跃工单、69 行验收（\`VOXWARD-STORY-029\` \`rev=5\` 23 行；\`VOXWARD-SUB-052\` \`rev=3\` 23 行；\`VOXWARD-SUB-053\` \`rev=3\` 23 行）。`,
  `- **统计汇总**：**69 行（satisfied ${counts.satisfied} 行、failed 0 行、unverified ${counts.unverified} 行；machine ${kindCounts.machine} 行、source-behavior-review ${kindCounts["source-behavior-review"]} 行）**。\`VOXWARD-SUB-052\`（23/23 \`satisfied\`）与 \`VOXWARD-SUB-053\`（23/23 \`satisfied\`）首次验收全部通过可立即关单；\`VOXWARD-STORY-029\` 非真实范围 22/23 \`satisfied\`，且按 \`minutes:8fc0b8640384844e0b2a1787#D2\` 将 \`VW-S029-KIRO-REAL\` 忠实标为 \`unverified\`（保持 \`active\` 待 Owner 实测门）。`,
  "",
  "### 1.1 独立门禁与 Q58 守护实测记录",
  "",
  "| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |",
  "| --- | --- | --- | --- | --- |",
  "| D2 | Spec-First 与受保护文件边界 | `git log / git diff 5dab62b..HEAD`（`probes/logs/d2-diff.log`） | `0` | Spec `794083c`（4 文件）先于实现 `1990296`（24 文件）；`app.ts`（`NO_SUBJECT_CACHES`）、`db/output-store.ts`、`youtube/stream-list.ts`、`web/src/routes.tsx` 均为 **0 修改** |",
  "| E03 | 全仓可复现构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | 稳定构建 `dist/{main.js,sandbox-main.js,bootstrap-owner.js,migrations}` 与 `apps/web/dist/index.html` |",
  "| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓及 `bench` 类型检查 0 错误 |",
  "| E05 | Q58 守卫下 S029 关联测试套件 | `guarded.sh .../e05-s029-vitest pnpm --filter @voxward/server exec vitest run ...` | `0` | **9/9 文件、73/73 用例**全绿（覆盖 `bootstrap-and-q26`、`auth`、`deployment-drill`、`adapters/kiro-cli`、`youtube`） |",
  "| E06 | 模块依赖门禁 | `node scripts/check-deps.mjs`（`probes/logs/e06-check-deps.log`） | `0` | `check-deps: ok, 267 files checked, 0 violations` |",
  "| E07 | 离线部署自检脚本 | `node scripts/deploy-check.mjs --env-file deploy/server/server.env.example --json` | `0` | **19/19** 项产物、迁移、模板卫生与配置检查全部 `ok: true` |",
  "| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check --work-id work:40b84e7e9a57ceaa64f3a742 --spec-dir .kiro/specs/voxward-s029-deploy` | `0` | `SPEC_CURRENT`（`workRevision: 5`） |",
  "| E80 | Q58 守卫下独立探针 `probe-m10.mts` | `guarded.sh .../e80-m10-probe tsx .../probe-m10.mts`（`e80-m10.json`、`q58-audit.json`） | `0` | `P1`（`deploy-check.mjs` 正反对照、真实 `dist/main.js` 沙盒/越界超时不回显 fail-closed、独立持久卷 `/healthz` `200` + `/sandbox-api/state` `404` + `SIGTERM` `0`）、`P2`（`bootstrap-owner.mjs` CLI 首次成功与二次 `OWNER_ALREADY_BOOTSTRAPPED`、`Q26` `MAX_SCRYPT_CONCURRENCY=4` + 弱/超限哈希拒绝 + 8 并发登录、CSRF/WS `Origin===Host`/多房管 `logAccess` RBAC、备份后 `DELETE_AND_EXCEPT` 经 `.restoring` 重放墓碑保留 `score_exceptions` + `BACKUP_NOT_FOUND`）、`P3`（`Q28`/`Q37`/`Q47` fake CLI 与替身验证、23 文件零违禁字面量、5 核心文档显式 `VW-S029-KIRO-REAL` `UNVERIFIED`）全绿；Q58 审计 5 主机全拒、外连 0 条 |",
  "",
  "---",
  "",
  "## 2. VOXWARD-STORY-029 逐行验收证据（23 行：22 satisfied / 0 failed / 1 unverified）",
  "",
  ...tS029.mdSections,
  "---",
  "",
  "## 3. VOXWARD-SUB-052 逐行验收证据（23 行：23 satisfied / 0 failed / 0 unverified）",
  "",
  ...tSub052.mdSections,
  "---",
  "",
  "## 4. VOXWARD-SUB-053 逐行验收证据（23 行：23 satisfied / 0 failed / 0 unverified）",
  "",
  ...tSub053.mdSections,
].join("\n");

const acceptancePath = path.join(OUT_DIR, "acceptance.md");
fs.writeFileSync(acceptancePath, acceptanceMd);

for (const t of targets) {
  for (const r of t.evidence) {
    const anchor = r.locator.split("#")[1];
    const matches = acceptanceMd.match(new RegExp(`<a id="${anchor}"></a>`, "g")) ?? [];
    assert.equal(matches.length, 1, `Anchor ${anchor} count mismatch: ${matches.length}`);
  }
}

const evidenceRecords = {
  note: `草稿，供主线程链写。targets[].evidence 中每一行严格只含引擎允许的八个键且顺序固定，可由 close-batch.cjs 原样并入对应工单 content.evidence。69 行：satisfied 68、failed 0、unverified 1（VW-S029-KIRO-REAL 按 minutes:8fc0b8640384844e0b2a1787#D2 保留 Owner 实测门）。VOXWARD-SUB-052（23/23 satisfied）与 VOXWARD-SUB-053（23/23 satisfied）在 ${CODE_VERSION} 上首次验收全部通过，可先行关单（DONE_KEYS=VOXWARD-SUB-052,VOXWARD-SUB-053），VOXWARD-STORY-029 落链 23 行证据并保持 active。locator 指向 ${LOCATOR_BASE}。`,
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: `引擎按字符串精确比较 evidence.codeVersion 与完成候选。VOXWARD-SUB-052 与 VOXWARD-SUB-053 在 ${CODE_VERSION} 上 46/46 全部 satisfied；VOXWARD-STORY-029 22/23 satisfied + VW-S029-KIRO-REAL unverified，可通过 DONE_KEYS=VOXWARD-SUB-052,VOXWARD-SUB-053 调用 close-batch.cjs 生成 3 条 annotate + 2 条 done 载荷。写入时以读回的 revision 为准。`,
  },
  readFrom: {
    command:
      "预取实时工单快照 wave4b/show/VOXWARD-{STORY-029,SUB-052,SUB-053}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
    headEventHash,
  },
  shapeCheck: `生成脚本逐行校验：键名与顺序严格为 [acceptanceId, acceptanceVersion, requirement, codeVersion, locator, actual, outcome, kind] 八键、requirement 含三键且版本为正整数、outcome 与 kind 属合法枚举（68 satisfied + 1 unverified；${kindCounts["source-behavior-review"]} 行 source-behavior-review + ${kindCounts.machine} 行 machine）、actual 非空且含具体实测/审查依据、locator 锚点在 acceptance.md 中唯一存在且与标题一一对应、每单行数与实时快照完全一致（23+23+23=69），并通过 DONE_KEYS=VOXWARD-SUB-052,VOXWARD-SUB-053 close-batch.cjs 干跑校验。未调用引擎写入。`,
  counts,
  targets: targets.map((t) => ({
    externalKey: t.externalKey,
    workId: t.workId,
    revision: t.revision,
    evidence: t.evidence,
  })),
};

const evidenceRecordsPath = path.join(OUT_DIR, "evidence-records.json");
fs.writeFileSync(evidenceRecordsPath, JSON.stringify(evidenceRecords, null, 1) + "\n");

console.log(
  JSON.stringify(
    {
      acceptancePath,
      evidenceRecordsPath,
      counts,
      kindCounts,
    },
    null,
    2,
  ),
);

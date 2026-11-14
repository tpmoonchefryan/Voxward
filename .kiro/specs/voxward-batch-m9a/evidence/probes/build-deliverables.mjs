import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SHOW_DIR = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave3b/show";
const OUT_DIR = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave3b/m9a-accept-out";
const CODE_VERSION = "6a6af8a";
const FULL_SHA = "6a6af8aa83c004e64b94e1d8777c3b9575d4e8e0";
const LOCATOR_BASE = ".kiro/specs/voxward-batch-m9a/evidence/acceptance.md";

const CARD_KEYS = [
  "VOXWARD-STORY-020",
  "VOXWARD-SUB-037",
  "VOXWARD-SUB-038",
  "VOXWARD-STORY-025",
  "VOXWARD-SUB-046",
  "VOXWARD-SUB-047",
];

const shows = Object.fromEntries(
  CARD_KEYS.map((k) => [k, JSON.parse(fs.readFileSync(path.join(SHOW_DIR, `${k}.json`), "utf8"))]),
);

const headEventHash = shows["VOXWARD-STORY-020"].headEventHash;
for (const k of CARD_KEYS) {
  assert.equal(shows[k].headEventHash, headEventHash);
}

function kindOfMethod(method) {
  if (
    method.startsWith("接口/数据字段/文档与原始需求核对") ||
    method.startsWith("对照本单交付边界及依赖")
  ) {
    return "source-behavior-review";
  }
  return "machine";
}

function s020Decision(externalKey, acceptanceId, method) {
  const sfx = acceptanceId.replace(/^VW-(?:S020|SUB037|SUB038)-/, "");
  const kind = kindOfMethod(method);

  switch (sfx) {
    case "AC001":
    case "STORY":
    case "PARENT":
    case "INHERIT-009":
    case "INHERIT-011":
    case "INHERIT-016":
    case "INHERIT-017":
      return {
        outcome: "satisfied",
        kind,
        actual:
          `第 m9a 批（${CODE_VERSION}）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。`,
      };
    case "INHERIT-001":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 apps/server/src/{app.ts,main.ts,db/retention-store.ts,db/backup-store.ts,db/restore-support.ts,modules/data-lifecycle-service/restore-replay.ts} 并结合 E06 check-deps（264 文件 0 违规）：db 分区仅通过注入回调/端口与业务模块协作，未反向依赖 modules/*，保持远端自托管单后端 + SQLite WAL 与版本化契约。",
      };
    case "INHERIT-012":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 apps/server/src/{app.ts,main.ts} 与 test/app/s020-tombstone-wiring.test.ts：S020 未暴露绕过鉴权的公开删除/恢复 HTTP 端点，数据删除继续走既有 DATA_ADMIN 会话 + CSRF 门禁，日志详情读取继续强制校验频道成员权限，且 ViewerCache 在到期清理后即刻失效（E80 P1 404）。",
      };
    case "INHERIT-013":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-013 核查 app.ts、data-lifecycle-service/{cleanup-executor.ts,restore-replay.ts} 及 E05/E80 P2：tombstones.jsonl 在删除前闭锁写入（不可写返回 409 TOMBSTONE_UNAVAILABLE 且 0 误删），恢复阶段完整重放 S019 清理顺序、重立 DELETE_AND_EXCEPT 标记并推进 processing_generation，未改变 S019 数据面板职责。",
      };
    case "INHERIT-014":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-014 核查 db/retention-store.ts、db/restore-support.ts 与 E05/E80 P2：到期清理不误删 score_exceptions 最小偏好标记；旧备份隔离恢复对 DELETE_AND_EXCEPT 墓碑自动恢复生效例外标记（除非后续存在 RESUME 墓碑），保持频道独立例外偏好契约。",
      };
    case "INHERIT-015":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-015 核查 db/tombstone-ledger.ts、db/retention-store.ts 与 self-check.md：外部 tombstones.jsonl 仅存紧凑不透明请求/主体 ID 与时间戳（不含昵称、原文、密钥或会话），分层保留严格作用于 technical_log_evidence -> technical_logs -> change_logs，未引入第三类业务日志。",
      };
    case "INHERIT-019":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-019 核查 D2 变更集与 E80 P1/P2：S020 零改动前端页面职责，通过共享 InvalidationBus 保证日志查看器在缩短保留期清理后立即返回 404，且全部测试与演练均使用合成数据与临时目录，不含生产凭据或真实观众档案。",
      };
    default:
      throw new Error(`Unhandled S020 suffix on ${externalKey}: ${sfx}`);
  }
}

function s025Decision(externalKey, acceptanceId, method) {
  const sfx = acceptanceId.replace(/^VW-(?:S025|SUB046|SUB047)-/, "");
  const kind = kindOfMethod(method);

  if (externalKey === "VOXWARD-SUB-046") {
    switch (sfx) {
      case "AC001":
      case "STORY":
      case "PARENT":
      case "INHERIT-012":
      case "INHERIT-019":
        return {
          outcome: "satisfied",
          kind,
          actual:
            `第 m9a 批（${CODE_VERSION}）首次验收通过（本单所承担的合成事件生成器、预设场景与确定性重置全部实测成立）：E05（sandbox-scenarios.test.ts 3/3 全绿）与 E80 P3 实测验证 apps/server/src/demo/{synthetic-source.ts,scenarios/index.ts,reset.ts} 完整覆盖 normal-scoring（+1 加分与账本）、spam-toxicity-block（规则拦截与 -5 扣分）、superchat-translation（明文 TRANSLATION 证据同时兼容 db/output-store.ts 与 db/channel-panel-read.ts）、manual-review（待审入队、候选词生成与人工裁决）、privacy-delete / privacy-delete-and-except（显式绑定 SubjectCacheHub 与 CandidateStore 同步清空缓存/词卡，例外后新消息进 PENDING_REVIEW 且人工放行后 currentScore 仍保持 0）及一键确定性 reset()；默认未开启 sandbox 的 buildApp 对 /sandbox-api/* 一律返回 404，合成库中 auth_accounts/auth_sessions/channel_members 均为 0 行。注：VOXWARD-STORY-025 整单的独立启动脚本与演示角色路由/页面隔离缺口（B15、B16）归兄弟子单 VOXWARD-SUB-047 返工闭环。`,
        };
      case "INHERIT-001":
        return {
          outcome: "satisfied",
          kind,
          actual:
            "审查 scripts/check-deps.mjs 与 apps/server/src/demo/{synthetic-source.ts,scenarios/index.ts,reset.ts}：E06 check-deps 扫描 264 文件 0 违规，E09 负向对照验证 db/module/web 反向导入 demo 分区被检出 3 处违规并以退出码 1 拒绝；packages/contracts 零改动，保持模块化单体与版本化契约。",
        };
      case "INHERIT-006":
        return {
          outcome: "satisfied",
          kind,
          actual:
            "对照 VW-R-006 核查 demo/scenarios/index.ts：合成场景通过既有 ModerationChecker、DecisionService 与 ScoringEngine 端口驱动确定性演示，未改动 EPIC-002 TaskCoordinator 微批/车道调度或并发限流实现。",
        };
      case "INHERIT-009":
        return {
          outcome: "satisfied",
          kind,
          actual:
            "审查 demo/synthetic-source.ts、demo/scenarios/index.ts 并结合 Q58 守护审计（probes/logs/q58-audit.json：guardLoaded=true、5 外部主机全拒、shim.log 0 行）：合成流仅使用虚构观众键与预置示例文本，providerRef='synthetic'，零真实 Kiro CLI 调用、零完整会话/提示副本留存。",
        };
      case "INHERIT-010":
        return {
          outcome: "satisfied",
          kind,
          actual:
            "对照 VW-R-010 核查 demo/scenarios/index.ts 与 design.md：沙盒固定使用合成演示规则与预置译文（modelRef='synthetic-demo'），未改动 Kiro CLI/Crew 推理适配器或模型设置契约，也未宣称真实模型性能结论。",
        };
      case "INHERIT-011":
        return {
          outcome: "satisfied",
          kind,
          actual:
            "审查 demo/{scenarios/index.ts,reset.ts}：全部状态变更与确定性重置均经 runShortTransaction、AuditLogPort、ScoringLedgerPort、DecisionService 与 DataLifecycle 端口写入本地沙盒 SQLite，未让浏览器或 AI 直写数据库，正文仅存于 technical_log_evidence。",
        };
      case "INHERIT-017":
        return {
          outcome: "satisfied",
          kind,
          actual:
            "审查 demo/{scenarios/index.ts,reset.ts} 并结合 E05/E80 P3：沙盒显式注入含 sandbox-subject-cache 与 sandbox-candidate-cards 的 SubjectCacheHub，执行 DELETE / DELETE_AND_EXCEPT 与 reset() 时同步递增 processing_generation 并清空关联缓存与候选词卡，不留清理遗漏副本。",
        };
      case "INHERIT-018":
        return {
          outcome: "satisfied",
          kind,
          actual:
            "对照 VW-R-018 核查 demo/scenarios/index.ts:542-575 与 E80 P3：未修改 db/output-store.ts 或原生/blivechat 输出协议代码；approvedStage 仅筛选 verdicts.downstream === 'ALLOW' 的获准条目并以明文写入 TRANSLATION 证据，使 createApprovedContentPort.readApproved 直接返回纯净译文字符串。",
        };
      default:
        throw new Error(`Unhandled SUB-046 suffix: ${sfx}`);
    }
  }

  // VOXWARD-STORY-025 and VOXWARD-SUB-047
  switch (sfx) {
    case "AC001":
    case "STORY":
    case "PARENT":
    case "INHERIT-012":
    case "INHERIT-019":
      return {
        outcome: "failed",
        kind,
        actual:
          `第 m9a 批（${CODE_VERSION}）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。`,
      };
    case "INHERIT-001":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 scripts/check-deps.mjs、apps/server/src/{app.ts,demo/*} 与 apps/web/src/pages/sandbox/*：E06 check-deps 扫描 264 文件 0 违规，E09 负向对照检出跨区反向导入 3 违规并以退出码 1 拒绝；app.ts 保持 NO_SUBJECT_CACHES 默认值不变、db/output-store.ts 与 apps/web/src/routes.tsx 零改动。",
      };
    case "INHERIT-006":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-006 核查 apps/server/src/demo/* 与 app.ts：沙盒通过 opt-in 插件独立挂载，未改动 EPIC-002 TaskCoordinator 并发限流、微批调度或车道优先级逻辑。",
      };
    case "INHERIT-009":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 deploy/sandbox/*、apps/server/src/demo/* 并结合 Q58 守护审计（probes/logs/q58-audit.json：guardLoaded=true、5 外部主机全拒、shim.log 0 行）：沙盒全链路仅处理合成文本与临时编号，零真实 YouTube/Kiro 调用、零完整会话或工具轨迹持久化副本。",
      };
    case "INHERIT-010":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-010 核查 deploy/sandbox/sandbox.config.json（adapters='synthetic'）与 demo/*：未修改 Kiro CLI/Crew 推理适配器或模型选择实现，README 与配置明确声明使用合成适配器、不连接外部模型服务。",
      };
    case "INHERIT-011":
      return {
        outcome: "failed",
        kind,
        actual:
          `第 m9a 批（${CODE_VERSION}）部署说明与运行入口核查未通过（阻断 B15）。虽然沙盒数据写入本身经后端短事务落本地沙盒 SQLite，但 deploy/sandbox/README.md:20-25 与 sandbox.env.example 声明通过设置 VOXWARD_SANDBOX_ENABLED=true 并执行 node deploy/sandbox/start-sandbox.mjs 启动隔离沙盒服务以在浏览器打开 /sandbox 演示，而实测（E80 P4）start-sandbox.mjs 仅打印一段 JSON 说明后立即退出、未打开沙盒 SQLite 或监听端口，且 main.ts 与 vite.config.ts 均未接线 /sandbox-api，部署说明与实际可执行行为不一致。`,
      };
    case "INHERIT-017":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 demo/{scenarios/index.ts,reset.ts,sandbox-guard.ts}：沙盒数据库路径经 isSandboxDatabasePath 强制与生产库隔离，删除与重置均经短事务及 SubjectCacheHub 清理，不触碰也不污染生产 SQLite、WAL 或墓碑账本。",
      };
    case "INHERIT-018":
      return {
        outcome: "failed",
        kind,
        actual:
          `第 m9a 批（${CODE_VERSION}）舞台/下游只读边界审查未通过（阻断 B16）。VW-R-018 规定舞台/下游输出仅含获准必要展示字段，拦截项不得暴露违规原文或审核内容；虽然未改动既有 OBS/原生输出适配器，但沙盒 routes.ts:94-102 对仅具 stage.read 权限的演示舞台角色 DEMO_STAGE_VIEWER 原样返回含 blockedItems[].originalText、reviewQueue[].originalText 及日志的完整快照，且 SandboxPage.tsx:119-138,162-172 在 DEMO_STAGE_VIEWER 视图下无条件直接渲染待审队列与未折叠的被拦截毒性消息原文（E80 P4 实测 HTML 含「Click free crypto spam-link-xyz toxic-abuse now!」）。`,
      };
    default:
      throw new Error(`Unhandled S025 suffix on ${externalKey}: ${sfx}`);
  }
}

function anchorOf(acceptanceId) {
  return acceptanceId.toLowerCase();
}

function buildTarget(externalKey) {
  const showJson = shows[externalKey];
  const workId = showJson.record.id;
  const revision = showJson.record.revision;
  const acList = showJson.content.acceptance;
  const isS020 = externalKey === "VOXWARD-STORY-020" || externalKey === "VOXWARD-SUB-037" || externalKey === "VOXWARD-SUB-038";

  const evidence = [];
  const mdSections = [];

  for (const ac of acList) {
    const anchor = anchorOf(ac.id);
    const dec = isS020 ? s020Decision(externalKey, ac.id, ac.method) : s025Decision(externalKey, ac.id, ac.method);
    const req = ac.requirement;
    assert.ok(req && typeof req.workId === "string" && typeof req.requirementId === "string" && Number.isInteger(req.version) && req.version >= 1);

    const row = {
      acceptanceId: ac.id,
      acceptanceVersion: ac.version,
      requirement: {
        workId: req.workId,
        requirementId: req.requirementId,
        version: req.version,
      },
      codeVersion: CODE_VERSION,
      locator: `${LOCATOR_BASE}#${anchor}`,
      actual: dec.actual,
      outcome: dec.outcome,
      kind: dec.kind,
    };

    assert.deepEqual(Object.keys(row), [
      "acceptanceId",
      "acceptanceVersion",
      "requirement",
      "codeVersion",
      "locator",
      "actual",
      "outcome",
      "kind",
    ]);

    evidence.push(row);

    mdSections.push(
      [
        `<a id="${anchor}"></a>`,
        `### ${ac.id} — \`${dec.outcome}\` (\`${dec.kind}\`)`,
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

const targets = CARD_KEYS.map(buildTarget);

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

assert.equal(counts.total, 73);
assert.equal(counts.satisfied, 60);
assert.equal(counts.failed, 13);
assert.equal(counts.unverified, 0);

const kindCounts = targets
  .flatMap((t) => t.evidence)
  .reduce((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});

const acceptanceMd = [
  `# 第 m9a 批独立验收证据（Wave 3b：S020 返工一复验 + S025 首次验收，候选 \`${CODE_VERSION}\`）`,
  "",
  "## 1. 验收基线、门禁与实测探针摘要",
  "",
  `- **候选版本**：分离只读工作树上的 \`${CODE_VERSION}\`（完整 SHA \`${FULL_SHA}\`，在 \`9196c53\`/\`df376eb\` 之上依次合入 \`119daac\` \`voxward/s020-fix1\`［Spec \`32bcf5d\` -> 实现 \`119daac\`］与 \`b9038f3\` \`voxward/s025-sandbox\`［Spec \`bb0487f\` -> 实现 \`b9038f3\`］）。`,
  `- **实时工单快照**：\`headEventHash = ${headEventHash}\`，共 6 张活跃工单、73 行验收（S020 返工一复验 38 行：\`VOXWARD-STORY-020\` \`rev=5\` 12 行、\`VOXWARD-SUB-037\` \`rev=4\` 13 行、\`VOXWARD-SUB-038\` \`rev=4\` 13 行；S025 首次验收 35 行：\`VOXWARD-STORY-025\` \`rev=4\` 11 行、\`VOXWARD-SUB-046\` \`rev=3\` 12 行、\`VOXWARD-SUB-047\` \`rev=3\` 12 行）。`,
  `- **统计汇总**：**73 行（satisfied ${counts.satisfied} 行、failed ${counts.failed} 行、unverified 0 行；machine ${kindCounts.machine} 行、source-behavior-review ${kindCounts["source-behavior-review"]} 行）**。`,
  `  - **通过并可立即关单（4 单，50/50 satisfied）**：\`VOXWARD-SUB-037\`（13/13）、\`VOXWARD-SUB-038\`（13/13）、\`VOXWARD-STORY-020\`（12/12）、\`VOXWARD-SUB-046\`（12/12）。`,
  `  - **因阻断 \`B15\`、\`B16\` 打回（2 单，10/23 satisfied、13 failed）**：\`VOXWARD-STORY-025\`（5/11 satisfied、6 failed）、\`VOXWARD-SUB-047\`（5/12 satisfied、7 failed）。`,
  "",
  "### 1.1 独立门禁与 Q58 守护实测记录",
  "",
  "| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |",
  "| --- | --- | --- | --- | --- |",
  "| D2 | Spec 先行与变更边界核查 | `git log --stat df376eb..119daac` & `df376eb..b9038f3`（`probes/logs/d2-diff.log`） | `0` | S020 `32bcf5d -> 119daac`、S025 `bb0487f -> b9038f3` 均严格 Spec 先行；`NO_SUBJECT_CACHES` 默认分支、`db/output-store.ts` 与 `apps/web/src/routes.tsx` 均保持未改 |",
  "| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`、`web` 构建全绿 |",
  "| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓与 `bench` 类型检查 0 错误 |",
  "| E05 | Q58 守卫下 S020+S025 定向单测 + 基线全量单测 | `guarded.sh .../e05-s020-s025-vitest`（配合同 SHA 全量 `pnpm test` 170/170 文件 1969/1969 用例与 `smoke.sh`） | `0` | 定向 6 文件 **35/35 用例**全绿；同 SHA 全量基线 **170/170 文件、1969/1969 用例**全绿；`smoke.sh` dev/dist 双 200 且 `:3000/:5173` 0 监听 |",
  "| E06 / E09 | 模块依赖门禁与 `demo` 分区负向对照 | `node scripts/check-deps.mjs` + 临时目录 `db`/`module`/`web` 反向导入 `demo` 对照（`e06-check-deps.log`、`e09-check-deps-neg.log`） | `0` / `1` | 正式树 `264 files checked, 0 violations`；负向对照检出 `3 violation(s)` 并以退出码 `1` 拒绝 |",
  "| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check`（`.kiro/specs/voxward-s020-retention-backup`、`voxward-s025-sandbox`） | `0` | 两份 Spec 均返回 `SPEC_CURRENT`（S020 `workRevision: 5`，S025 `workRevision: 4`） |",
  "| E80 | Q58 守卫下独立全链路探针 `probe-m9a.mts` | `CI=1 bash guarded.sh .../e80-m9a tsx .../probe-m9a.mts`（`e80-m9a.json`、`q58-audit.json`） | `0` | `P1`（B12 缩短保留期缓存即刻驱逐返 404 + N15c 定时清理）、`P2`（B13 恢复推进 `processing_generation=1` + 隔离阶段清理超期与 `VACUUM` 页擦除 + Q30 `secure_delete=1`）、`P3`（SUB-046 全场景、SC 明文译文、例外后人工放行 0 分与生产路由隔离）、`P4`（复现 B15 `start-sandbox.mjs` 即刻退出无监听及 B16 演示房管越权隐私删除 + 舞台角色泄露拦截原文）全部完成；Q58 审计 `guardLoaded=true`、5 外部主机全拒、`shim.log` 0 行 |",
  "",
  "---",
  "",
  ...targets.flatMap((t, idx) => [
    `## ${idx + 2}. ${t.externalKey} 逐行验收证据（${t.evidence.length} 行：${counts.byTarget[t.externalKey].satisfied} satisfied / ${counts.byTarget[t.externalKey].failed} failed）`,
    "",
    ...t.mdSections,
    ...(idx < targets.length - 1 ? ["---", ""] : []),
  ]),
].join("\n");

assert.equal(/file:\/\/\//.test(acceptanceMd), false, "acceptance.md must not contain file:/// paths");

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
  note: `草稿，供主线程链写。targets[].evidence 中每一行严格只含引擎允许的八个键且顺序固定，可由 close-batch.cjs 原样并入对应工单 content.evidence（STORY-020、SUB-037、SUB-038 原有 fcad360 证据自动保留，新增本轮 ${CODE_VERSION} 通过证据）。73 行：satisfied ${counts.satisfied}、failed ${counts.failed}、unverified 0。VOXWARD-SUB-037（13/13 satisfied）、VOXWARD-SUB-038（13/13 satisfied）、VOXWARD-STORY-020（12/12 satisfied）与 VOXWARD-SUB-046（12/12 satisfied）均全部满足，可传 DONE_KEYS=VOXWARD-SUB-037,VOXWARD-SUB-038,VOXWARD-STORY-020,VOXWARD-SUB-046 先行关单；VOXWARD-STORY-025（5/11 satisfied、6 failed）与 VOXWARD-SUB-047（5/12 satisfied、7 failed）因阻断 B15、B16 打回，仅链写证据留痕、不关单。locator 指向 ${LOCATOR_BASE}。`,
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: `引擎按字符串精确比较 evidence.codeVersion 与完成候选。VOXWARD-SUB-037、VOXWARD-SUB-038、VOXWARD-STORY-020 与 VOXWARD-SUB-046 在 ${CODE_VERSION} 上全部行均为 satisfied，可立即以 ${CODE_VERSION} 关单；VOXWARD-STORY-025 与 VOXWARD-SUB-047 含 failed 行，须在 S025 返工一后的新候选上窄范围复验。写入时以读回的 revision 为准。`,
  },
  readFrom: {
    command:
      "预取实时工单快照 wave3b/show/VOXWARD-{STORY-020,SUB-037,SUB-038,STORY-025,SUB-046,SUB-047}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
    headEventHash,
  },
  shapeCheck: `生成脚本逐行校验：键名与顺序严格为 [acceptanceId, acceptanceVersion, requirement, codeVersion, locator, actual, outcome, kind] 八键、requirement 含三键且版本为正整数、outcome 与 kind 属合法枚举、kind 按 method 前缀规则确定（${kindCounts["source-behavior-review"]} 行 source-behavior-review + ${kindCounts.machine} 行 machine）、actual 非空且含具体实测/审查依据、locator 锚点在 acceptance.md 中唯一存在且与标题一一对应、每单行数与实时快照完全一致（12+13+13+11+12+12=73），并通过 close-batch.cjs 干跑校验。未调用引擎写入。`,
  counts,
  targets: targets.map((t) => ({
    externalKey: t.externalKey,
    workId: t.workId,
    revision: t.revision,
    evidence: t.evidence,
  })),
};

const evidenceRecordsStr = JSON.stringify(evidenceRecords, null, 1) + "\n";
assert.equal(/file:\/\/\//.test(evidenceRecordsStr), false, "evidence-records.json must not contain file:/// paths");
const evidenceRecordsPath = path.join(OUT_DIR, "evidence-records.json");
fs.writeFileSync(evidenceRecordsPath, evidenceRecordsStr);

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

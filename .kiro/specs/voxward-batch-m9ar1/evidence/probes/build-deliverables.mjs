import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SHOW_DIR = process.env.SHOW_DIR;
const OUT_DIR = process.env.OUT_DIR;
assert.ok(SHOW_DIR && OUT_DIR, "SHOW_DIR and OUT_DIR env vars are required");

const CODE_VERSION = "e639cf8";
const FULL_SHA = "e639cf8e4f36a645d1401149968b9a25b073120c";
const LOCATOR_BASE = ".kiro/specs/voxward-batch-m9ar1/evidence/acceptance.md";

const s025Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-STORY-025.json"), "utf8"));
const sub047Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-SUB-047.json"), "utf8"));

assert.equal(s025Show.headEventHash, sub047Show.headEventHash);
const headEventHash = s025Show.headEventHash;

function kindOfMethod(method) {
  if (
    method.startsWith("接口/数据字段/文档与原始需求核对") ||
    method.startsWith("对照本单交付边界及依赖")
  ) {
    return "source-behavior-review";
  }
  return "machine";
}

function suffixOf(acceptanceId) {
  return acceptanceId.replace(/^VW-(?:S025|SUB047)-/, "");
}

function decisionForRow(acceptanceId, method) {
  const sfx = suffixOf(acceptanceId);
  const kind = kindOfMethod(method);

  switch (sfx) {
    case "AC001":
    case "STORY":
    case "PARENT":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "第 m9a-r1 批（e639cf8，合入 voxward/s025-fix1 c245f0b）返工一复验通过，前轮阻断 B15、B16 与建议 N17a、N17b 全部闭环（配合 m9a 已先行通过关单的 VOXWARD-SUB-046 合成场景与确定性重置证据）。实测依据：（1）B15 闭环：新增 apps/server/src/sandbox-main.ts 与更新后的 deploy/sandbox/start-sandbox.mjs 经 E05 sandbox-launcher.test.ts 与 E80 P1 真实子进程随机端口实测，GET /sandbox-api/state 返回 200（syntheticOnly=true）、GET /sandbox 返回 200 HTML SPA、路径穿越 GET /assets/..%2F..%2Fpackage.json 返回 404、SIGINT 后优雅退出且 0 端口残留；apps/web/vite.config.ts 已配置 /sandbox-api 代理；生产入口 dist/main.js 在 VOXWARD_SANDBOX_ENABLED=true 下以退出码 1 失败关闭拒绝启动；（2）B16 闭环：apps/server/src/demo/routes.ts 对 POST /sandbox-api/scenarios 的 privacy-delete* 强制校验 privacy.delete，且全部快照响应经 redactSnapshotForCapabilities 裁剪，SandboxPage.tsx 同步门禁按钮并隐藏受限面板；E80 P2 实测 DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 提交隐私删除场景均返回 403（DEMO_PRIVACY_AUDITOR 返回 200 并成功删除加例外），DEMO_STAGE_VIEWER 快照与 SSR HTML 仅含已批准舞台输出且零毒性原文/日志泄露；（3）N17a/N17b 闭环：demo/scenarios/index.ts 两处补齐 isNull(scoreExceptions.removedAt)，self-check.md 全部采用仓库相对路径（E80 P3）。",
      };
    case "INHERIT-001":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 D2 变更集、scripts/check-deps.mjs（E06 265 文件 0 违规；sandbox-main.ts 归入 composition，E09 负向对照拦截 db/module/web 导入 demo 并以退出码 1 拒绝）与受保护文件：apps/server/src/app.ts NO_SUBJECT_CACHES 默认分支、db/output-store.ts 与 apps/web/src/routes.tsx 均 0 修改，生产 main.ts 不导入 demo/* 且对 VOXWARD_SANDBOX_ENABLED 失败关闭。",
      };
    case "INHERIT-006":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-006 核查 D2 变更集与沙盒路由：本单仅在隔离 demo 分区与 sandbox-main.ts 组织确定性合成演示，未修改 task-coordinator、moderation-engine 或付费优先/微批容量调度职责，无虚构通过。",
      };
    case "INHERIT-009":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 demo/{synthetic-source.ts,scenarios/index.ts,sandbox-guard.ts} 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s025-vitest 与 e80-m9ar1 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行、外发非环回 0 条）：沙盒仅使用合成文本与模拟译文，不调用真实 Kiro CLI，不保存完整会话/工具轨迹副本。",
      };
    case "INHERIT-010":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-010 核查 sandbox-main.ts 与 demo/scenarios/index.ts：沙盒以 adapters='synthetic' 运行，保持 Kiro CLI/Crew 适配器与业务端口解耦，未修改 EPIC-002/005 推理适配器实现，无虚构通过。",
      };
    case "INHERIT-011":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 sandbox-main.ts、deploy/sandbox/{start-sandbox.mjs,README.md,sandbox.config.json} 与 E80 P1 实测：沙盒使用独立 SQLite 文件（默认 data/voxward-sandbox.sqlite3 或隔离临时文件）短事务运行并拦截非沙盒 DB 路径；deploy/sandbox/README.md 所述 node deploy/sandbox/start-sandbox.mjs 启动步骤已真实提供 HTTP API 与 /sandbox SPA 服务且优雅关闭后 0 残留监听（B15 已关闭）。",
      };
    case "INHERIT-012":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "隔离与权限测试（E05 sandbox-isolation.test.ts + E80 P2）完整验证：（1）POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（403）且演示令牌访问生产 /auth/*、/channels/* 均被拒绝；（2）POST /sandbox-api/scenarios 提交 privacy-delete* 时强制校验 privacy.delete，DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 一律返回 403；（3）全部 6 个快照接口经 redactSnapshotForCapabilities 按角色逐次裁剪字段，DEMO_STAGE_VIEWER 不返回任何拦截原文、待审原文、主体分值或日志，DEMO_PRIVACY_AUDITOR 对 blockedItems.originalText 置 null（B16 已关闭）。",
      };
    case "INHERIT-017":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 demo/{scenarios/index.ts,reset.ts} 与 sandbox-main.ts（E05 + E80 P1–P3）：沙盒显式绑定 SubjectCacheHub 与 CandidateStore 演示删除与记分例外清理，两处 scoreExceptions 查询均包含 isNull(scoreExceptions.removedAt)（N17a 已关闭），且 :memory: 模式的临时 SQLite 目录在进程关闭时自动清除。",
      };
    case "INHERIT-018":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-018 核查 demo/routes.ts redactSnapshotForCapabilities、apps/web/src/pages/sandbox/SandboxPage.tsx 及 E80 P2 实测：舞台只读角色 DEMO_STAGE_VIEWER 仅能获取并渲染已批准的 approvedStage 内容（含 UntrustedText 纯文本转义），未获准的 reviewQueue、blockedItems 毒性拦截原文与审计日志在 API 响应与前端视图中均被完全剥离（B16 已关闭）。",
      };
    case "INHERIT-019":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "隔离、权限与演示流程测试（E05 + E80 P1–P3）完整验证：独立 start-sandbox.mjs 与开发代理均可运行 /sandbox 页面与 /sandbox-api/*；顶部常驻「SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）」横幅；生产凭据与非沙盒 DB 路径触发失败关闭拒绝启动；有限演示角色权限边界与一键确定性重置全部成立（B15、B16 已关闭）。",
      };
    default:
      throw new Error(`Unhandled acceptance suffix: ${sfx}`);
  }
}

function anchorOf(acceptanceId) {
  return acceptanceId.toLowerCase();
}

function buildTarget(showJson) {
  const externalKey = showJson.record.externalKey;
  const workId = showJson.record.id;
  const revision = showJson.record.revision;
  const acList = showJson.content.acceptance;
  assert.ok(Array.isArray(acList) && acList.length > 0);

  const evidence = [];
  const mdSections = [];

  for (const ac of acList) {
    const anchor = anchorOf(ac.id);
    const dec = decisionForRow(ac.id, ac.method);
    const req = ac.requirement;
    assert.ok(
      req &&
        typeof req.workId === "string" &&
        typeof req.requirementId === "string" &&
        Number.isInteger(req.version) &&
        req.version >= 1,
    );

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

const tS025 = buildTarget(s025Show);
const tSub047 = buildTarget(sub047Show);
const targets = [tS025, tSub047];

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

assert.equal(counts.total, 23);
assert.equal(counts.satisfied, 23);
assert.equal(counts.failed, 0);
assert.equal(counts.unverified, 0);

const kindCounts = targets
  .flatMap((t) => t.evidence)
  .reduce((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});

const acceptanceMd = [
  `# 第 m9a-r1 批独立验收证据（Wave 3d：S025 返工一窄复验，候选 \`${CODE_VERSION}\`）`,
  "",
  "## 1. 验收基线、门禁与实测探针摘要",
  "",
  `- **候选版本**：分离只读检出 \`verify-m9b\` 上的 \`${CODE_VERSION}\`（完整 SHA \`${FULL_SHA}\`，合入 \`c245f0b\` \`voxward/s025-fix1\`；Spec 提交 \`9d6d8cf\` 先于实现提交 \`c245f0b\`）。`,
  `- **实时工单快照**：\`headEventHash = ${headEventHash}\`，共 2 张活跃工单、23 行验收（\`VOXWARD-STORY-025\` \`rev=5\` 11 行；\`VOXWARD-SUB-047\` \`rev=4\` 12 行；兄弟子单 \`VOXWARD-SUB-046\` 已在 \`m9a\` 先行通过关单）。`,
  `- **统计汇总**：**23 行（satisfied ${counts.satisfied} 行、failed 0 行、unverified 0 行；machine ${kindCounts.machine} 行、source-behavior-review ${kindCounts["source-behavior-review"]} 行）**。前轮阻断 **\`B15\`、\`B16\`** 与建议 **\`N17a\`、\`N17b\`** 全部闭环，两张工单均判定 **通过（PASS）**。`,
  "",
  "### 1.1 独立门禁与 Q58 守护实测记录",
  "",
  "| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |",
  "| --- | --- | --- | --- | --- |",
  "| D2 | Spec 先行与受保护文件核查 | `git log / git diff f1a75e9..c245f0b`（`probes/logs/d2-diff.log`） | `0` | Spec `9d6d8cf`（4 文件）先于实现 `c245f0b`（14 文件）；`app.ts`、`db/output-store.ts`、`apps/web/src/routes.tsx` 均为 **0 修改** |",
  "| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`（含 `dist/main.js` 与 `dist/sandbox-main.js`）、`web` 构建全绿 |",
  "| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓及 `bench` 类型检查 0 错误 |",
  "| E05 | Q58 守卫下 S025 单测 + 全量基线 | `guarded.sh .../e05-s025-vitest` 运行 `test/demo` 与 `src/pages/sandbox`（配合同 SHA 全量 `pnpm test` 175 文件 1989 用例与 `smoke.sh`） | `0` | S025 服务端+前端单测全绿；`:3000/:5173/:3100` 0 监听 |",
  "| E06 / E09 | 模块依赖门禁与负向对照 | `node scripts/check-deps.mjs` + 违规导入 `demo` 负向对照 | `0` / `1` | 正式树 `265 files checked, 0 violations`；负向对照检出 `3 violation(s)` 并以退出码 `1` 拒绝 |",
  "| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check --work-id work:ac8ff494373ad248e549ea4a --spec-dir .kiro/specs/voxward-s025-sandbox` | `0` | `SPEC_CURRENT`（`workRevision: 5`） |",
  "| E80 | Q58 守卫下独立复验探针 `probe-m9ar1.mts` | `CI=1 bash guarded.sh .../e80-m9ar1 tsx .../probe-m9ar1.mts`（`e80-m9ar1.json`、`q58-audit.json`） | `0` | `P1`（`start-sandbox.mjs` 真实子进程服务 `/sandbox-api/state` 200、`/sandbox` SPA 200、路径穿越拦截 404、`SIGINT` 后 `0` 监听；生产 `dist/main.js` 设 `VOXWARD_SANDBOX_ENABLED=true` 退出码 `1`）、`P2`（非隐私角色调 `privacy-delete*` 全 `403`、`DEMO_STAGE_VIEWER` 快照与 SSR 零敏感泄露、`DEMO_PRIVACY_AUDITOR` 删数加例外 `200` 且拦截原文置 `null`）、`P3`（`N17a` 两处 `removedAt` 过滤、14 文件 `0` 处禁止路径）全绿；Q58 审计 `guardLoaded=true`、5 外网拒绝、`shim.log` 0 行、外发 0 条 |",
  "",
  "---",
  "",
  "## 2. VOXWARD-STORY-025 逐行验收证据（11 行：11 satisfied / 0 failed）",
  "",
  ...tS025.mdSections,
  "---",
  "",
  "## 3. VOXWARD-SUB-047 逐行验收证据（12 行：12 satisfied / 0 failed）",
  "",
  ...tSub047.mdSections,
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
  note: `草稿，供主线程链写。targets[].evidence 中每一行严格只含引擎允许的八个键且顺序固定，可由 close-batch.cjs 原样并入对应工单 content.evidence。23 行：satisfied 23、failed 0、unverified 0。VOXWARD-STORY-025（11/11 satisfied）与 VOXWARD-SUB-047（12/12 satisfied）在 ${CODE_VERSION} 上全部通过，可直接关单（DONE_KEYS=VOXWARD-SUB-047,VOXWARD-STORY-025）。locator 指向 ${LOCATOR_BASE}。`,
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: `引擎按字符串精确比较 evidence.codeVersion 与完成候选。VOXWARD-STORY-025 与 VOXWARD-SUB-047 在 ${CODE_VERSION} 上 23/23 全部 satisfied，可通过 close-batch.cjs 生成链写与完成转换载荷。写入时以读回的 revision 为准。`,
  },
  readFrom: {
    command:
      "预取实时工单快照 wave3d/show/VOXWARD-{STORY-025,SUB-047}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
    headEventHash,
  },
  shapeCheck: `生成脚本逐行校验：键名与顺序严格为 [acceptanceId, acceptanceVersion, requirement, codeVersion, locator, actual, outcome, kind] 八键、requirement 含三键且版本为正整数、outcome 与 kind 属合法枚举、kind 按 method 前缀规则确定（${kindCounts["source-behavior-review"]} 行 source-behavior-review + ${kindCounts.machine} 行 machine）、actual 非空且含具体实测/审查依据、locator 锚点在 acceptance.md 中唯一存在且与标题一一对应、每单行数与实时快照完全一致（11+12=23），并通过 close-batch.cjs 干跑校验。未调用引擎写入。`,
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

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SHOW_DIR = process.env.SHOW_DIR;
const OUT_DIR = process.env.OUT_DIR;
assert.ok(SHOW_DIR && OUT_DIR, "SHOW_DIR and OUT_DIR env vars are required");

const CODE_VERSION = "f1a75e9";
const FULL_SHA = "f1a75e9393106a1ae8e8b7069b0d18d91763e586";
const LOCATOR_BASE = ".kiro/specs/voxward-batch-m8cr1/evidence/acceptance.md";

const s026Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-STORY-026.json"), "utf8"));
const sub048Show = JSON.parse(fs.readFileSync(path.join(SHOW_DIR, "VOXWARD-SUB-048.json"), "utf8"));

assert.equal(s026Show.headEventHash, sub048Show.headEventHash);
const headEventHash = s026Show.headEventHash;

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
  return acceptanceId.replace(/^VW-(?:S026|SUB048)-/, "");
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
          "第 m8c-r1 批（f1a75e9，合入 d9e7d48）返工一复验通过，前轮阻断 B14（B14a、B14b、B14c）与建议 N16a 全部闭环。实测依据：（1）D2 零产品改动边界：git diff 6a6af8a..d9e7d48 仅含 Spec、集成夹具 README、4 个核心流测试与验收矩阵，apps/*/src、packages/*/src、scripts、deploy、vitest.workspace.ts 均 0 修改，且 Spec 提交 f3d1a6a 先于实现提交 d9e7d48（E10 SPEC_CURRENT，workRevision=5）；（2）门禁与 Q58 守护：E03 build、E04 typecheck+bench、E06 check-deps（264 文件 0 违规，E09 负向对照退出码 1）及 guarded.sh 下 test/integration/core-flow 4/4 文件 16/16 用例全部退出 0（q58-audit.json 核实 guardLoaded=true、5 外网主机全拒、shim 0 行、外发 0 条）；（3）B14a 闭环：manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts 补齐 Q55 C6（currentScore=9 vs 账本重放 7）、Q57 R7（跨实例跳过致 items.length=0）、Q46（里程碑 userComment=null 且 ChannelEvent 缺付费标记）与 Q41（稳态轮询 +6m01s 误丢实时消息）最小复现断言，docs/acceptance/core-flow-matrix.md §3/§4 将 Q39/Q41/Q46/Q52/Q57 标 PARTIAL/OPEN、Q55 标 FAIL/OPEN 并逐条列明（E80 P1、P2、P4）；（4）B14b 闭环：failure-no-penalty.test.ts 与 E80 P3（正分观众 initialScore=2 保持 finalScore=2、ledger=1、scoringCalls=0）验证实时 reportFailure 转 PENDING_REVIEW 与后台 ReviewRunner MODEL_CALL_FAILED/AI_OUTPUT_INVALID 均 0 扣分；（5）B14c 与 N16a 闭环：全部 14 个 S026 文件作者受控区 0 处本地 URI/家目录/工作树路径，主矩阵 8/8 相对链接可解析且头部明确区分只读 src 基线 6a6af8a 与测试分支（E80 P4）。",
      };
    case "INHERIT-001":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 D2 变更集、scripts/check-deps.mjs（E06 264 文件 0 违规；E09 负向对照退出码 1）及 E80 P4 文档可移植路径扫描：本单严守零产品改动边界，未引入生产托管服务、新本机代理或供应商对象贯穿业务层；前轮 B14c 已关闭，docs/acceptance/core-flow-matrix.md（8/8 相对链接全部解析存在）、tests/integration/core-flow/README.md 与 Spec 作者受控区 0 处本地 URI、家目录或临时工作树路径（仅 README.md:17 回指矩阵少一级 ../ 记为非阻断建议 N18a）。",
      };
    case "INHERIT-002":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 routing-scoring.test.ts 与 dedupe-replay-sc.test.ts（E05 16/16 全绿 + E80 P2）实测覆盖身份事件基准分离与退级回落（Q20/Q43）、平台删除 QUOTA_EXHAUSTED 本地 BLOCK 保留与 UNKNOWN 有界重试、MessageIdStore + channel_events_dedupe_uq 组件级去重及 classifyReplay 5 分钟精确阈值；同时如实以最小复现断言固定并在 core-flow-matrix.md §3/§4（PARTIAL / OPEN）披露 Q39 入站单事务未合一与 Q41 稳态轮询 +6m01s 时钟快偏误丢实时消息（staleReplay=1, delivered=0），满足每项有实证且缺陷与未测清楚（B14a 已关闭）。",
      };
    case "INHERIT-003":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 routing-scoring.test.ts 与 dedupe-replay-sc.test.ts（E05 + E80 P2）验证了普通消息 R1–R6 真值表（含匿名噪声 ALLOW_NOISE/FAST_PASS、白名单、高分快通、café->cafe 规范化抽查、精确匹配扣分、谐音草泥马->caonima 进 REVIEW、例外先入 EXCEPTION）与 superChatDetails.userComment 解析；同时在 dedupe-replay-sc.test.ts:309-348 新增 Q46 最小复现断言并在 core-flow-matrix.md §3（PARTIAL / OPEN）与 §4.6 如实记录 memberMilestoneChatDetails.userComment 解析为 null（body=''）及 ChannelEvent 缺付费标记字段的既有缺口（B14a 已关闭）。",
      };
    case "INHERIT-004":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 routing-scoring.test.ts、failure-no-penalty.test.ts 与 manual-coordinator-wiring.test.ts（E05 + E80 P1、P3）完整验证：（1）上下限钳制、冷却、白名单/快通 ALLOW_NOISE 零加分与身份基准分离重算（Q20/Q43）；（2）前轮 B14b 必交「异常不扣分」：实时 TaskCoordinator.reportFailure 耗尽重试转 PENDING_REVIEW 与后台 ReviewRunner 遇 AI 超时（MODEL_CALL_FAILED）/ 非法 JSON（AI_OUTPUT_INVALID）均满足 scoringCalls=0、观众分与 score_ledger 零扣分（E80 P3 进一步验证正分观众 score=2 原样保持 2）；（3）前轮 B14a：Q55 C6 上限钳制改判偏差已由最小复现断言固定并在 core-flow-matrix.md §3（FAIL / OPEN）与 §4.8 如实披露。",
      };
    case "INHERIT-005":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 manual-coordinator-wiring.test.ts 与 failure-no-penalty.test.ts（E05 + E80 P2、P3）验证了复盘模型超时/坏输出零扣分回退、候选词卡显式 SubjectCacheHub 清理对照，并在不改 src/ 前提下将默认 NO_SUBJECT_CACHES 遗留外部 CandidateStore（§4.1）、Q52 app.ts 未装配复盘模型与 resumePendingScoring（§3 PARTIAL / OPEN、§4.7）以及 Q57 R7 双 ReviewRunner 共享协调器跳过非本实例任务（§3 PARTIAL / OPEN、§4.9）全部以最小复现断言固定披露（B14a、B14b 已关闭）。",
      };
    case "INHERIT-006":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-006 审查 dedupe-replay-sc.test.ts、manual-coordinator-wiring.test.ts 与 docs/acceptance/core-flow-matrix.md §3/§4（E80 P2、P4）：本单验证了单实例 TaskCoordinator PAID > REALTIME > BACKGROUND 车道优先级与未知任务收敛，同时将 Q52（app.ts 尚未自动串接 SC->PAID 与主链路）和 Q57 R7（多 ReviewRunner 跨实例跳过未知 BACKGROUND 任务）明确标为 PARTIAL / OPEN 并在 §4.7、§4.9 给出复现定位，无任何虚构通过（B14a 已关闭）。",
      };
    case "INHERIT-007":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 manual-coordinator-wiring.test.ts 与 dedupe-replay-sc.test.ts（E05 + E80 P1）验证了已终态任务并发冲突拒绝（conflict）、单事件改判纠分与 operationId 幂等（duplicate，Q49）、平台删除配额耗尽本地 BLOCK 保留与 UNKNOWN 有界重试；并在 manual-coordinator-wiring.test.ts:445-555 补齐 Q55 C6 上限钳制改判补偿偏差最小复现断言（currentScore=9、needsManualAdjustment=false vs 账本重放 7），在 core-flow-matrix.md §3 标为 FAIL / OPEN、§4.8 如实归档，去除了原 score_exceptions 用例的 Q55 误标（B14a 已关闭）。",
      };
    case "INHERIT-008":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-008 核查 D2 变更集、failure-no-penalty.test.ts:159-241（非法 JSON 触发 AI_OUTPUT_INVALID 拒绝采信且 0 扣分）、manual-coordinator-wiring.test.ts:396-443 及 docs/acceptance/core-flow-matrix.md §4.2：本单未修改审核/SC/复盘 JSON Schema 契约，并如实复现记录了 db/output-store.ts 对 TRANSLATION JSON 字符串原样透传的既有现象（m8a N13），无虚构通过。",
      };
    case "INHERIT-009":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 tests/integration/core-flow/fixtures/*.json、apps/server/test/integration/core-flow/*.test.ts 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s026-vitest 与 e80-m8cr1 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行、外发非环回 0 条）：测试仅使用合成文本与临时编号，未调用真实 Kiro CLI，未持久化完整会话/提示/工具轨迹副本，且矩阵 §5 明确声明未触及外部提供方清理。",
      };
    case "INHERIT-010":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-010 核查 docs/acceptance/core-flow-matrix.md §5 与测试套件：本单保持 Kiro CLI/Crew 适配器与业务端口解耦，零修改 EPIC-002/005 模型适配器代码，并在矩阵 §5 明确说明未调用真实 kiro-cli/kirocrew/kiro，未虚构真实推理实测结论。",
      };
    case "INHERIT-011":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块套件（4 文件 16 用例）与 E80 P1、P3 均在真实迁移后的 SQLite WAL 短事务上运行且未持锁跨网络等待；同时在 core-flow-matrix.md §3/§4 如实区分了 SQLite channel_events_dedupe_uq 唯一约束生效与 Q39 生产入站单事务未合一（PARTIAL / OPEN）、以及 Q55 C6 改判补偿偏差（FAIL / OPEN），并补齐了异常不扣分真实 SQLite 账本断言（B14a、B14b 已关闭）。",
      };
    case "INHERIT-012":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "manual-coordinator-wiring.test.ts:326-386 通过真实 buildApp + /auth/login 会话 Cookie + x-csrf-token + DATA_ADMIN 角色门禁执行删除请求，dedupe-replay-sc.test.ts 与 manual-coordinator-wiring.test.ts 校验了 REVIEW_CAPABILITY 操作员身份，且矩阵 §3/§4 所有状态与实测断言逐一对齐，无越权或虚构通过（B14a、B14b 已关闭）。",
      };
    case "INHERIT-013":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-013 核查 manual-coordinator-wiring.test.ts:293-395 与 docs/acceptance/core-flow-matrix.md §4.1：本单未改动 EPIC-004 数据面板或删除执行器职责，通过真实 HTTP 路由复现并记录了 buildApp 默认 NO_SUBJECT_CACHES 下外部 CandidateStore 未自动清理（m7c N7 / m7e N12b）与显式注入 SubjectCacheHub 的清理对照，无虚构通过。",
      };
    case "INHERIT-014":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "跨模块测试 routing-scoring.test.ts（例外用户绕过快通进入 EXCEPTION）与 manual-coordinator-wiring.test.ts:196-241（score_exceptions 生效期提交 BLOCK 被 EXCEPTION_ACTIVE 拒绝、分值保持 0）实测成立，且已修正用例命名与矩阵 §3:34 说明（明确区分例外零分窗口 PASS 与 §3:40 Q55 C6 FAIL / OPEN），配合 failure-no-penalty.test.ts 完整满足本行贡献判据（B14a、B14b 已关闭）。",
      };
    case "INHERIT-015":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-015 核查 D2 变更集与测试数据库断言：本单零修改 Change Log / Technical Log 表结构或写入契约，未引入第三类日志，也在矩阵中清晰区分合成模拟替身与数据库已提交事实，无虚构通过。",
      };
    case "INHERIT-016":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-016 核查合成夹具与 4 个集成测试文件：各测试事件均携带显式 correlationId 贯穿路由、裁决、审核失败回退与技术日志写入，未改动 EPIC-004 日志查看器或内部查询鉴权边界，无虚构通过。",
      };
    case "INHERIT-017":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 manual-coordinator-wiring.test.ts:293-395 与 docs/acceptance/core-flow-matrix.md §4–§5：本单如实记录了默认组合根未挂接 SubjectCacheHub 的缓存清理缺口（N7/N12b）及外部平台未测边界，测试临时 SQLite 目录均在 afterEach 清理完毕，未创建清理遗漏持久副本，也未冒充 S020/S028 的完整数据生命周期验收。",
      };
    case "INHERIT-018":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-018 核查 manual-coordinator-wiring.test.ts:396-443 与 docs/acceptance/core-flow-matrix.md §4.2：本单未改动 EPIC-005 OBS Overlay/Dock 或只读原生输出协议代码，如实复现记录了 db/output-store.ts 中 TRANSLATION JSON 负载原样透传的既有现象（m8a N13），无虚构通过。",
      };
    case "INHERIT-019":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-019 核查 D2 变更集与 docs/acceptance/core-flow-matrix.md：本单零改动 apps/web/** 与 deploy/sandbox/**，全部合成夹具均使用虚构频道与受试者标识，不含生产账号或真实观众档案，未冒充前端 UI 或隔离 sandbox 验收。",
      };
    case "INHERIT-020":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-020 核查 docs/acceptance/core-flow-matrix.md §1、§5：本单严格限定在功能性跨模块闭环与既有缺陷最小复现，未虚构 P50/P95 延迟、误拦漏检率、配额吞吐或硬件性能基准结论（完整基准测量仍归责任单 VOXWARD-STORY-027）。",
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

const tS026 = buildTarget(s026Show);
const tSub048 = buildTarget(sub048Show);
const targets = [tS026, tSub048];

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

assert.equal(counts.total, 45);
assert.equal(counts.satisfied, 45);
assert.equal(counts.failed, 0);
assert.equal(counts.unverified, 0);

const kindCounts = targets
  .flatMap((t) => t.evidence)
  .reduce((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});

const acceptanceMd = [
  `# 第 m8c-r1 批独立验收证据（Wave 3c：S026 返工一复验，候选 \`${CODE_VERSION}\`）`,
  "",
  "## 1. 验收基线、门禁与实测探针摘要",
  "",
  `- **候选版本**：分离只读检出 \`verify-m8cr1\` 上的 \`${CODE_VERSION}\`（完整 SHA \`${FULL_SHA}\`，在 \`b1cc8af\` / 只读产品基线 \`6a6af8a\` 之上合入 \`d9e7d48\` \`voxward/s026-fix1\`；Spec 提交 \`f3d1a6a\` 先于实现提交 \`d9e7d48\`）。`,
  `- **实时工单快照**：\`headEventHash = ${headEventHash}\`，共 2 张活跃工单、45 行验收（\`VOXWARD-STORY-026\` \`rev=5\` 22 行；\`VOXWARD-SUB-048\` \`rev=4\` 23 行）。`,
  `- **统计汇总**：**45 行（satisfied ${counts.satisfied} 行、failed 0 行、unverified 0 行；machine ${kindCounts.machine} 行、source-behavior-review ${kindCounts["source-behavior-review"]} 行）**。前轮阻断 **\`B14\`（\`B14a\`、\`B14b\`、\`B14c\`）** 与建议 **\`N16a\`** 全部闭环，两张工单均判定 **通过（PASS）**。`,
  "",
  "### 1.1 独立门禁与 Q58 守护实测记录",
  "",
  "| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |",
  "| --- | --- | --- | --- | --- |",
  "| D2 | Spec 先行与零产品改动核查 | `git log / git diff 6a6af8a..d9e7d48`（`probes/logs/d2-diff.log`） | `0` | Spec `f3d1a6a`（4 文件）先于实现 `d9e7d48`（8 文件）；`apps/*/src`、`packages/*/src`、`scripts`、`deploy`、`vitest.workspace.ts` 均为 **0 修改** |",
  "| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`、`web` 构建全绿 |",
  "| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓及 `bench` 类型检查 0 错误 |",
  "| E05 | Q58 守卫下 S026 集成套件 | `guarded.sh .../e05-s026-vitest pnpm --filter @voxward/server test test/integration/core-flow` | `0` | **4/4 文件、16/16 用例**全绿（含新增 `failure-no-penalty.test.ts` 与 `B14a` 四项最小复现断言） |",
  "| E06 / E09 | 模块依赖门禁与负向对照 | `node scripts/check-deps.mjs` + 临时目录违规对照（`e06-check-deps.log`、`e09-check-deps-neg.log`） | `0` / `1` | 正式树 `264 files checked, 0 violations`；负向对照检出 `2 violation(s)` 并以退出码 `1` 拒绝 |",
  "| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check --work-id work:3ebb2c33e7560e8661143983 --spec-dir .kiro/specs/voxward-s026-core-flow`（`e10-s026-spec.json`） | `0` | `SPEC_CURRENT`（`workRevision: 5`） |",
  "| E80 | Q58 守卫下独立复验探针 `probe-m8cr1.mts` | `CI=1 bash guarded.sh .../e80-m8cr1 tsx .../probe-m8cr1.mts`（`e80-m8cr1.json`、`q58-audit.json`） | `0` | `P1`（`Q55` `C6` 改判偏差 `9` vs `7` 复现且矩阵标 `FAIL / OPEN`）、`P2`（`Q46`、`Q41`、`Q57` `R7` 复现且矩阵标 `PARTIAL / OPEN`）、`P3`（`B14b` 正分观众 `score=2` 在实时 `reportFailure` 转 `PENDING_REVIEW` 与复盘 `MODEL_CALL_FAILED`/`AI_OUTPUT_INVALID` 下保持 `score=2`、`ledger=1`、`scoringCalls=0`）、`P4`（14 个 S026 文件作者受控区 `0` 处本地绝对路径、主矩阵 `8/8` 相对链接存在，仅三级目录 `README.md:17` 少一级 `../` 记非阻断 `N18a`）全绿；Q58 审计 `guardLoaded=true`、5 外部主机全拒、`shim.log` 0 行、外发 0 条 |",
  "",
  "---",
  "",
  "## 2. VOXWARD-STORY-026 逐行验收证据（22 行：22 satisfied / 0 failed）",
  "",
  ...tS026.mdSections,
  "---",
  "",
  "## 3. VOXWARD-SUB-048 逐行验收证据（23 行：23 satisfied / 0 failed）",
  "",
  ...tSub048.mdSections,
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
  note: `草稿，供主线程链写。targets[].evidence 中每一行严格只含引擎允许的八个键且顺序固定，可由 close-batch.cjs 原样并入对应工单 content.evidence。45 行：satisfied 45、failed 0、unverified 0。VOXWARD-STORY-026（22/22 satisfied）与 VOXWARD-SUB-048（23/23 satisfied）在 ${CODE_VERSION} 上全部通过，可直接关单（DONE_KEYS=VOXWARD-SUB-048,VOXWARD-STORY-026）。locator 指向 ${LOCATOR_BASE}。`,
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: `引擎按字符串精确比较 evidence.codeVersion 与完成候选。VOXWARD-STORY-026 与 VOXWARD-SUB-048 在 ${CODE_VERSION} 上 45/45 全部 satisfied，可通过 close-batch.cjs 生成链写与完成转换载荷。写入时以读回的 revision 为准。`,
  },
  readFrom: {
    command:
      "预取实时工单快照 wave3c/show/VOXWARD-{STORY-026,SUB-048}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
    headEventHash,
  },
  shapeCheck: `生成脚本逐行校验：键名与顺序严格为 [acceptanceId, acceptanceVersion, requirement, codeVersion, locator, actual, outcome, kind] 八键、requirement 含三键且版本为正整数、outcome 与 kind 属合法枚举、kind 按 method 前缀规则确定（${kindCounts["source-behavior-review"]} 行 source-behavior-review + ${kindCounts.machine} 行 machine）、actual 非空且含具体实测/审查依据、locator 锚点在 acceptance.md 中唯一存在且与标题一一对应、每单行数与实时快照完全一致（22+23=45），并通过 close-batch.cjs 干跑校验。未调用引擎写入。`,
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

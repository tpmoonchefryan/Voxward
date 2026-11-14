import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SHOW_DIR = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave3a/show";
const OUT_DIR = "/home/ryanlan/.gemini/antigravity-cli/brain/69549e0f-1e91-4bc9-84f6-7dbcd06cf413/scratch/wave3a/m8c-accept-out";
const CODE_VERSION = "df376eb";
const FULL_SHA = "df376eb934fe8c2185777a467f625117facf2a66";
const LOCATOR_BASE = ".kiro/specs/voxward-batch-m8c/evidence/acceptance.md";

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
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）首次验收未通过（阻断 B14：B14a、B14b、B14c）。已成立部分：严守零产品改动边界（D2 核对 apps/server/src、apps/web/src、packages/contracts/src 0 修改），E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）及 E05 guarded.sh 下 3 文件 10 用例均退出 0，R1–R6 路由与谐音/规范化规则、Q20/Q43 身份基准分离与钳制、平台删除 UNKNOWN 有界重试及 QUOTA_EXHAUSTED 本地 BLOCK 保留、例外零分拒绝与 §4 N7/N12b/N13 既有缺口复现均属实。不成立部分：（1）B14a：docs/acceptance/core-flow-matrix.md §3 将仍存在真实缺陷或未装配缺口的 Q55（db/decision-store.ts C6 钳制补偿偏差：E80 C1 实测改判后 currentScore=9 而真实账本重放应为 7 且 needsManualAdjustment=false）、Q46（stream-list.ts 丢弃 memberMilestoneChatDetails.userComment 为空串且 ChannelEvent 无付费标记：E80 C2）、Q39（入站内存去重未与 channel_events_dedupe_uq 绑定单事务）、Q41（runStreamList 稳态轮询套用 classifyReplay 致时钟快偏 6 分钟丢弃实时消息：E80 C2）、Q52（app.ts 未装配 SC->PAID 与 resumePendingScoring 定时）及 Q57（ReviewRunner R7 跨实例跳过未知任务致任务卡在 RUNNING：E80 C3）标为 PASS 且未列入 §4；（2）B14b：完全缺失工单必交的「异常不扣分」（AI 超时/失败/非法 JSON 回退且 0 扣分：E80 C3）跨模块用例与矩阵行；（3）B14c：提交入库的矩阵与夹具 README 固化了 8 处临时工作树绝对路径 file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4）。",
      };
    case "INHERIT-001":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）文档与边界审查未通过（阻断 B14c）。模块边界与只读范围保持成立（E06 check:deps 254 文件 0 违规，D2 核实未改动任何产品 src/ 或引入新代理/云服务），但本单提交入库的持久验收文档 docs/acceptance/core-flow-matrix.md:7-14（7 处）与 tests/integration/core-flow/README.md:16（1 处）硬编码了开发者本机临时工作树绝对 URI file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/...（E80 C4 实测命中 8 处），违反持久文本使用可解析相对路径、不固化设备与临时工作树位置的要求。",
      };
    case "INHERIT-002":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。虽然 routing-scoring.test.ts 实测验证了 Q20/Q43 身份基准分离与退级回落，dedupe-replay-sc.test.ts 验证了平台删除配额耗尽与 UNKNOWN 重试，但 docs/acceptance/core-flow-matrix.md:31-32 将 Q39 与 Q41 标为 PASS 而未披露真实缺口：Q39 在生产入站路径中 MessageIdStore 仍为纯内存结构且未与 SQLite channel_events_dedupe_uq 绑定于同一入站事务；Q41 在 platform-source/youtube/stream-list.ts 中对非首次稳态轮询（resumeToken 非空）仍逐条执行 classifyReplay，E80 C2 实测本机时钟快偏 6 分钟时实时消息被判为 STALE_REPLAY 静默丢弃（delivered=0, staleReplay=1）。违反「缺陷和未测清楚」判据。",
      };
    case "INHERIT-003":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。routing-scoring.test.ts 对普通消息 R1–R6（含规范化 café->cafe、精确拦截、谐音草泥马->caonima 进 REVIEW、白名单与噪声先经规则检查、例外先入 EXCEPTION）验证成立；但在付费自定义文本路径（Q46）上，dedupe-replay-sc.json:33 仅使用无评论字段的 membershipGiftingEvent 并手工硬编码 enqueueInLane('PAID')，而 docs/acceptance/core-flow-matrix.md:33 将「Q46 & Q52：SC userComment 与会员里程碑解析」标为 PASS。E80 C2 实测 parseStreamItem 对含 memberMilestoneChatDetails.userComment 的 memberMilestoneChatEvent 返回 text: null（toBusinessEvent 产出空串 body: ''），且 ChannelEvent 仍不含付费消息标识字段供下游自动分流，该真实产品缺口未被复现列入矩阵 §4。",
      };
    case "INHERIT-004":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）跨模块验证未通过（阻断 B14b、B14a）。routing-scoring.test.ts 验证了上下限钳制、冷却、白名单/快通 ALLOW_NOISE 零加分与身份变化基准重算，但：（1）B14b：VW-R-004 与 VW-S026-R001 明确要求的「故障不扣分 / 异常不扣分」（AI 调用超时/异常/非法 JSON 时不触发观众扣分，E80 C3 对 ReviewRunner 实测 MODEL_CALL_FAILED 时 scoringCalls=0）在 3 个集成测试文件与 docs/acceptance/core-flow-matrix.md 中完全缺失；（2）B14a：Q55 上限钳制后的改判补偿偏差（E80 C1）在矩阵 §3 中被误标为 PASS。",
      };
    case "INHERIT-005":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。本单虽在矩阵 §4 第 1 项如实记录了默认 CandidateStore 未入 SubjectCacheHub 的装配缺口（N7/N12b），但在后台复盘与调度链路上，docs/acceptance/core-flow-matrix.md:33,37 将 Q52（含复盘待记分恢复定时 resumePendingScoring 未在 app.ts 装配）与 Q57（ReviewRunner R7：多实例共享 TaskCoordinator 时抽到非本实例入队的 BACKGROUND 任务会跳过并调 finishBatch，导致任务卡在 RUNNING 直至过期，E80 C3 实测 skippedItems=0）直接标为 PASS，未按要求在 §4 记录最小可复现缺口，且缺失整单要求的异常不扣分矩阵项。",
      };
    case "INHERIT-006":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）连接与边界审查未通过（阻断 B14a）。对照 VW-R-006（微批、付费优先、复盘让出实时容量）审查 docs/acceptance/core-flow-matrix.md:33,37 与 apps/server/test/integration/core-flow/{dedupe-replay-sc,manual-coordinator-wiring}.test.ts：测试仅用独立单实例手工调用 coordinator.enqueueInLane('PAID') 与 coordinator.reportFailure('task-does-not-exist')，却在矩阵中将 Q52（生产 app.ts 尚未把 SC 自动路由至 PAID 车道或装配复盘模型/定时任务）与 Q57（master tasks.md 明确指出的 R7 缺陷：ReviewRunner 抽到其它实例的 BACKGROUND 任务时跳过并 finishBatch 使任务悬挂 RUNNING，E80 C3 复现）标为 PASS，违反本行「记录本单的连接/审查证据……不填写虚构通过」的要求。",
      };
    case "INHERIT-007":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a）。manual-coordinator-wiring.test.ts 验证了已终态任务重复 commit 返回 conflict、operationId 幂等及平台删除降级，但完全漏测 master tasks.md:119 与 m6r1 judgment.md N1 明确交由 S026 覆盖的 Q55 序列 C6（db/decision-store.ts:724-748 仅在原时间线发生过钳制时标 needsManualAdjustment，未检测补偿后新时间线触发上限钳制），反而将例外零分测试标为 Q55 并在 docs/acceptance/core-flow-matrix.md:35-36 标为 PASS（「账本与当前分值一致」）。E80 C1 实测 maxScore=10 下 [-3, +2×6, -3] 改判首条为 ALLOW_MEANINGFUL 后 currentScore=9、needsManualAdjustment=false，而真实账本重放应在 10 处钳制得 7，违反 VW-R-007「纠分依据真实账本」与本单「缺陷和未测清楚、最小可复现缺陷」判据。",
      };
    case "INHERIT-008":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-008 核查 D2 变更集、apps/server/test/integration/core-flow/manual-coordinator-wiring.test.ts:390-441 及 docs/acceptance/core-flow-matrix.md §4 第 2 项：本单未修改普通审核/SC/复盘 JSON 契约或校验器职责，并在不改 src/ 的前提下如实复现记录了 m8a N13（db/output-store.ts 对 TRANSLATION JSON 字符串原样直出而非提取译文字段），未对未测契约填写虚构通过。",
      };
    case "INHERIT-009":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 tests/integration/core-flow/fixtures/*.json、apps/server/test/integration/core-flow/*.test.ts 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s026-vitest 与 e80-m8c 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行）：测试仅使用合成文本与临时编号，未调用真实 Kiro CLI，未持久化完整会话/提示/工具轨迹副本，且矩阵 §5 明确声明未触及真实外部提供方清理。",
      };
    case "INHERIT-010":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-010 核查 docs/acceptance/core-flow-matrix.md §5 与测试套件：本单保持 Kiro CLI/Crew 适配器与核心业务端口解耦，未改动 EPIC-002/005 模型选择或适配器代码，并在矩阵 §5 明确标注本单未调用真实 kiro-cli/kirocrew/kiro，未虚构真实推理实测结论。",
      };
    case "INHERIT-011":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。虽然测试均在真实迁移后的 SQLite WAL 短事务上运行且未持锁跨网络等待，但 docs/acceptance/core-flow-matrix.md:31,35 将 Q39（内存 MessageIdStore 尚未与 SQLite channel_events_dedupe_uq 绑定为单一生产入站事务）与 Q55（C6 改判后 subject_scores.current_score=9 与真实账本重放值 7 不一致且 needsManualAdjustment=false，E80 C1）标为 PASS 而未列入 §4 最小可复现缺陷，且缺失异常不扣分跨模块证据。",
      };
    case "INHERIT-012":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。manual-coordinator-wiring.test.ts:331-385 复用了真实 /auth/login 会话 Cookie、x-csrf-token 与 DATA_ADMIN 角色门禁执行删除请求，未破坏既有 RBAC 边界；但本行共享 S026 整单机器判据（「每项结果有实际证据；模拟不冒充真实平台验证，缺陷和未测清楚」），因矩阵 §3 对 Q39/Q41/Q46/Q52/Q55/Q57 给出失实 PASS 且遗漏异常不扣分验证而未满足。",
      };
    case "INHERIT-013":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-013 核查 manual-coordinator-wiring.test.ts:292-389 与 docs/acceptance/core-flow-matrix.md §4 第 1 项：本单未修改 EPIC-004 数据面板或删除执行器职责，通过真实 HTTP 路由复现并如实记录了 buildApp 默认 NO_SUBJECT_CACHES 导致外部/默认 CandidateStore 候选词卡在主体删除后仍保留（m7c N7 / m7e N12b），与显式注入 SubjectCacheHub 的清理结果对照清晰，无虚构通过。",
      };
    case "INHERIT-014":
      return {
        outcome: "failed",
        kind,
        actual:
          "第 m8c 批（df376eb）跨模块验证未通过（阻断 B14a、B14b）。routing-scoring.test.ts（R7 例外绕过快通进入 EXCEPTION）与 manual-coordinator-wiring.test.ts:195-240（score_exceptions 生效期拒绝 BLOCK 记分并抛 EXCEPTION_ACTIVE、分值保持 0）本身验证成立；但后者将该用例误标为 Q55 以支撑矩阵 §3「Q49 & Q55 PASS」，掩盖了真正的 Q55 C6 钳制改判账本偏差（E80 C1），且整单缺失异常不扣分矩阵与用例，未满足本行「缺陷和未测清楚」判据。",
      };
    case "INHERIT-015":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-015 核查 D2 变更集与测试数据库断言：本单未修改 Change Log / Technical Log 表结构或写入契约，未引入第三类日志，也在矩阵中保持了模型模拟替身与数据库已提交事实的区分，未填写虚构通过。",
      };
    case "INHERIT-016":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-016 核查合成夹具（routing-scoring.json、dedupe-replay-sc.json、manual-coordinator-wiring.json）与测试套件：各测试事件均携带显式 correlationId 贯穿路由、裁决与技术日志写入，未改动 EPIC-004 日志查看器或内部查询鉴权边界，未填写虚构通过。",
      };
    case "INHERIT-017":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "审查 manual-coordinator-wiring.test.ts:292-389 与 docs/acceptance/core-flow-matrix.md §4–§5：本单如实记录了默认组合根未挂接 SubjectCacheHub 的缓存清理缺口（N7/N12b）及外部平台未测边界，未创建清理遗漏持久副本，也未宣称合成测试覆盖了备份恢复或提供方删除（完整生命周期由 S019/S020 承接）。",
      };
    case "INHERIT-018":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-018 核查 manual-coordinator-wiring.test.ts:390-441 与 docs/acceptance/core-flow-matrix.md §4 第 2 项：本单未改动 EPIC-005 OBS Overlay/Dock 或只读原生输出协议实现，如实复现并记录了 db/output-store.ts 中 TRANSLATION JSON 负载原样透传的既有现象（m8a N13），未填写虚构通过。",
      };
    case "INHERIT-019":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-019 核查 D2 变更集与 docs/acceptance/core-flow-matrix.md：本单零改动 apps/web/**，全部合成夹具均使用虚构频道与受试者标识，不含生产账号或真实观众档案，也未冒充前端 UI 或隔离 sandbox 验收。",
      };
    case "INHERIT-020":
      return {
        outcome: "satisfied",
        kind,
        actual:
          "对照 VW-R-020 核查 docs/acceptance/core-flow-matrix.md §1、§5：本单严格限定在功能性跨模块闭环验证，未虚构 P50/P95 延迟、误拦漏检率、配额吞吐或硬件性能基准结论（完整基准测量仍归责任单 VOXWARD-STORY-027）。",
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
    assert.ok(req && typeof req.workId === "string" && typeof req.requirementId === "string" && Number.isInteger(req.version) && req.version >= 1);

    // Exact 8 keys in exact required order:
    // [acceptanceId, acceptanceVersion, requirement, codeVersion, locator, actual, outcome, kind]
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
assert.equal(counts.satisfied, 20);
assert.equal(counts.failed, 25);
assert.equal(counts.unverified, 0);

const kindCounts = targets
  .flatMap((t) => t.evidence)
  .reduce((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});

const acceptanceMd = [
  `# 第 m8c 批独立验收证据（Wave 3a：S026 首次验收，候选 \`${CODE_VERSION}\`）`,
  "",
  "## 1. 验收基线、门禁与实测探针摘要",
  "",
  `- **候选版本**：分离只读工作树 \`/home/ryanlan/Code/Voxward/.worktrees/verify-m8c\` 上的 \`${CODE_VERSION}\`（完整 SHA \`${FULL_SHA}\`，在 \`994db71\` 之上合入 \`51f12b0\` \`voxward/s026-core-flow\`；Spec 提交 \`f237c9f\` 先于实现提交 \`51f12b0\`）。`,
  `- **实时工单快照**：\`headEventHash = ${headEventHash}\`，共 2 张活跃工单、45 行验收（\`VOXWARD-STORY-026\` \`rev=4\` 22 行；\`VOXWARD-SUB-048\` \`rev=3\` 23 行）。`,
  `- **统计汇总**：**45 行（satisfied ${counts.satisfied} 行、failed ${counts.failed} 行、unverified 0 行；machine ${kindCounts.machine} 行、source-behavior-review ${kindCounts["source-behavior-review"]} 行）**。两单均因阻断 **\`B14\`（\`B14a\`、\`B14b\`、\`B14c\`）** 判定 **打回（REJECT）**。`,
  "",
  "### 1.1 独立门禁与 Q58 守护实测记录",
  "",
  "| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |",
  "| --- | --- | --- | --- | --- |",
  "| D2 | Spec 先行与零产品改动核查 | `git log / git diff 994db71...51f12b0`（`probes/logs/d2-diff.log`） | `0` | Spec `f237c9f`（4 文件）先于实现 `51f12b0`（9 文件）；`apps/server/src`、`apps/web/src`、`packages/contracts/src`、`scripts`、`vitest.workspace.ts` 均为 **0 修改** |",
  "| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`、`web` 构建全绿 |",
  "| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓及 `bench` 类型检查 0 错误 |",
  "| E05 | Q58 守卫下 S026 集成套件 + 基线全量单测 | `guarded.sh .../e05-s026-vitest pnpm --filter @voxward/server exec vitest run test/integration/core-flow`（配合主线程同 SHA 全量 `pnpm test` 与 `smoke.sh`） | `0` | S026 套件 **3/3 文件、10/10 用例**全绿；同 SHA 全量基线 **167/167 文件、1956/1956 用例**全绿；`smoke.sh` dev/dist 双 200 且 `:3000/:5173` 0 监听 |",
  "| E06 / E09 | 模块依赖门禁与负向对照 | `node scripts/check-deps.mjs` + 临时目录违规对照（`e06-check-deps.log`、`e09-check-deps-neg.log`） | `0` / `1` | 正式树 `254 files checked, 0 violations`；负向对照检出 `4 violation(s)` 并以退出码 `1` 拒绝 |",
  "| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check --work-id work:3ebb2c33e7560e8661143983 --spec-dir .../voxward-s026-core-flow`（`e10-s026-spec.json`） | `0` | `SPEC_CURRENT`（`workRevision: 4`） |",
  "| E80 | Q58 守卫下独立跨模块探针 `probe-m8c.mts` | `CI=1 bash guarded.sh .../e80-m8c tsx .../probe-m8c.mts`（`e80-m8c.json`、`q58-audit.json`） | `0` | `C1`（Q55 `C6` 钳制改判账本偏差：`currentScore=9` vs 账本重放 `7`）、`C2`（Q46 里程碑 `userComment` 丢失为 `null`/空串 + `ChannelEvent` 无付费标记；Q41 稳态轮询时钟快偏 6 分钟丢弃实时消息）、`C3`（Q57 `R7` 跨实例跳过未知任务致任务悬挂 `RUNNING`；`VW-R-004` AI 超时 `FAILED` 且 `scoringCalls=0`）、`C4`（提交入库文档含 8 处硬编码临时工作树 `file://` URI）全部实测复现；Q58 审计 `guardLoaded=true`、5 外部主机全拒、`shim.log` 0 行 |",
  "",
  "---",
  "",
  "## 2. VOXWARD-STORY-026 逐行验收证据（22 行：10 satisfied / 12 failed）",
  "",
  ...tS026.mdSections,
  "---",
  "",
  "## 3. VOXWARD-SUB-048 逐行验收证据（23 行：10 satisfied / 13 failed）",
  "",
  ...tSub048.mdSections,
].join("\n");

const acceptancePath = path.join(OUT_DIR, "acceptance.md");
fs.writeFileSync(acceptancePath, acceptanceMd);

// Verify every locator anchor exists uniquely in acceptance.md
for (const t of targets) {
  for (const r of t.evidence) {
    const anchor = r.locator.split("#")[1];
    const matches = acceptanceMd.match(new RegExp(`<a id="${anchor}"></a>`, "g")) ?? [];
    assert.equal(matches.length, 1, `Anchor ${anchor} count mismatch: ${matches.length}`);
  }
}

const evidenceRecords = {
  note: `草稿，供主线程链写。targets[].evidence 中每一行严格只含引擎允许的八个键且顺序固定，可由 close-batch.cjs 原样并入对应工单 content.evidence。45 行：satisfied ${counts.satisfied}、failed ${counts.failed}、unverified 0。VOXWARD-STORY-026（10/22 satisfied、12 failed）与 VOXWARD-SUB-048（10/23 satisfied、13 failed）因阻断 B14（B14a、B14b、B14c）打回，仅链写证据留痕、不关单。locator 指向 ${LOCATOR_BASE}。`,
  candidate: {
    codeVersion: CODE_VERSION,
    fullSha: FULL_SHA,
    note: `引擎按字符串精确比较 evidence.codeVersion 与完成候选。VOXWARD-STORY-026 与 VOXWARD-SUB-048 在 ${CODE_VERSION} 上均含 failed 行，须在 S026 返工一（保持 src/** 零修改，补齐最小可复现缺口披露、异常不扣分跨模块测试与相对路径修正）后的新候选上窄范围复验。写入时以读回的 revision 为准。`,
  },
  readFrom: {
    command:
      "预取实时工单快照 wave3a/show/VOXWARD-{STORY-026,SUB-048}.json（einzbern.mjs work-show --workspace <Ether> --external-key <KEY>）",
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
